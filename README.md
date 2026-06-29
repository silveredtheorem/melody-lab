# Melody Lab

Git-like version control for music production. Create projects, branch, upload audio layers, generate AI layers, resolve merge conflicts, and collaborate in real-time.

## Architecture

```
melody-lab/
├── backend/     Express API + Socket.io + Prisma
├── frontend/    React + Vite + Zustand
├── shared/      Zod schemas shared across packages
└── worker/      BullMQ worker for async AI generation
```

## Tech Stack

- **Backend**: Express 5, Prisma (PostgreSQL), Socket.io with Redis adapter
- **Frontend**: React 19, React Router 7, Zustand, Vite
- **Auth**: JWT access tokens (15min) + httpOnly refresh token cookies (7d) with rotation
- **Storage**: Supabase Storage (S3-compatible) for audio files
- **Queue**: BullMQ + Redis for async AI generation jobs
- **Real-time**: Socket.io with Redis adapter for multi-instance support

## Prerequisites

- Node.js 20+
- PostgreSQL
- Redis
- Supabase project (for audio storage)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment files:

**backend/.env**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/melodylab
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ACCESS_TOKEN_SECRET=your-access-secret
REFRESH_TOKEN_SECRET=your-refresh-secret
CORS_ORIGIN=http://localhost:5173
```

**worker/.env**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/melodylab
REDIS_URL=redis://localhost:6379
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BACKEND_INTERNAL_URL=http://localhost:3000
```

3. Run database migrations:
```bash
cd backend
npx prisma migrate dev
```

4. Create a Supabase storage bucket named `audio-layers`.

5. Start all services:
```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev

# Terminal 3 — worker
cd worker && npm run dev
```

The frontend runs on `http://localhost:5173`, backend on `http://localhost:3000`.

## Features

### Projects & Branches
- Create projects, auto-creates `main` branch
- Fork branches from any existing branch (copies head commit)
- Delete branches (auto-deleted when merged into main)

### Audio Layers (DAW View)
- Upload WAV/MP3 files as layers
- Each commit is a full snapshot (carries forward all parent layers)
- Mute/unmute individual layers during playback
- Delete layers (creates new commit without that layer)
- Color-coded tracks by instrument
- Playhead with seek, play/pause/stop transport

### AI Generation
- Request AI-generated layers by instrument + text prompt
- Async processing via BullMQ worker
- Real-time "generating..." state with animated track bar
- Layer updates in real-time when generation completes

### Merge Requests
- 3-way merge: compares source, target, and LCA (lowest common ancestor)
- Conflicts detected by instrument — same audio (s3Key) = no conflict
- Resolve conflicts: keep ours, keep theirs, or keep both
- Source branch auto-deleted when merged into main

### Real-time Collaboration
- Socket.io rooms per project
- Layer additions and updates broadcast to all connected clients
- Commit events refresh the branch view across tabs

### Auth
- Register/login with email + password
- JWT access tokens + httpOnly refresh cookies with token rotation
- Refresh token family tracking (detects reuse attacks)
- Profile update and password change

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh tokens |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Current user |
| PATCH | `/auth/me` | Update profile |
| POST | `/auth/change-password` | Change password |
| POST | `/projects` | Create project |
| GET | `/projects` | List projects |
| GET | `/projects/:id` | Get project |
| POST | `/projects/:id/branches` | Create branch |
| GET | `/projects/:id/branches` | List branches |
| DELETE | `/projects/:id/branches/:bid` | Delete branch |
| POST | `/projects/:id/commits` | Create commit |
| GET | `/projects/:id/commits/history/:bid` | Commit history |
| GET | `/projects/:id/commits/:cid` | Get commit |
| POST | `/storage/upload-url` | Presigned upload URL |
| GET | `/storage/playback-url` | Presigned playback URL |
| POST | `/projects/:id/ai/generate` | Request AI layer |
| POST | `/projects/:id/merge-requests` | Create merge request |
| GET | `/projects/:id/merge-requests/:mid` | Get merge request |
| PATCH | `/projects/:id/merge-requests/:mid/conflicts/:cid` | Resolve conflict |
| POST | `/projects/:id/merge-requests/:mid/complete` | Complete merge |

## License

MIT
