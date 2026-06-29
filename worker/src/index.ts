import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '..', '.env') })

import Redis from 'ioredis'
import { Worker } from 'bullmq'
import { PrismaClient } from '../../backend/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
})

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3000'

interface AIGenerationJob {
  projectId: string
  commitId: string
  branchId: string
  layerId: string
  instrument: string
  prompt: string
  sourceType: 'MUBERT' | 'LALAL'
  userId: string
}

async function processAIJob(data: AIGenerationJob): Promise<void> {
  console.log('Processing AI job', data.layerId, data.instrument)

  await new Promise<void>((resolve) => setTimeout(resolve, 2000))

  await prisma.layer.update({
    where: { id: data.layerId },
    data: {
      s3Key: `ai-generated/${data.layerId}.wav`,
      durationMs: 3000,
    },
  })

  await fetch(`${BACKEND_URL}/internal/layer-updated`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ layerId: data.layerId, projectId: data.projectId }),
  })
}

const worker = new Worker<AIGenerationJob>(
  'ai-generation',
  async (job) => {
    console.log('Received job', job.id, job.data)
    await processAIJob(job.data)
  },
  { connection }
)

console.log('Worker started, waiting for jobs...')

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err)
})
