import { Request, Response } from 'express';
import * as branchService from '../services/branch.service.js';

export async function createBranch(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string;
    const projectId = req.params.projectId as string;
    const { name, fromBranch } = req.body;
    const branch = await branchService.createBranch(projectId, name, userId, fromBranch);
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

export async function deleteBranch(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string;
    const projectId = req.params.projectId as string;
    const branchId = req.params.branchId as string;
    await branchService.deleteBranch(projectId, branchId, userId);
    res.status(204).end();
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (err.message === 'BRANCH_NOT_FOUND') {
      return res.status(404).json({ error: 'Branch not found' });
    }
    if (err.message === 'CANNOT_DELETE_DEFAULT') {
      return res.status(422).json({ error: 'Cannot delete the default branch' });
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
