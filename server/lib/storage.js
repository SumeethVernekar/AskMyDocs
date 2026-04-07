import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// Create uploads folder if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

export async function uploadFile(buffer, originalName, mimeType) {
  const ext = originalName.split('.').pop()
  const key = `${uuidv4()}.${ext}`
  const filePath = path.join(UPLOAD_DIR, key)
  fs.writeFileSync(filePath, buffer)
  // URL served by Express static middleware
  const url = `https://localhost:${process.env.PORT || 5000}/uploads/${key}`
  return { key, url }
}

export async function deleteFile(key) {
  try {
    const filePath = path.join(process.cwd(), 'uploads', key)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  } catch (e) {
    console.warn('Delete file warning:', e.message)
  }
}