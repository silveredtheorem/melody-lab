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

  if (branch.headCommitId) {
    const existingLayers = await prisma.layer.findMany({
      where: { commitId: branch.headCommitId },
    });
    const existingByInstrument = new Map(existingLayers.map((l) => [l.instrument, l]));
    for (const layer of input.layers) {
      const existing = existingByInstrument.get(layer.instrument);
      if (existing && existing.s3Key !== layer.s3Key) {
        const err = new Error('DUPLICATE_INSTRUMENT');
        (err as any).instrument = layer.instrument;
        throw err;
      }
    }
  }

  const commit = await prisma.$transaction(async (tx) => {
    const parentLayers = branch.headCommitId
      ? await tx.layer.findMany({ where: { commitId: branch.headCommitId } })
      : [];

    const newInstruments = new Set(input.layers.map((l) => l.instrument));

    const carriedLayers = parentLayers
      .filter((l) => !newInstruments.has(l.instrument))
      .map((l) => ({
        s3Key: l.s3Key,
        instrument: l.instrument,
        durationMs: l.durationMs,
        startMs: l.startMs,
        bpm: l.bpm,
        keySignature: l.keySignature,
        sourceType: l.sourceType,
        createdBy: l.createdBy,
      }));

    const newLayers = input.layers.map((layer) => ({
      s3Key: layer.s3Key,
      instrument: layer.instrument,
      durationMs: layer.durationMs,
      startMs: layer.startMs,
      bpm: layer.bpm,
      keySignature: layer.keySignature,
      sourceType: layer.sourceType,
      createdBy: authorId,
    }));

    const newCommit = await tx.commit.create({
      data: {
        projectId,
        authorId,
        message: input.message,
        parentId: branch.headCommitId,
        layers: {
          create: [...carriedLayers, ...newLayers],
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

  const authorIds = [...new Set(commits.map((c) => c.authorId as string))];
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true },
  });
  const authorMap = Object.fromEntries(authors.map((u) => [u.id, u]));

  return commits.map((c) => ({ ...c, author: authorMap[c.authorId] ?? null }));
}

export async function getCommit(commitId: string, userId: string) {
  const commit = await prisma.commit.findUnique({
    where: { id: commitId },
    include: {
      layers: true,
      author: { select: { id: true, name: true } },
    },
  });

  if (!commit) throw new Error('NOT_FOUND');

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: commit.projectId, userId } },
  });
  if (!member) throw new Error('FORBIDDEN');

  return commit;
}
