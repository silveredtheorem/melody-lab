import { Request, Response } from 'express'
import * as authService from '../services/auth.service'
import { prisma } from '../lib/prisma'

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

export async function updateProfile(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string
    const { name } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }
    const user = await authService.updateProfile(userId, name.trim())
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both passwords are required' })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' })
    }
    await authService.changePassword(userId, currentPassword, newPassword)
    res.json({ message: 'Password updated' })
  } catch (err: any) {
    if (err.message === 'WRONG_PASSWORD') {
      return res.status(401).json({ error: 'WRONG_PASSWORD' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function me(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
}
