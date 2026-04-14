const SERVER = 'https://askmydocs-b8b7.onrender.com'
const BASE   = SERVER + '/api'

// No more localStorage tokens — cookies are set automatically by browser
async function request(path, options = {}) {
  try {
    const isFormData = options.body instanceof FormData
    const res = await fetch(BASE + path, {
      ...options,
      credentials: 'include',  // sends cookies automatically
      headers: {
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
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
      throw new Error('Cannot connect to server. Please check your connection.')
    }
    throw err
  }
}

export const api = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login:    (data) => request('/auth/login',    { method: 'POST', body: JSON.stringify(data) }),
  logout:   ()     => request('/auth/logout',   { method: 'POST' }),
  me:       ()     => request('/auth/me'),

  getDocuments:   ()   => request('/documents'),
  getDocument:    (id) => request(`/documents/${id}`),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
  uploadDocument: (fd) => request('/documents/upload', { method: 'POST', body: fd }),

  getConversations:   (documentId) => request(`/conversations?documentId=${documentId}`),
  getMessages:        (convId)     => request(`/conversations/${convId}/messages`),
  deleteConversation: (id)         => request(`/conversations/${id}`, { method: 'DELETE' }),

  chatStream: async (body) => {
    try {
      const res = await fetch(`${SERVER}/api/chat`, {
        method:      'POST',
        credentials: 'include',  // sends cookies automatically
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server error ${res.status}` }))
        throw new Error(err.error || 'Chat request failed')
      }
      return res
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Please check your connection.')
      }
      throw err
    }
  },
}
