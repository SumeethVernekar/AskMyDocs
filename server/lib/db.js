import mongoose from 'mongoose'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

let connected = false
import dns from 'dns'

dns.setServers([
  '1.1.1.1',
  '8.8.8.8'
])

export async function connectDB() {
  if (connected) return

  // Fix for Node v22+ OpenSSL 3 strict TLS
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4,
    })
    connected = true
    console.log('MongoDB connected')
  } catch (err) {
    console.error('MongoDB connection error:', err.message)
    process.exit(1)
  }
}
