import { Request, Response } from 'express';
import * as projectService from '../services/project.service.js';

export async function createProject(req: Request, res: Response) {
  try {
    const userId = res.locals.userId;
    const { name } = req.body;
    const project = await projectService.createProject(name, userId);
    res.status(201).json(project);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listProjects(req: Request, res: Response) {
  try {
    const userId = res.locals.userId;
    const projects = await projectService.listProjects(userId);
    res.status(200).json(projects);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getProject(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string;
    const projectId = req.params.projectId as string;
    const project = await projectService.getProject(projectId, userId);
    res.status(200).json(project);
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function addMember(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string;
    const projectId = req.params.projectId as string;
    const { email } = req.body;
    const member = await projectService.addMember(projectId, userId, email);
    res.status(201).json(member);
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (err.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'No user found with that email' });
    }
    if (err.message === 'ALREADY_MEMBER') {
      return res.status(409).json({ error: 'User is already a member of this project' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function removeMember(req: Request, res: Response) {
  try {
    const userId = res.locals.userId as string;
    const projectId = req.params.projectId as string;
    const targetUserId = req.params.userId as string;
    await projectService.removeMember(projectId, userId, targetUserId);
    res.status(204).end();
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (err.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Member not found' });
    }
    if (err.message === 'CANNOT_REMOVE_OWNER') {
      return res.status(422).json({ error: 'Cannot remove the project owner' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}
