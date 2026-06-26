import { Request, Response } from 'express';
import * as branchService from '../services/branch.service';

export async function createBranch(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string;
    const projectId = req.params.projectId as string;
    const { name } = req.body;
    const branch = await branchService.createBranch(projectId, name, userId);
    res.status(201).json(branch);
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (err.message === 'BRANCH_EXISTS') {
      return res.status(409).json({ error: 'Branch already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listBranches(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string;
    const projectId = req.params.projectId as string;
    const branches = await branchService.listBranches(projectId, userId);
    res.status(200).json(branches);
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}
