import { Request, Response } from 'express'
import * as aiService from '../services/ai.service'

export async function requestGeneration(req: Request, res: Response) {
  try {
    const projectId = req.params.projectId as string
    const userId = res.locals.userId as string
    const { branchId, instrument, prompt, sourceType } = req.body
    const layer = await aiService.requestAIGeneration(projectId, branchId, instrument, prompt, userId, sourceType)
    res.status(202).json(layer)
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Access denied' })
    }
    if (err.message === 'BRANCH_NOT_FOUND') {
      return res.status(404).json({ error: 'Branch not found' })
    }
    if (err.message === 'BRANCH_HAS_NO_COMMITS') {
      return res.status(422).json({ error: 'Branch has no commits' })
    }
    res.status(500).json({ error: 'Internal server error' })
  }
}
