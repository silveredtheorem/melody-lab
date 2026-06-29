import { prisma } from '../lib/prisma'
import { findLCA } from './lca.service'
import { emitCommitCreated, emitLayerAdded } from '../lib/socket'

type LayerRow = {
  id: string
  commitId: string
  s3Key: string
  instrument: string
  durationMs: number
  startMs: number
  bpm: number | null
  keySignature: string | null
  sourceType: 'HUMAN' | 'AI_GENERATED'
  createdBy: string | null
  createdAt: Date
}

function indexByInstrument(layers: LayerRow[]): Map<string, LayerRow> {
  const map = new Map<string, LayerRow>()
  for (const layer of layers) {
    map.set(layer.instrument, layer)
  }
  return map
}

export async function createMergeRequest(
  projectId: string,
  sourceBranchId: string,
  targetBranchId: string,
  userId: string
) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  })
  if (!member) throw new Error('FORBIDDEN')

  const [sourceBranch, targetBranch] = await Promise.all([
    prisma.branch.findUnique({ where: { id: sourceBranchId } }),
    prisma.branch.findUnique({ where: { id: targetBranchId } }),
  ])

  if (!sourceBranch || sourceBranch.projectId !== projectId) throw new Error('NOT_FOUND')
  if (!targetBranch || targetBranch.projectId !== projectId) throw new Error('NOT_FOUND')

  const lcaId =
    sourceBranch.headCommitId && targetBranch.headCommitId
      ? await findLCA(sourceBranch.headCommitId, targetBranch.headCommitId)
      : null

  const [sourceLayers, targetLayers, baseLayers] = await Promise.all([
    sourceBranch.headCommitId
      ? prisma.layer.findMany({ where: { commitId: sourceBranch.headCommitId } })
      : [],
    targetBranch.headCommitId
      ? prisma.layer.findMany({ where: { commitId: targetBranch.headCommitId } })
      : [],
    lcaId ? prisma.layer.findMany({ where: { commitId: lcaId } }) : [],
  ])

  const sourceByInstrument = indexByInstrument(sourceLayers as LayerRow[])
  const targetByInstrument = indexByInstrument(targetLayers as LayerRow[])
  const baseByInstrument = indexByInstrument(baseLayers as LayerRow[])

  const allInstruments = new Set([
    ...sourceByInstrument.keys(),
    ...targetByInstrument.keys(),
  ])

  const conflicts: { instrument: string; ourLayerId: string; theirLayerId: string }[] = []

  for (const instrument of allInstruments) {
    const sourceLayer = sourceByInstrument.get(instrument)
    const targetLayer = targetByInstrument.get(instrument)
    const baseLayer = baseByInstrument.get(instrument)

    const sourceDiffersFromBase = sourceLayer !== undefined && sourceLayer.s3Key !== baseLayer?.s3Key
    const targetDiffersFromBase = targetLayer !== undefined && targetLayer.s3Key !== baseLayer?.s3Key

    if (sourceDiffersFromBase && targetDiffersFromBase && sourceLayer!.s3Key !== targetLayer!.s3Key) {
      conflicts.push({
        instrument,
        ourLayerId: targetLayer!.id,
        theirLayerId: sourceLayer!.id,
      })
    }
  }

  const mergeRequest = await prisma.mergeRequest.create({
    data: {
      projectId,
      sourceBranchId,
      targetBranchId,
      commonAncestorId: lcaId,
      status: 'OPEN',
      createdBy: userId,
      conflicts: {
        create: conflicts,
      },
    },
    include: { conflicts: true },
  })

  return mergeRequest
}

export async function getMergeRequest(mergeRequestId: string, userId: string) {
  const mergeRequest = await prisma.mergeRequest.findUnique({
    where: { id: mergeRequestId },
    include: {
      conflicts: {
        include: {
          ourLayer: true,
          theirLayer: true,
        },
      },
      sourceBranch: true,
      targetBranch: true,
    },
  })

  if (!mergeRequest) throw new Error('NOT_FOUND')

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: mergeRequest.projectId, userId } },
  })
  if (!member) throw new Error('FORBIDDEN')

  return mergeRequest
}

