import { Request, Response } from 'express'
import * as mergeService from '../services/merge.service'

function handleError(err: any, res: Response) {
  if (err.message === 'FORBIDDEN') return res.status(403).json({ error: 'Access denied' })
  if (err.message === 'NOT_FOUND') return res.status(404).json({ error: 'Not found' })
  if (err.message === 'UNRESOLVED_CONFLICTS') return res.status(409).json({ error: 'All conflicts must be resolved before merging' })
  return res.status(500).json({ error: 'Internal server error' })
}

export async function createMergeRequest(req: Request, res: Response) {
  try {
    const projectId = req.params.projectId as string
    const userId = res.locals.userId as string
    const { sourceBranchId, targetBranchId } = req.body
    const mergeRequest = await mergeService.createMergeRequest(projectId, sourceBranchId, targetBranchId, userId)
    res.status(201).json(mergeRequest)
  } catch (err: any) {
    handleError(err, res)
  }
}

export async function getMergeRequest(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string
    const mergeRequestId = req.params.mergeRequestId as string
    const mergeRequest = await mergeService.getMergeRequest(mergeRequestId, userId)
    res.status(200).json(mergeRequest)
  } catch (err: any) {
    handleError(err, res)
  }
}

export async function resolveConflict(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string
    const mergeRequestId = req.params.mergeRequestId as string
    const conflictId = req.params.conflictId as string
    const { resolution } = req.body
    const conflict = await mergeService.resolveConflict(mergeRequestId, conflictId, resolution, userId)
    res.status(200).json(conflict)
  } catch (err: any) {
    handleError(err, res)
  }
}

export async function completeMerge(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string
    const mergeRequestId = req.params.mergeRequestId as string
    const commit = await mergeService.completeMerge(mergeRequestId, userId)
    res.status(200).json(commit)
  } catch (err: any) {
    handleError(err, res)
  }
}
