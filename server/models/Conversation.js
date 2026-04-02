import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  title:      { type: String, default: 'New conversation' },
}, { timestamps: true })

conversationSchema.index({ userId: 1 })
conversationSchema.index({ documentId: 1 })

export default mongoose.model('Conversation', conversationSchema)
