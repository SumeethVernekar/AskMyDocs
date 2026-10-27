import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../utils/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Add timeout — if server takes more than 5 seconds assume not logged in
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)

    api.me()
      .then(data => {
        if (data?.user) setUser(data.user)
        else setUser(null)
      })
      .catch(() => setUser(null))
      .finally(() => {
        clearTimeout(timeout)
        setLoading(false)
      })

    return () => clearTimeout(timeout)
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
