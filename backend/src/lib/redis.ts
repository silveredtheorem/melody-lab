import IoRedis from 'ioredis'

const Redis = IoRedis.default ?? IoRedis
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

const redis = new (Redis as any)(redisUrl)
export const redisSub = new (Redis as any)(redisUrl)

export default redis
