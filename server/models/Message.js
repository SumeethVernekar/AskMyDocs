import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  role:           { type: String, enum: ['user', 'assistant'], required: true },
  content:        { type: String, required: true },
  citedChunkIds:  [{ type: mongoose.Schema.Types.ObjectId }],
  tokensUsed:     { type: Number },
}, { timestamps: { createdAt: true, updatedAt: false } })

export default mongoose.model('Message', messageSchema)
