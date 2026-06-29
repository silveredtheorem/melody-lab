import { prisma } from '../lib/prisma.js'
import { enqueueAIGeneration } from '../lib/queue.js'

export async function requestAIGeneration(
  projectId: string,
  branchId: string,
  instrument: string,
  prompt: string,
  userId: string,
  sourceType: 'MUBERT' | 'LALAL'
) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  })

  if (!member) {
    throw new Error('FORBIDDEN')
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  })

  if (!branch || branch.projectId !== projectId) {
    throw new Error('BRANCH_NOT_FOUND')
  }

  if (!branch.headCommitId) {
    throw new Error('BRANCH_HAS_NO_COMMITS')
  }

  const layer = await prisma.layer.create({
    data: {
      commitId: branch.headCommitId,
      instrument,
      s3Key: '',
      durationMs: 0,
      sourceType: 'AI_GENERATED',
      createdBy: userId,
    },
  })

  await enqueueAIGeneration({
    projectId,
    commitId: branch.headCommitId,
    branchId,
    layerId: layer.id,
    instrument,
    prompt,
    sourceType,
    userId,
  })

  return layer
}
