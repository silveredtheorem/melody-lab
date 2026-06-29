import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { Server as HttpServer } from 'http'
import redis, { redisSub } from './redis'
import { verifyAccessToken } from './jwt'

let io: Server

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' ? process.env.CORS_ORIGIN : '*',
      credentials: true,
    },
  })

  io.adapter(createAdapter(redis, redisSub))

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) return next(new Error('UNAUTHORIZED'))
      const { userId } = verifyAccessToken(token)
      socket.data.userId = userId
      next()
    } catch {
      next(new Error('UNAUTHORIZED'))
    }
  })

  io.on('connection', (socket) => {
    socket.on('join-project', (projectId: string) => {
      socket.join(`project:${projectId}`)
    })

    socket.on('leave-project', (projectId: string) => {
      socket.leave(`project:${projectId}`)
    })
  })

  return io
}

export function emitLayerAdded(projectId: string, layer: unknown) {
  io.to(`project:${projectId}`).emit('layer-added', layer)
}

export function emitCommitCreated(projectId: string, commit: unknown) {
  io.to(`project:${projectId}`).emit('commit-created', commit)
}

export function emitLayerUpdated(projectId: string, layer: unknown) {
  io.to(`project:${projectId}`).emit('layer-updated', layer)
}

export { io }
