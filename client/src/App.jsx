import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import LandingPage   from './pages/LandingPage.jsx'
import LoginPage     from './pages/LoginPage.jsx'
import RegisterPage  from './pages/RegisterPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ChatPage      from './pages/ChatPage.jsx'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full spin"/>
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"          element={<LandingPage />} />
          <Route path="/login"     element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register"  element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/chat/:docId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
