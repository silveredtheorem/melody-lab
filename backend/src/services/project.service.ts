import { prisma } from '../lib/prisma.js';

export async function createProject(name: string, ownerId: string) {
  const project = await prisma.project.create({
    data: {
      name,
      ownerId,
      members: {
        create: {
          userId: ownerId,
          role: 'OWNER',
        },
      },
      branches: {
        create: {
          name: 'main',
        },
      },
    },
    include: {
      branches: true,
      members: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  const defaultBranch = project.branches.find((b: any) => b.name === 'main');

  return {
    ...project,
    defaultBranch,
  };
}

export async function getProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      branches: true,
      members: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  if (!project) {
    throw new Error('NOT_FOUND');
  }

  const isMember = project.members.some((m: any) => m.userId === userId);
  if (!isMember) {
    throw new Error('FORBIDDEN');
  }

  return project;
}

export async function listProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      branches: true,
      members: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  return projects;
}
