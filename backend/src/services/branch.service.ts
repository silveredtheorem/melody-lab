import { prisma } from '../lib/prisma';

export async function createBranch(projectId: string, name: string, userId: string, fromBranch?: string) {
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

  let headCommitId: string | null = null
  if (fromBranch) {
    const source = await prisma.branch.findUnique({
      where: { projectId_name: { projectId, name: fromBranch } },
    })
    if (source) headCommitId = source.headCommitId
  }

  const branch = await prisma.branch.create({
    data: {
      projectId,
      name,
      headCommitId,
    },
    include: { headCommit: true },
  });

  return branch;
}

export async function deleteBranch(projectId: string, branchId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  })
  if (!member) throw new Error('FORBIDDEN')

  const branch = await prisma.branch.findUnique({ where: { id: branchId } })
  if (!branch || branch.projectId !== projectId) throw new Error('BRANCH_NOT_FOUND')
  if (branch.name === 'main') throw new Error('CANNOT_DELETE_DEFAULT')

  await prisma.branch.delete({ where: { id: branchId } })
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
