import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { api } from '../utils/api.js'

function fmt(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ProgressBar({ progress, message }) {
  return (
    <div className="mt-2 w-full">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{message || 'Processing...'}</span>
        <span>{progress || 0}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div
          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${progress || 0}%` }}
        />
      </div>
    </div>
  )
}

function DocCard({ doc, onDelete }) {
  const isProcessing = doc.status === 'pending' || doc.status === 'processing'
  const isReady      = doc.status === 'ready'
  const isError      = doc.status === 'error'

  return (
    <div className="bg-white border border-slate-100 rounded-2xl px-5 py-4 hover:border-blue-200 hover:shadow-sm transition-all group">
      <div className="flex items-center gap-4">
        <div className="text-2xl flex-shrink-0">📄</div>

        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800 truncate">{doc.title}</div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
            <span>{fmt(doc.fileSize)}</span>
            {doc.pageCount && <span>{doc.pageCount} pages</span>}
            <span>{fmtDate(doc.createdAt)}</span>
          </div>
          {isError && (
            <div className="text-xs text-red-500 mt-1">{doc.errorMessage}</div>
          )}
          {isProcessing && (
            <ProgressBar progress={doc.progress} message={doc.progressMsg} />
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isProcessing && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse inline-block"/>
              Processing
            </span>
          )}
          {isReady && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
              Ready
            </span>
          )}
          {isError && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
              Error
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isReady && (
            <Link to={`/chat/${doc._id}`}
              className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap">
              Ask questions →
            </Link>
          )}
          <button onClick={() => onDelete(doc._id)}
            className="text-slate-400 hover:text-red-500 text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user, logout }          = useAuth()
  const navigate                   = useNavigate()
  const [docs,      setDocs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver,  setDragOver]  = useState(false)
  const [error,     setError]     = useState('')
  const fileRef  = useRef()
  const pollsRef = useRef({})

  const fetchDocs = async () => {
    try {
      const data = await api.getDocuments()
      setDocs(data.documents || [])
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    fetchDocs().finally(() => setLoading(false))
    return () => Object.values(pollsRef.current).forEach(clearInterval)
  }, [])

  // Poll processing documents every 2 seconds
  useEffect(() => {
    docs.forEach(doc => {
      const isProcessing = doc.status === 'pending' || doc.status === 'processing'
      if (isProcessing && !pollsRef.current[doc._id]) {
        pollsRef.current[doc._id] = setInterval(async () => {
          try {
            const data    = await api.getDocument(doc._id)
            const updated = data.document
            setDocs(prev => prev.map(d => d._id === updated._id ? updated : d))
            if (updated.status === 'ready' || updated.status === 'error') {
              clearInterval(pollsRef.current[updated._id])
              delete pollsRef.current[updated._id]
            }
          } catch (e) { /* ignore poll errors */ }
        }, 2000)
      }

      // Stop polling completed docs
      if (!['pending', 'processing'].includes(doc.status) && pollsRef.current[doc._id]) {
        clearInterval(pollsRef.current[doc._id])
        delete pollsRef.current[doc._id]
      }
    })
  }, [docs])

  const handleUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a PDF file.')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File too large. Max 20MB.')
      return
    }
    setError('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const data = await api.uploadDocument(form)
      setDocs(prev => [data.document, ...prev])
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this document and all its conversations?')) return
    if (pollsRef.current[id]) {
      clearInterval(pollsRef.current[id])
      delete pollsRef.current[id]
    }
    try {
      await api.deleteDocument(id)
      setDocs(prev => prev.filter(d => d._id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">A</div>
          <span className="font-bold text-xl text-blue-900">AskMyDocs</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 hidden sm:block">{user?.name}</span>
          <button onClick={() => { logout(); navigate('/') }}
            className="text-sm text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Documents</h1>
            <p className="text-slate-500 text-sm mt-0.5">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <span className="text-lg leading-none">+</span> Upload PDF
          </button>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden"
            onChange={e => handleUpload(e.target.files[0])} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-6 flex items-center gap-2">
            ⚠ {error}
            <button onClick={() => setError('')} className="ml-auto">✕</button>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]) }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-8
            ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'}`}>
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-[3px] border-slate-200 border-t-blue-600 rounded-full spin"/>
              <p className="text-slate-500 text-sm font-medium">Uploading PDF...</p>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-3">📄</div>
              <p className="text-slate-600 font-medium">Drop a PDF here, or click to browse</p>
              <p className="text-slate-400 text-sm mt-1">Maximum 20 MB · Text-based PDFs only</p>
            </>
          )}
        </div>

        {/* Document list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-[3px] border-slate-200 border-t-blue-600 rounded-full spin"/>
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-4">📭</div>
            <p className="font-medium text-slate-500">No documents yet</p>
            <p className="text-sm mt-1">Upload your first PDF to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map(doc => (
              <DocCard key={doc._id} doc={doc} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}