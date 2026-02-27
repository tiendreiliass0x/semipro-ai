# YenengaLabs

YenengaLabs is a React + Bun application for story-first film development:
- project ideation and synopsis refinement
- beat polishing and storyboard generation
- scene image/video generation
- final film compilation

## Stack
- Frontend: React 19 + Vite + TypeScript (`app/`)
- Backend: Bun + TypeScript + SQLite (`backend/`)
- AI/media: OpenAI (text), FAL (image/video), xAI/Grok (optional image)

## Local Development

### Prerequisites
- Node.js `22.12.x` (for frontend tooling)
- Bun `1.2+` (backend runtime and tests)
- `ffmpeg` (scene processing and final film generation)

### One-command start
```bash
./start.sh
```

### Optional: Redis for BullMQ queues
If you want queue processing through BullMQ (instead of in-process polling), start Redis:

```bash
docker compose up -d
```

Then set in `backend/.env`:

```env
QUEUE_PROVIDER=bullmq
REDIS_URL=redis://127.0.0.1:6379
```

### Manual start
Backend:
```bash
cd backend
bun run migrate
bun run dev
```

Frontend:
```bash
cd app
npm install
npm run dev
```

## Build and Test

Frontend build:
```bash
cd app && npm run build
```

Backend tests:
```bash
cd backend && bun test
```

Deployment prep helper:
```bash
./deploy.sh
```

## Environment Variables

See:
- `backend/.env.example`
- `app/.env.example`

Key backend variables include:
- `OPENAI_API_KEY`
- `FAL_KEY` (or `FAL_API_KEY`)
- `XAI_API_KEY` (optional, for Grok image)
- `GOOGLE_CLIENT_ID` (optional, Google login)
- `ADMIN_ACCESS_KEY` (optional admin endpoints)
- `QUEUE_PROVIDER` (`auto`, `bullmq`, or `polling`)
- `REDIS_URL` (required when `QUEUE_PROVIDER=bullmq`)

Queue monitoring (admin key required):
- Bull Board (dark mode): `http://localhost:3010/admin/queues/board?adminKey=YOUR_ADMIN_ACCESS_KEY`
- HTML dashboard: `/api/admin/queues?adminKey=YOUR_ADMIN_ACCESS_KEY`
- JSON snapshot: `/api/admin/queues?format=json&adminKey=YOUR_ADMIN_ACCESS_KEY`

## Auth Model

The app uses bearer session tokens. Write operations require authentication. Upload/media access is account-scoped.
