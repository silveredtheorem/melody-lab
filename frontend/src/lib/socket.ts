import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/auth.store'

let socket: Socket | null = null

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function connectSocket() {
  if (socket?.connected) return socket
  socket = io(SOCKET_URL, {
    auth: { token: useAuthStore.getState().accessToken },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
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
