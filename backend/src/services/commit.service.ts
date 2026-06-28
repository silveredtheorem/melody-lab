import { prisma } from '../lib/prisma';
import type { CreateCommitInput } from '@melody-lab/shared';
import { emitCommitCreated, emitLayerAdded } from '../lib/socket';

export async function createCommit(
  projectId: string,
  authorId: string,
  input: CreateCommitInput
) {
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: authorId,
      },
    },
  });

  if (!member) {
    throw new Error('FORBIDDEN');
  }

  const branch = await prisma.branch.findUnique({
    where: { id: input.branchId },
  });

  if (!branch || branch.projectId !== projectId) {
    throw new Error('BRANCH_NOT_FOUND');
  }

  const commit = await prisma.$transaction(async (tx) => {
    const newCommit = await tx.commit.create({
      data: {
        projectId,
        authorId,
        message: input.message,
        parentId: branch.headCommitId,
        layers: {
          create: input.layers.map((layer) => ({
            s3Key: layer.s3Key,
            instrument: layer.instrument,
            durationMs: layer.durationMs,
            startMs: layer.startMs,
            bpm: layer.bpm,
            keySignature: layer.keySignature,
            sourceType: layer.sourceType,
            createdBy: authorId,
          })),
        },
      },
      include: {
        layers: true,
      },
    });

    await tx.branch.update({
      where: { id: input.branchId },
      data: { headCommitId: newCommit.id },
    });

    return newCommit;
  });

  emitCommitCreated(projectId, commit)
  for (const layer of commit.layers) {
    emitLayerAdded(projectId, layer)
  }

  return commit;
}

export async function getCommitHistory(branchId: string, userId: string) {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { project: true },
  });

  if (!branch) {
    throw new Error('BRANCH_NOT_FOUND');
  }

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: branch.projectId,
        userId,
      },
    },
  });

  if (!member) {
    throw new Error('FORBIDDEN');
  }

  if (!branch.headCommitId) {
    return [];
  }

  const commits = await prisma.$queryRaw<any[]>`
    WITH RECURSIVE commit_history AS (
      SELECT *
      FROM "Commit"
      WHERE id = ${branch.headCommitId}

      UNION ALL

      SELECT c.*
      FROM "Commit" c
      INNER JOIN commit_history ch ON c.id = ch."parentId"
    )
    SELECT *
    FROM commit_history
    ORDER BY "createdAt" DESC
  `;

  return commits;
}
