import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/auth.store'

let socket: Socket | null = null

export function connectSocket() {
  if (socket?.connected) return socket
  socket = io('http://localhost:3000', {
    auth: { token: useAuthStore.getState().accessToken },
    transports: ['websocket', 'polling'],
  })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

export function joinProject(projectId: string) {
  socket?.emit('join-project', projectId)
}

export function leaveProject(projectId: string) {
  socket?.emit('leave-project', projectId)
}

export function getSocket(): Socket | null {
  return socket
}
