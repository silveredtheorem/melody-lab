import { Request, Response } from 'express'
import * as storageService from '../services/storage.service.js'
import { prisma } from '../lib/prisma.js'

function extractProjectId(key: string): string | null {
  const match = key.match(/^projects\/([0-9a-fA-F-]{36})\//)
  return match ? match[1] : null
}

async function assertProjectMember(key: string, userId: string) {
  const projectId = extractProjectId(key)
  if (!projectId) throw new Error('INVALID_KEY')

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  })
  if (!membership) throw new Error('FORBIDDEN')
}

export async function getUploadUrl(req: Request, res: Response) {
  try {
    const { s3Key } = req.body
    await assertProjectMember(s3Key, res.locals.userId)
    const result = await storageService.getUploadPresignedUrl(s3Key)
    res.status(200).json(result)
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' })
    if (err.message === 'INVALID_KEY') return res.status(400).json({ error: 'Invalid key' })
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getPlaybackUrl(req: Request, res: Response) {
  try {
    const key = req.query.key
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid query parameter: key' })
    }
    await assertProjectMember(key, res.locals.userId)
    const result = await storageService.getPlaybackPresignedUrl(key)
    res.status(200).json(result)
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' })
    if (err.message === 'INVALID_KEY') return res.status(400).json({ error: 'Invalid key' })
    res.status(500).json({ error: 'Internal server error' })
  }
}
