import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/jwt.js'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyAccessToken(token)
    res.locals.userId = payload.userId
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}