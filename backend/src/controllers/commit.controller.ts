import { Request, Response } from 'express';
import * as commitService from '../services/commit.service';

export async function createCommit(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string;
    const projectId = req.params.projectId as string;
    const commit = await commitService.createCommit(projectId, userId, req.body);
    res.status(201).json(commit);
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (err.message === 'BRANCH_NOT_FOUND') {
      return res.status(404).json({ error: 'Branch not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getCommitHistory(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string;
    const branchId = req.params.branchId as string;
    const commits = await commitService.getCommitHistory(branchId, userId);
    res.status(200).json(commits);
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (err.message === 'BRANCH_NOT_FOUND') {
      return res.status(404).json({ error: 'Branch not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}
