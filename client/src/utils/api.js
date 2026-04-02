// Direct server URL — bypasses Vite proxy for streaming
const BASE = 'http://localhost:5000/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login:    (data) => request('/auth/login',    { method: 'POST', body: JSON.stringify(data) }),
  me:       ()     => request('/auth/me'),

  getDocuments:   ()   => request('/documents'),
  getDocument:    (id) => request(`/documents/${id}`),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
  uploadDocument: (formData) => request('/documents/upload', { method: 'POST', body: formData }),

  getConversations:   (documentId) => request(`/conversations?documentId=${documentId}`),
  getMessages:        (convId)     => request(`/conversations/${convId}/messages`),
  deleteConversation: (id)         => request(`/conversations/${id}`, { method: 'DELETE' }),

  // Chat — direct to server, no Vite proxy
  chatStream: async (body) => {
    const token = getToken()
    const res = await fetch(`http://localhost:5000/api/chat`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Chat failed' }))
      throw new Error(err.error || 'Chat failed')
    }
    return res
  },
}