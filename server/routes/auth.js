import express from 'express'
import User from '../models/User.js'
import { signToken, protect } from '../lib/auth.js'

const router = express.Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' })
    }
    const user  = await User.create({ name, email, password })
    const token = signToken(user._id)
    res.status(201).json({ token, user })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    const user = await User.findOne({ email })
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const token = signToken(user._id)
    res.json({ token, user })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ user: req.user })
})

export default router
