process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from './lib/db.js'
import authRoutes         from './routes/auth.js'
import documentRoutes     from './routes/documents.js'
import chatRoutes         from './routes/chat.js'
import conversationRoutes from './routes/conversations.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app  = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve uploaded PDFs from local disk (no S3/R2 needed)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Routes
app.use('/api/auth',          authRoutes)
app.use('/api/documents',     documentRoutes)
app.use('/api/chat',          chatRoutes)
app.use('/api/conversations', conversationRoutes)

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// Start
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
})