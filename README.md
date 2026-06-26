# Melody Lab

A collaborative music production platform with Git-like version control for audio projects.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start PostgreSQL:
```bash
docker-compose up -d
```

3. Configure environment:
```bash
# Copy to backend/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/melodylab
```

4. Run migrations:
```bash
cd backend
npx prisma migrate dev
```

5. Start development server:
```bash
npm run dev
```

## Tech Stack

- **Backend**: Express, Prisma, PostgreSQL
- **Auth**: JWT with refresh tokens, bcrypt
- **Storage**: S3 for audio files
