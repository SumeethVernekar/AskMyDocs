const SERVER = 'http://localhost:5000'
const BASE   = SERVER + '/api'

function getToken() {
  return localStorage.getItem('token')
}

function authHeaders(extra = {}) {
  const token = getToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function request(path, options = {}) {
  try {
    const isFormData = options.body instanceof FormData
    const res = await fetch(BASE + path, {
      ...options,
      headers: {
        ...authHeaders(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Server error ${res.status}` }))
      throw new Error(err.error || `Request failed with status ${res.status}`)
    }
    return res.json()
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error('Cannot connect to server. Make sure the server is running on http://localhost:5000')
    }
    throw err
  }
}

export const api = {
  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login:    (data) => request('/auth/login',    { method: 'POST', body: JSON.stringify(data) }),
  me:       ()     => request('/auth/me'),

  // Documents
  getDocuments:   ()   => request('/documents'),
  getDocument:    (id) => request(`/documents/${id}`),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
  uploadDocument: (formData) => request('/documents/upload', { method: 'POST', body: formData }),

  // Conversations
  getConversations:   (documentId) => request(`/conversations?documentId=${documentId}`),
  getMessages:        (convId)     => request(`/conversations/${convId}/messages`),
  deleteConversation: (id)         => request(`/conversations/${id}`, { method: 'DELETE' }),

  // Chat — direct to server, bypasses Vite proxy
  chatStream: async (body) => {
    try {
      const res = await fetch(`${SERVER}/api/chat`, {
        method:  'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server error ${res.status}` }))
        throw new Error(err.error || 'Chat request failed')
      }
      return res
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Make sure the server is running on http://localhost:5000')
      }
      throw err
    }
  },
}