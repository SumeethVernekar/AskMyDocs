import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api.js'

function Spinner() {
  return <div className="w-5 h-5 border-2 border-slate-200 border-t-blue-600 rounded-full spin flex-shrink-0"/>
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center px-4 py-3">
      <span className="w-2 h-2 bg-slate-400 rounded-full dot-1"/>
      <span className="w-2 h-2 bg-slate-400 rounded-full dot-2"/>
      <span className="w-2 h-2 bg-slate-400 rounded-full dot-3"/>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5
        ${isUser ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
        {isUser ? 'U' : 'AI'}
      </div>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
        ${isUser
          ? 'bg-blue-600 text-white rounded-tr-sm'
          : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm'}`}>
        {msg.content}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { docId }     = useParams()
  const { user }      = useAuth()
  const navigate      = useNavigate()
  const [doc,          setDoc]          = useState(null)
  const [conversations, setConvs]      = useState([])
  const [activeConvId,  setActiveConvId] = useState(null)
  const [messages,      setMessages]   = useState([])
  const [input,         setInput]       = useState('')
  const [streaming,     setStreaming]   = useState(false)
  const [streamText,    setStreamText]  = useState('')
  const [loadingMsgs,   setLoadingMsgs] = useState(false)
  const [error,         setError]       = useState('')
  const bottomRef = useRef()
  const inputRef  = useRef()

  // Load document info
  useEffect(() => {
    api.getDocument(docId)
      .then(d => setDoc(d.document))
      .catch(() => navigate('/dashboard'))
  }, [docId])

  // Load conversations sidebar
  useEffect(() => {
    api.getConversations(docId)
      .then(d => setConvs(d.conversations || []))
      .catch(() => {})
  }, [docId])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamText])

  const loadConversation = async (convId) => {
    setActiveConvId(convId)
    setLoadingMsgs(true)
    setMessages([])
    try {
      const data = await api.getMessages(convId)
      setMessages(data.messages || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingMsgs(false)
    }
  }

  const newChat = () => {
    setActiveConvId(null)
    setMessages([])
    setError('')
    inputRef.current?.focus()
  }

  const sendMessage = async () => {
    const q = input.trim()
    if (!q || streaming) return

    setInput('')
    setError('')
    setStreaming(true)
    setStreamText('')

    // Optimistically add user message
    setMessages(prev => [...prev, { _id: Date.now() + '', role: 'user', content: q }])

    try {
      const res = await api.chatStream({
        question:       q,
        documentId:     docId,
        conversationId: activeConvId,
      })

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   full    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'meta' && !activeConvId) {
              setActiveConvId(event.conversationId)
              // Add new conversation to sidebar
              setConvs(prev => [{
                _id:       event.conversationId,
                title:     q.slice(0, 60),
                createdAt: new Date().toISOString(),
              }, ...prev])
            } else if (event.type === 'text') {
              full += event.text
              setStreamText(full)
            } else if (event.type === 'done') {
              setMessages(prev => [...prev, {
                _id:     Date.now() + 'ai',
                role:    'assistant',
                content: full,
              }])
              setStreamText('')
            } else if (event.type === 'error') {
              throw new Error(event.error)
            }
          } catch (e) { /* skip malformed */ }
        }
      }
    } catch (e) {
      setError(e.message)
      setMessages(prev => [...prev, { _id: Date.now() + 'err', role: 'assistant', content: '⚠ ' + e.message }])
      setStreamText('')
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const deleteConv = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    await api.deleteConversation(id)
    setConvs(prev => prev.filter(c => c._id !== id))
    if (activeConvId === id) newChat()
  }

  if (!doc) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner />
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Top bar */}
      <header className="bg-slate-900 border-slate-100 px-5 py-3 flex items-center gap-3 flex-shrink-0">
        <Link to="/dashboard" className="text-slate-100 hover:text-slate-300 transition-colors p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </Link>
        <span className="text-xl">📄</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-300 truncate text-sm">{doc.title}</div>
          {doc.pageCount && <div className="text-xs text-slate-400">{doc.pageCount} pages</div>}
        </div>
        <span className="text-xs text-slate-200 hidden sm:block">{user?.name}</span>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-50 bg-slate-950 border-r border-slate-100 flex-col hidden md:flex flex-shrink-0">
          <div className="p-3 border-b border-slate-100">
            <button onClick={newChat}
              className="w-full bg-blue-600 text-white text-sm py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors">
              + New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {conversations.length === 0 && (
              <p className="text-slate-200 text-xs text-center py-8 px-3">No conversations yet</p>
            )}
            {conversations.map(conv => (
              <div key={conv._id}
                onClick={() => loadConversation(conv._id)}
                className={`group flex items-start gap-1 px-3 py-2.5 rounded-xl cursor-pointer transition-colors
                  ${activeConvId === conv._id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-800 text-slate-200'}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{conv.title || 'Untitled'}</div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button onClick={e => deleteConv(conv._id, e)}
                  className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all text-xs p-0.5 flex-shrink-0">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* Empty state */}
            {!activeConvId && messages.length === 0 && !streaming && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="text-5xl mb-4">💬</div>
                <h2 className="text-xl font-semibold text-slate-200 mb-2">Ask anything about this document</h2>
                <p className="text-slate-300 text-sm max-w-sm">
                  I'll find the most relevant sections and give you a cited answer with exact page numbers.
                </p>
                <div className="mt-6 grid gap-2 w-full max-w-sm">
                  {['What is this document about?', 'Summarize the key points', 'What are the main conclusions?'].map(q => (
                    <button key={q} onClick={() => { setInput(q); inputRef.current?.focus() }}
                      className="text-sm bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-600 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading messages */}
            {loadingMsgs && (
              <div className="flex justify-center py-10"><Spinner /></div>
            )}

            {/* Message list */}
            {messages.map(msg => <Message key={msg._id} msg={msg} />)}

            {/* Streaming text */}
            {streaming && streamText && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 flex-shrink-0">AI</div>
                <div className="max-w-[78%] bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm whitespace-pre-wrap">
                  {streamText}
                  <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 cursor-blink align-middle"/>
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {streaming && !streamText && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 flex-shrink-0">AI</div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mb-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2 flex items-center gap-2">
              ⚠ {error}
              <button onClick={() => setError('')} className="ml-auto">✕</button>
            </div>
          )}

          {/* Input box */}
          <div className="p-4 bg-slate-950 border-t border-slate-100 flex-shrink-0">
            {doc.status !== 'ready' && (
              <div className="text-center text-sm text-amber-600 bg-amber-50 rounded-xl py-2 mb-3">
                Document is still processing — please wait before asking questions.
              </div>
            )}
            <div className="flex items-end gap-2 bg-slate-900 border border-slate-200 rounded-2xl px-4 py-3
              focus-within:border-blue-400 focus-within:bg-slate-900 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about this document…"
                rows={1}
                disabled={streaming || doc.status !== 'ready'}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-100 placeholder-slate-400 max-h-32 disabled:opacity-50"
                style={{ minHeight: '20px' }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming || doc.status !== 'ready'}
                className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white
                  hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
                {streaming
                  ? <div className="w-3 h-3 border-2 border-blue-300 border-t-white rounded-full spin"/>
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                }
              </button>
            </div>
            <p className="text-center text-slate-400 text-xs mt-2">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  )
}
