import { Request, Response } from 'express'
import * as storageService from '../services/storage.service.js'

export async function getUploadUrl(req: Request, res: Response) {
  try {
    const { s3Key } = req.body
    const result = await storageService.getUploadPresignedUrl(s3Key)
    res.status(200).json(result)
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

export async function getPlaybackUrl(req: Request, res: Response) {
  try {
    const key = req.query.key
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid query parameter: key' })
    }
    const result = await storageService.getPlaybackPresignedUrl(key)
    res.status(200).json(result)
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' })
  }
}
