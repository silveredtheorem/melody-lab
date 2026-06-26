import { Request, Response } from 'express';
import * as projectService from '../services/project.service';

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
