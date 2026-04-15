import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../utils/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  // On every page load/refresh — check if cookie session exists
  useEffect(() => {
    api.me()
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const data = await api.login({ email, password })
    setUser(data.user)
  }

  const register = async (name, email, password) => {
    const data = await api.register({ name, email, password })
    setUser(data.user)
  }

  const logout = async () => {
    await api.logout().catch(() => {})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
