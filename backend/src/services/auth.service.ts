import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt'

const SALT_ROUNDS = 12

export async function register(email: string, password: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error('EMAIL_TAKEN')

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  const user = await prisma.user.create({
    data: { email, passwordHash, name }
  })

  const accessToken = signAccessToken(user.id)
  const refreshToken = signRefreshToken(user.id)
  await storeRefreshToken(user.id, refreshToken)

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error('INVALID_CREDENTIALS')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new Error('INVALID_CREDENTIALS')

  const accessToken = signAccessToken(user.id)
  const refreshToken = signRefreshToken(user.id)
  await storeRefreshToken(user.id, refreshToken)

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } }
}

export async function refresh(rawRefreshToken: string) {
  // verify JWT signature first
  const payload = verifyRefreshToken(rawRefreshToken)

  // check it exists in DB and isn't revoked
  const tokenHash = hashToken(rawRefreshToken)
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } })

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new Error('INVALID_REFRESH_TOKEN')
  }

  // rotate — revoke old, issue new
  await prisma.refreshToken.update({
    where: { tokenHash },
    data: { revokedAt: new Date() }
  })

  const newAccessToken = signAccessToken(payload.userId)
  const newRefreshToken = signRefreshToken(payload.userId)
  await storeRefreshToken(payload.userId, newRefreshToken)

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

export async function logout(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken)
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() }
  })
}

// helpers
async function storeRefreshToken(userId: string, rawToken: string) {
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt }
  })
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
