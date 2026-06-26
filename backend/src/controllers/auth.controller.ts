import { Request, Response } from 'express'
import * as authService from '../services/auth.service'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body
    const result = await authService.register(email, password, name)
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)
    res.status(201).json({ accessToken: result.accessToken, user: result.user })
  } catch (err: any) {
    if (err.message === 'EMAIL_TAKEN') {
      return res.status(409).json({ error: 'Email already in use' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body
    const result = await authService.login(email, password)
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)
    res.status(200).json({ accessToken: result.accessToken, user: result.user })
  } catch (err: any) {
    if (err.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const rawRefreshToken = req.cookies.refreshToken
    if (!rawRefreshToken) {
      return res.status(401).json({ error: 'No refresh token' })
    }
    const result = await authService.refresh(rawRefreshToken)
    res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS)
    res.status(200).json({ accessToken: result.accessToken })
  } catch (err: any) {
    res.status(401).json({ error: 'Invalid or expired refresh token' })
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const rawRefreshToken = req.cookies.refreshToken
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken)
    }
    res.clearCookie('refreshToken')
    res.status(200).json({ message: 'Logged out' })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}
