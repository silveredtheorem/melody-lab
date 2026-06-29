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
  const familyId = crypto.randomUUID()
  await storeRefreshToken(user.id, refreshToken, familyId)

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error('INVALID_CREDENTIALS')

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new Error('INVALID_CREDENTIALS')

  const accessToken = signAccessToken(user.id)
  const refreshToken = signRefreshToken(user.id)
  const familyId = crypto.randomUUID()
  await storeRefreshToken(user.id, refreshToken, familyId)

  return { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name } }
}

export async function refresh(rawRefreshToken: string) {
  // verify JWT signature first
  const payload = verifyRefreshToken(rawRefreshToken)

  const tokenHash = hashToken(rawRefreshToken)
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } })

  // ── Normal rejection path ──────────────────────────────────
  if (!stored) {
    throw new Error('INVALID_REFRESH_TOKEN')
  }

  if (stored.expiresAt < new Date()) {
    throw new Error('INVALID_REFRESH_TOKEN')
  }

  if (stored.revokedAt) {
    throw new Error('INVALID_REFRESH_TOKEN')
  }

  // ── Token was already rotated (deprecated) ─────────────────
  // The browser may not have received the latest Set-Cookie
  // (e.g. lost due to page refresh race, tab crash, etc.).
  // Find the newest *active* token in the same family and rotate
  // it forward so the browser gets a fresh cookie.
  if (stored.deprecatedAt) {
    const familyToken = await prisma.refreshToken.findFirst({
      where: {
        familyId: stored.familyId,
        revokedAt: null,
        deprecatedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (familyToken) {
      const newAccessToken = signAccessToken(payload.userId)
      return { accessToken: newAccessToken, refreshToken: rawRefreshToken }
    }

    throw new Error('INVALID_REFRESH_TOKEN')
  }

  // ── Reuse window ─────────────────────────────────────────
  const TOKEN_REUSE_WINDOW_MS = 10_000
  if (Date.now() - stored.createdAt.getTime() < TOKEN_REUSE_WINDOW_MS) {
    const newAccessToken = signAccessToken(payload.userId)
    return { accessToken: newAccessToken, refreshToken: rawRefreshToken }
  }

  // ── Normal rotation ──────────────────────────────────────
  await prisma.refreshToken.update({
    where: { tokenHash },
    data: { deprecatedAt: new Date() },
  })

  const newAccessToken = signAccessToken(payload.userId)
  const newRefreshToken = signRefreshToken(payload.userId)
  await storeRefreshToken(payload.userId, newRefreshToken, stored.familyId)

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

export async function logout(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken)
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  })
}

export async function updateProfile(userId: string, name: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
  })
  return { id: user.id, email: user.email, name: user.name }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('NOT_FOUND')

  const valid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!valid) throw new Error('WRONG_PASSWORD')

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
}

// helpers
async function storeRefreshToken(userId: string, rawToken: string, familyId: string) {
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await prisma.refreshToken.create({
    data: { userId, tokenHash, familyId, expiresAt },
  })
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
