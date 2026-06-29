import { Queue } from 'bullmq'
import redis from './redis.js'

export interface AIGenerationJob {
  projectId: string
  commitId: string
  branchId: string
  layerId: string
  instrument: string
  prompt: string
  sourceType: 'MUBERT' | 'LALAL'
  userId: string
}

export const aiGenerationQueue = new Queue<AIGenerationJob>('ai-generation', {
  connection: redis as any,
})

export async function enqueueAIGeneration(data: AIGenerationJob) {
  return aiGenerationQueue.add('generate' as any, data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  })
}
