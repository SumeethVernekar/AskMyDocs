import express from 'express'
import OpenAI  from 'openai'
import { protect }      from '../lib/auth.js'
import { embedText }    from '../lib/embeddings.js'
import { searchChunks } from '../lib/vectorSearch.js'
import Document     from '../models/Document.js'
import Conversation from '../models/Conversation.js'
import Message      from '../models/Message.js'

const router = express.Router()

function getOpenAIClient() {
  const key = process.env.OPENROUTER_API_KEY
  console.log('Using key:', key?.slice(0, 25) + '...')
  console.log('Key length:', key?.length)

  if (!key || key.includes('your-key') || key.length < 20) {
    throw new Error('OPENROUTER_API_KEY missing or invalid in .env')
  }

  return new OpenAI({
    apiKey:  key,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer':    'http://localhost:5173',
      'X-Title':         'AskMyDocs',
      'Authorization':   `Bearer ${key}`,
    },
  })
}

router.post('/', protect, async (req, res) => {
  try {
    const { question, documentId, conversationId } = req.body

    if (!question?.trim()) return res.status(400).json({ error: 'Question is required' })
    if (!documentId)       return res.status(400).json({ error: 'documentId is required' })

    const doc = await Document.findOne({ _id: documentId, userId: req.user._id })
    if (!doc)                   return res.status(404).json({ error: 'Document not found' })
    if (doc.status !== 'ready') return res.status(400).json({ error: 'Document is still processing' })

    let conv
    if (conversationId) {
      conv = await Conversation.findOne({ _id: conversationId, userId: req.user._id })
      if (!conv) return res.status(404).json({ error: 'Conversation not found' })
    } else {
      conv = await Conversation.create({
        userId:     req.user._id,
        documentId: doc._id,
        title:      question.slice(0, 60),
      })
    }

    await Message.create({ conversationId: conv._id, role: 'user', content: question })

    const queryVec       = await embedText(question)
    const relevantChunks = await searchChunks(documentId, queryVec, 5)

    if (relevantChunks.length === 0) {
      return res.status(400).json({ error: 'No relevant content found in this document' })
    }

    const context = relevantChunks
      .map(c => `[Page ${c.pageNumber}]: ${c.content}`)
      .join('\n\n---\n\n')

    const history = await Message.find({ conversationId: conv._id })
      .sort({ createdAt: 1 }).limit(10).lean()

    const messages = history
      .slice(0, -1)
      .map(m => ({ role: m.role, content: m.content }))
    messages.push({ role: 'user', content: question })

    const systemPrompt = `You are a helpful assistant that answers questions about documents.

CONTEXT FROM DOCUMENT "${doc.title}":
${context}

RULES:
- Answer ONLY using the context above.
- Always cite the page number for every fact, e.g. "(Page 3)".
- If the answer is not in the context, say "I couldn't find that information in this document."
- Be concise and accurate.`

    // SSE headers
    res.setHeader('Content-Type',      'text/event-stream')
    res.setHeader('Cache-Control',     'no-cache')
    res.setHeader('Connection',        'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    const heartbeat = setInterval(() => {
      if (!res.writableEnded) res.write(': ping\n\n')
    }, 10000)

    req.on('close', () => clearInterval(heartbeat))

    res.write(`data: ${JSON.stringify({ type: 'meta', conversationId: conv._id })}\n\n`)

    let fullText = ''

    try {
      const openai = getOpenAIClient()
      const model  = process.env.OPENROUTER_MODEL 

      console.log('Using model:', model)

      const stream = await openai.chat.completions.create({
        model,
        stream:     true,
        max_tokens: 1024,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
      })

      for await (const chunk of stream) {
        if (res.writableEnded) break
        const text = chunk.choices[0]?.delta?.content || ''
        if (text) {
          fullText += text
          res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`)
        }
      }

    } catch (streamErr) {
      console.error('Stream error:', streamErr.message)

      // Give a clear error message to the client
      let errMsg = streamErr.message
      if (streamErr.status === 401) {
        errMsg = 'OpenRouter API key is invalid or expired. Please check OPENROUTER_API_KEY in server/.env'
      } else if (streamErr.status === 402) {
        errMsg = 'OpenRouter account has no credits. Add credits at openrouter.ai or use a free model.'
      } else if (streamErr.status === 404) {
        errMsg = `Model not found: ${process.env.OPENROUTER_MODEL}. Change OPENROUTER_MODEL in .env`
      } else if (streamErr.status === 429) {
        errMsg = 'Rate limit hit. Wait 1 minute and try again.'
      }

      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: errMsg })}\n\n`)
      }
    }

    clearInterval(heartbeat)

    if (fullText) {
      const citedChunkIds = relevantChunks.map(c => c._id)
      await Message.create({
        conversationId: conv._id,
        role:           'assistant',
        content:        fullText,
        citedChunkIds,
      })
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'done', conversationId: conv._id, citedChunkIds })}\n\n`)
      }
    }

    if (!res.writableEnded) res.end()

  } catch (err) {
    console.error('Chat error:', err.message)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message })
    } else if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`)
      res.end()
    }
  }
})

export default router
