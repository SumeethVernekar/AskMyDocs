process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import 'dotenv/config'
import express    from 'express'
import cors       from 'cors'
import path       from 'path'
import { fileURLToPath } from 'url'
import { connectDB }     from './lib/db.js'
import { embedText }     from './lib/embeddings.js'
import authRoutes         from './routes/auth.js'
import documentRoutes     from './routes/documents.js'
import chatRoutes         from './routes/chat.js'
import conversationRoutes from './routes/conversations.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app        = express()
const PORT       = process.env.PORT || 5000

// CORS — allow all localhost origins
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('https://ask-my-docs-nine.vercel.app/')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Routes
app.use('/api/auth',          authRoutes)
app.use('/api/documents',     documentRoutes)
app.use('/api/chat',          chatRoutes)
app.use('/api/conversations', conversationRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    port:   PORT,
    mongo:  'connected',
    time:   new Date().toISOString(),
  })
})
app.get('/', (req, res) => {
  res.send(
    "Backend it running"
  )
})


// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.message)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\nServer running on https://localhost:${PORT}`)
    console.log(`Health check: https://localhost:${PORT}/api/health\n`)
    // Pre-load embedding model
    embedText('warmup').catch(() => {})
  })
})