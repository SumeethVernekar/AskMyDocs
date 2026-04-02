import mongoose from 'mongoose'

const chunkSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
  content:    { type: String, required: true },
  embedding:  { type: [Number], required: true },  // works for any dimension
  pageNumber: { type: Number, default: 1 },
  chunkIndex: { type: Number, required: true },
  tokenCount: { type: Number },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.model('Chunk', chunkSchema)