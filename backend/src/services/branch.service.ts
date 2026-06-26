import { prisma } from '../lib/prisma';

export async function createBranch(projectId: string, name: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (!member) {
    throw new Error('FORBIDDEN');
  }

  const existing = await prisma.branch.findUnique({
    where: {
      projectId_name: {
        projectId,
        name,
      },
    },
  });

  if (existing) {
    throw new Error('BRANCH_EXISTS');
  }

  const branch = await prisma.branch.create({
    data: {
      projectId,
      name,
    },
  });

  return branch;
}

export async function listBranches(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (!member) {
    throw new Error('FORBIDDEN');
  }

  const branches = await prisma.branch.findMany({
    where: { projectId },
    include: {
      headCommit: true,
    },
  });

  return branches;
}
