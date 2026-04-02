import express from 'express'
import { protect } from '../lib/auth.js'
import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'

const router = express.Router()

// GET /api/conversations?documentId=xxx
router.get('/', protect, async (req, res) => {
  try {
    const filter = { userId: req.user._id }
    if (req.query.documentId) filter.documentId = req.query.documentId
    const conversations = await Conversation.find(filter).sort({ createdAt: -1 })
    res.json({ conversations })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch conversations' })
  }
})

// GET /api/conversations/:id/messages
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.id, userId: req.user._id })
    if (!conv) return res.status(404).json({ error: 'Conversation not found' })
    const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 })
    res.json({ messages, conversation: conv })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// DELETE /api/conversations/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.id, userId: req.user._id })
    if (!conv) return res.status(404).json({ error: 'Conversation not found' })
    await Message.deleteMany({ conversationId: conv._id })
    await Conversation.findByIdAndDelete(conv._id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete conversation' })
  }
})

export default router
