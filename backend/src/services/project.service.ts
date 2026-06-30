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

export async function addMember(projectId: string, requesterId: string, email: string) {
  const requesterMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: requesterId } },
  });
  if (!requesterMembership || requesterMembership.role !== 'OWNER') throw new Error('FORBIDDEN');

  const userToAdd = await prisma.user.findUnique({ where: { email } });
  if (!userToAdd) throw new Error('USER_NOT_FOUND');

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: userToAdd.id } },
  });
  if (existing) throw new Error('ALREADY_MEMBER');

  const member = await prisma.projectMember.create({
    data: { projectId, userId: userToAdd.id, role: 'COLLABORATOR' },
    include: { user: { select: { id: true, name: true } } },
  });

  return member;
}

export async function removeMember(projectId: string, requesterId: string, targetUserId: string) {
  const requesterMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: requesterId } },
  });
  if (!requesterMembership || requesterMembership.role !== 'OWNER') throw new Error('FORBIDDEN');

  const targetMembership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
  if (!targetMembership) throw new Error('NOT_FOUND');
  if (targetMembership.role === 'OWNER') throw new Error('CANNOT_REMOVE_OWNER');

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
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