export async function resolveConflict(
  mergeRequestId: string,
  conflictId: string,
  resolution: 'OURS' | 'THEIRS' | 'BOTH',
  userId: string
) {
  const conflict = await prisma.mergeConflict.findUnique({
    where: { id: conflictId },
    include: { mergeRequest: true },
  })

  if (!conflict || conflict.mergeRequestId !== mergeRequestId) throw new Error('NOT_FOUND')

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: conflict.mergeRequest.projectId, userId } },
  })
  if (!member) throw new Error('FORBIDDEN')

  return prisma.mergeConflict.update({
    where: { id: conflictId },
    data: { resolution, resolvedAt: new Date() },
  })
}

export async function completeMerge(mergeRequestId: string, userId: string) {
  const mergeRequest = await prisma.mergeRequest.findUnique({
    where: { id: mergeRequestId },
    include: {
      conflicts: {
        include: {
          ourLayer: true,
          theirLayer: true,
        },
      },
      sourceBranch: true,
      targetBranch: true,
    },
  })

  if (!mergeRequest) throw new Error('NOT_FOUND')

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: mergeRequest.projectId, userId } },
  })
  if (!member) throw new Error('FORBIDDEN')

  if (mergeRequest.conflicts.some((c) => c.resolution === null)) {
    throw new Error('UNRESOLVED_CONFLICTS')
  }

  const [sourceLayers, targetLayers] = await Promise.all([
    mergeRequest.sourceBranch.headCommitId
      ? prisma.layer.findMany({ where: { commitId: mergeRequest.sourceBranch.headCommitId } })
      : [],
    mergeRequest.targetBranch.headCommitId
      ? prisma.layer.findMany({ where: { commitId: mergeRequest.targetBranch.headCommitId } })
      : [],
  ])

  const sourceByInstrument = indexByInstrument(sourceLayers as LayerRow[])
  const targetByInstrument = indexByInstrument(targetLayers as LayerRow[])
  const conflictByInstrument = new Map(mergeRequest.conflicts.map((c) => [c.instrument, c]))

  const allInstruments = new Set([
    ...sourceByInstrument.keys(),
    ...targetByInstrument.keys(),
  ])

  const finalLayers: LayerRow[] = []

  for (const instrument of allInstruments) {
    const conflict = conflictByInstrument.get(instrument)
    if (conflict) {
      if (conflict.resolution === 'OURS') {
        finalLayers.push(conflict.ourLayer as LayerRow)
      } else if (conflict.resolution === 'THEIRS') {
        finalLayers.push(conflict.theirLayer as LayerRow)
      } else if (conflict.resolution === 'BOTH') {
        finalLayers.push(conflict.ourLayer as LayerRow, conflict.theirLayer as LayerRow)
      }
    } else {
      const sourceLayer = sourceByInstrument.get(instrument)
      const targetLayer = targetByInstrument.get(instrument)
      if (sourceLayer && !targetLayer) {
        finalLayers.push(sourceLayer)
      } else if (targetLayer && !sourceLayer) {
        finalLayers.push(targetLayer)
      } else if (targetLayer) {
        // Both have a layer for this instrument with no conflict — take target
        finalLayers.push(targetLayer)
      }
    }
  }

  const mergeCommit = await prisma.$transaction(async (tx) => {
    const commit = await tx.commit.create({
      data: {
        projectId: mergeRequest.projectId,
        authorId: userId,
        message: `Merge branch into target`,
        parentId: mergeRequest.targetBranch.headCommitId,
        mergeParentId: mergeRequest.sourceBranch.headCommitId,
        layers: {
          create: finalLayers.map((layer) => ({
            s3Key: layer.s3Key,
            instrument: layer.instrument,
            durationMs: layer.durationMs,
            startMs: layer.startMs,
            bpm: layer.bpm,
            keySignature: layer.keySignature,
            sourceType: layer.sourceType,
            createdBy: layer.createdBy,
          })),
        },
      },
      include: { layers: true },
    })

    await tx.branch.update({
      where: { id: mergeRequest.targetBranchId },
      data: { headCommitId: commit.id },
    })

    await tx.mergeRequest.update({
      where: { id: mergeRequestId },
      data: { status: 'RESOLVED' },
    })

    if (mergeRequest.targetBranch.name === 'main') {
      await tx.branch.delete({ where: { id: mergeRequest.sourceBranchId } })
    }

    return commit
  })

  emitCommitCreated(mergeRequest.projectId, mergeCommit)
  for (const layer of mergeCommit.layers) {
    emitLayerAdded(mergeRequest.projectId, layer)
  }

  return mergeCommit
}
