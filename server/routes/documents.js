import express from 'express'
import multer  from 'multer'
import pdf     from 'pdf-parse/lib/pdf-parse.js'
import { protect }                from '../lib/auth.js'
import { uploadFile, deleteFile } from '../lib/storage.js'
import { buildChunks }            from '../lib/chunker.js'
import { embedBatch }             from '../lib/embeddings.js'
import Document     from '../models/Document.js'
import Chunk        from '../models/Chunk.js'
import Conversation from '../models/Conversation.js'

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files allowed'))
  },
})

async function updateProgress(docId, progress, progressMsg) {
  await Document.findByIdAndUpdate(docId, { progress, progressMsg })
  console.log(`[${docId}] ${progress}% — ${progressMsg}`)
}

async function processDocument(docId, pdfBuffer) {
  try {
    await updateProgress(docId, 5, 'Extracting text from PDF...')

    // Step 1: Extract text
    const pdfData = await pdf(pdfBuffer)

    if (!pdfData.text?.trim()) {
      throw new Error('No extractable text. PDF may be a scanned image.')
    }

    console.log(`Pages: ${pdfData.numpages} | Chars: ${pdfData.text.length}`)
    await updateProgress(docId, 20, `Extracted ${pdfData.numpages} pages`)

    // Step 2: Build chunks
    const chunks = buildChunks(pdfData)
    console.log(`Chunks: ${chunks.length}`)

    if (chunks.length === 0) throw new Error('No text chunks produced')

    await updateProgress(docId, 30, `Created ${chunks.length} chunks. Embedding...`)

    // Step 3: Delete old chunks
    await Chunk.deleteMany({ documentId: docId })

    // Step 4: Embed chunks one by one and save in batches
    const SAVE_BATCH   = 50
    const totalChunks  = chunks.length
    let   chunkBuffer  = []

    for (let i = 0; i < totalChunks; i++) {
      // Embed single chunk
      const clean  = chunks[i].content.replace(/\n/g, ' ').trim().slice(0, 512)
      const { getEmbedder } = await import('../lib/embeddings.js')
      const embed  = await getEmbedder()
      const output = await embed(clean, { pooling: 'mean', normalize: true })
      const vector = Array.from(output.data)

      chunkBuffer.push({
        documentId: docId,
        content:    chunks[i].content,
        embedding:  vector,
        pageNumber: chunks[i].pageNumber,
        chunkIndex: chunks[i].chunkIndex,
        tokenCount: chunks[i].tokenCount,
      })

      // Save batch to DB when buffer is full or last chunk
      if (chunkBuffer.length >= SAVE_BATCH || i === totalChunks - 1) {
        await Chunk.insertMany(chunkBuffer)
        chunkBuffer = []
        console.log(`Saved ${Math.min(i + 1, totalChunks)}/${totalChunks} chunks`)
      }

      // Update progress: 30% to 90% during embedding
      const pct = 30 + Math.round(((i + 1) / totalChunks) * 60)
      await updateProgress(docId, pct, `Processing chunk ${i + 1} of ${totalChunks}...`)
    }

    // Step 5: Mark ready
    await Document.findByIdAndUpdate(docId, {
      status:      'ready',
      pageCount:   pdfData.numpages,
      progress:    100,
      progressMsg: 'Ready',
    })

    console.log(`\nDocument ${docId} READY — ${totalChunks} chunks\n`)

  } catch (err) {
    console.error(`Processing FAILED [${docId}]:`, err.message)
    await Document.findByIdAndUpdate(docId, {
      status:       'error',
      errorMessage: err.message,
      progress:     0,
      progressMsg:  '',
    })
  }
}

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
      userId:      req.user._id,
      title:       req.file.originalname.replace(/\.pdf$/i, ''),
      fileUrl:     url,
      fileKey:     key,
      fileSize:    req.file.size,
      status:      'processing',
      progress:    0,
      progressMsg: 'Starting...',
    })

    // Respond immediately, process in background
    res.status(201).json({ document: doc })

    // Start processing after response is sent
    const bufferCopy = Buffer.from(req.file.buffer)
    setImmediate(() => processDocument(doc._id, bufferCopy))

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
    res.status(500).json({ error: 'Failed to delete' })
  }
})

export default router