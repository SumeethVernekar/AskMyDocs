import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const COOKIE_NAME = 'askmydocs_token'
const IS_PROD     = process.env.NODE_ENV === 'production'

export function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

export function setTokenCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,                // JS cannot access — prevents XSS
    secure:   IS_PROD,            // HTTPS only in production
    sameSite: IS_PROD ? 'none' : 'lax', // 'none' needed for cross-origin in prod
    maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days in ms
    path:     '/',
  })
}

export function clearTokenCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax',
    path:     '/',
  })
}

export async function protect(req, res, next) {
  try {
    let token = null

    // 1. Check HTTP-only cookie first
    if (req.cookies?.[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME]
    }

    // 2. Fallback to Authorization header (for backward compatibility)
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user    = await User.findById(decoded.id)
    if (!user) return res.status(401).json({ error: 'User not found' })

    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}
