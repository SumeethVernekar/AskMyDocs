import express from 'express'
import multer  from 'multer'
import pdf     from 'pdf-parse/lib/pdf-parse.js'
import { protect }           from '../lib/auth.js'
import { uploadFile, deleteFile } from '../lib/storage.js'
import { buildChunks }       from '../lib/chunker.js'
import { embedBatch, embedText } from '../lib/embeddings.js'
import Document      from '../models/Document.js'
import Chunk         from '../models/Chunk.js'
import Conversation  from '../models/Conversation.js'

const router  = express.Router()
const upload  = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files allowed'))
  },
})

// GET /api/documents
router.get('/', protect, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id }).sort({ createdAt: -1 })
    res.json({ documents })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' })
  }
})

// GET /api/documents/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id })
    if (!doc) return res.status(404).json({ error: 'Document not found' })
    res.json({ document: doc })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' })
  }
})

// POST /api/documents/upload
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const { key, url } = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    )

    const doc = await Document.create({
      userId:   req.user._id,
      title:    req.file.originalname.replace(/\.pdf$/i, ''),
      fileUrl:  url,
      fileKey:  key,
      fileSize: req.file.size,
      status:   'pending',
    })

    // Process immediately in background
    const bufferCopy = Buffer.from(req.file.buffer)
    setImmediate(() => processDocument(doc._id, bufferCopy))

    res.status(201).json({ document: doc })
  } catch (err) {
    console.error('Upload error:', err)
    res.status(500).json({ error: err.message || 'Upload failed' })
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

// Background processing — no HTTP calls, runs directly in process
async function processDocument(docId, pdfBuffer) {
  try {
    console.log('\n--- Processing started:', docId)
    await Document.findByIdAndUpdate(docId, { status: 'processing' })

    // Extract text
    const pdfData = await pdf(pdfBuffer)
    console.log('Pages:', pdfData.numpages, '| Text length:', pdfData.text?.length)

    if (!pdfData.text?.trim()) {
      throw new Error('No extractable text found. PDF may be a scanned image.')
    }

    // Build chunks
    const chunks = buildChunks(pdfData)
    console.log('Chunks created:', chunks.length)
    if (chunks.length === 0) throw new Error('No text chunks produced')

    // Delete old chunks
    await Chunk.deleteMany({ documentId: docId })

    // Embed all chunks locally
    const texts      = chunks.map(c => c.content)
    const embeddings = await embedBatch(texts)

    // Save to MongoDB
    const chunkDocs = chunks.map((chunk, i) => ({
      documentId: docId,
      content:    chunk.content,
      embedding:  embeddings[i],
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      tokenCount: chunk.tokenCount,
    }))

    await Chunk.insertMany(chunkDocs)
    console.log('Chunks saved:', chunkDocs.length)

    await Document.findByIdAndUpdate(docId, {
      status:    'ready',
      pageCount: pdfData.numpages,
    })

    console.log('Document READY:', docId, '\n')
  } catch (err) {
    console.error('Processing FAILED:', err.message)
    await Document.findByIdAndUpdate(docId, {
      status:       'error',
      errorMessage: err.message,
    })
  }
}

export default router