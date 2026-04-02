import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

function AuthCard({ title, subtitle, onSubmit, loading, error, children, footer }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      
      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-100 p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">A</div>
          <h1 className="text-2xl font-bold text-slate-200">{title}</h1>
          <p className="text-slate-300 text-sm mt-1">{subtitle}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <div className="w-4 h-4 border-2 border-blue-300 border-t-white rounded-full spin"/>}
            {loading ? 'Please wait…' : title}
          </button>
        </form>

        <div className="text-center mt-6 text-sm text-slate-500">{footer}</div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-200 mb-1">{label}</label>
      <input
        type={type || 'text'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
      />
    </div>
  )
}

export function LoginPage() {
  const { login }     = useAuth()
  const navigate      = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Sign in" subtitle="Welcome back to AskMyDocs"
      onSubmit={handleSubmit} loading={loading} error={error}
      footer={<>Don't have an account? <Link to="/register" className="text-blue-600 font-medium hover:underline">Sign up</Link></>}>
      <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="User@gmail.com" required />
      <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
    </AuthCard>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Create account" subtitle="Start chatting with your documents"
      onSubmit={handleSubmit} loading={loading} error={error}
      footer={<>Already have an account? <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link></>}>
      <Field label="Full name" value={name} onChange={e => setName(e.target.value)} placeholder="User Name" required />
      <Field label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@gmail.com" required />
      <Field label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required />
    </AuthCard>
  )
}

export default LoginPage
