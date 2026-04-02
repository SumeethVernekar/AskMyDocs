import express from 'express'
import multer from 'multer'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { protect } from '../lib/auth.js'
import { uploadFile, deleteFile } from '../lib/storage.js'
import { buildChunks } from '../lib/chunker.js'
import { embedBatch } from '../lib/embeddings.js'
import Document from '../models/Document.js'
import Chunk from '../models/Chunk.js'
import Conversation from '../models/Conversation.js'

const router  = express.Router()
const storage = multer.memoryStorage()
const upload  = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files are allowed'))
  },
})

// GET /api/documents - list user's documents
router.get('/', protect, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id }).sort({ createdAt: -1 })
    res.json({ documents })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' })
  }
})

// POST /api/documents/upload - upload PDF
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const { key, url } = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype)

    const doc = await Document.create({
      userId:   req.user._id,
      title:    req.file.originalname.replace(/\.pdf$/i, ''),
      fileUrl:  url,
      fileKey:  key,
      fileSize: req.file.size,
      status:   'pending',
    })

    // Store buffer reference and call directly — no HTTP fetch
    const bufferCopy = Buffer.from(req.file.buffer)
    setImmediate(() => processDocument(doc._id, bufferCopy))

    res.status(201).json({ document: doc })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: err.message || 'Upload failed' })
  }
})

// Background processing function
async function processDocument(docId, pdfBuffer) {
  try {
    console.log('Processing started for:', docId)
    await Document.findByIdAndUpdate(docId, { status: 'processing' })

    // Convert buffer
    const dataBuffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer)
    console.log('Buffer size:', dataBuffer.length)

    const pdfData = await pdf(dataBuffer)
    console.log('PDF pages:', pdfData.numpages)
    console.log('Text length:', pdfData.text?.length)
    console.log('Text sample:', pdfData.text?.slice(0, 200))

    if (!pdfData.text?.trim()) {
      throw new Error('PDF has no extractable text')
    }

    // Clean text
    const cleanText = pdfData.text
      .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    console.log('Clean text length:', cleanText.length)

    const chunks = buildChunks({ ...pdfData, text: cleanText })
    console.log('Chunks created:', chunks.length)

    if (chunks.length === 0) throw new Error('No chunks produced')

    await Chunk.deleteMany({ documentId: docId })

    // Embed chunks
    console.log('Embedding', chunks.length, 'chunks...')
    const texts      = chunks.map(c => c.content)
    const embeddings = await embedBatch(texts)
    console.log('Embeddings done:', embeddings.length)

    const chunkDocs = chunks.map((chunk, i) => ({
      documentId: docId,
      content:    chunk.content,
      embedding:  embeddings[i],
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      tokenCount: chunk.tokenCount,
    }))

    await Chunk.insertMany(chunkDocs)
    console.log('Chunks saved to DB:', chunkDocs.length)

    await Document.findByIdAndUpdate(docId, {
      status:    'ready',
      pageCount: pdfData.numpages,
    })

    console.log('Document ready:', docId)

  } catch (err) {
    console.error('Processing FAILED:', err.message)
    console.error(err.stack)
    await Document.findByIdAndUpdate(docId, {
      status:       'error',
      errorMessage: err.message,
    })
  }
}

// GET /api/documents/:id - get single document
router.get('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id })
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    res.json({ document: doc })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' })
  }
})

// DELETE /api/documents/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id })
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    await deleteFile(doc.fileKey)
    await Chunk.deleteMany({ documentId: doc._id })
    await Conversation.deleteMany({ documentId: doc._id })
    await Document.findByIdAndDelete(doc._id)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' })
  }
})

export default router
