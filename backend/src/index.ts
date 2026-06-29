import 'dotenv/config'
import http from 'node:http'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth.routes.js'
import projectRoutes from './routes/project.routes.js'
import branchRoutes from './routes/branch.routes.js'
import commitRoutes from './routes/commit.routes.js'
import storageRoutes from './routes/storage.routes.js'
import aiRoutes from './routes/ai.routes.js'
import mergeRoutes from './routes/merge.routes.js'
import internalRoutes from './routes/internal.routes.js'
import { initSocket } from './lib/socket.js'

// Validate required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
}
if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
  throw new Error('Missing required environment variables: ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET')
}
if (!process.env.DATABASE_URL) {
  throw new Error('Missing required environment variable: DATABASE_URL')
}

const app = express()

app.use(helmet())

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))

app.use(express.json())
app.use(cookieParser())

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' },
})

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/auth', authLimiter, authRoutes)
app.use('/projects', projectRoutes)
app.use('/', branchRoutes)
app.use('/', commitRoutes)
app.use('/storage', storageRoutes)
app.use('/projects/:projectId/ai', aiRoutes)
app.use('/projects/:projectId/merge-requests', mergeRoutes)
app.use('/internal', internalRoutes)

// Error handling middleware (must be last)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  })
})

const server = http.createServer(app)
initSocket(server)

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
