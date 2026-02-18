# Afrobeats Seattle Documentary

An interactive timeline webapp documenting the rise of Afrobeats in Seattle from 2012-2026.

## Features

- **Interactive Timeline**: Click through years 2012-2026 to explore stories
- **Story Cards**: Beautiful cards with dock-style hover effects
- **Media Support**: Upload and display images, YouTube videos
- **Story Web**: Network visualization showing connections between stories
- **Email Subscriptions**: Collect subscriber emails for documentary updates
- **Access Control**: Protected create/edit with account-based authentication

## Quick Start

## Node Version

This project targets Node.js 22.12.0. If you use nvm:

```bash
nvm use
```

### Option 1: Use the start script
```bash
./start.sh
```

This starts both backend (port 3001) and frontend (port 5173).

### Option 2: Manual start

**Terminal 1 - Backend:**
```bash
cd backend
node server.js
```

**Terminal 2 - Frontend:**
```bash
cd app
npm install
npm run dev
```

## Authentication

To add or edit stories/projects, sign in with an account session (email/password or Google login).

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/anecdotes` | GET | No | List all stories |
| `/api/anecdotes` | POST | Yes | Create new story |
| `/api/anecdotes/:id` | PUT | Yes | Update story |
| `/api/anecdotes/:id` | DELETE | Yes | Delete story |
| `/api/upload` | POST | Yes | Upload image |
| `/api/subscribe` | POST | No | Subscribe email |
| `/api/subscribers` | GET | Yes | List subscribers |
| `/api/subscribers/export` | GET | Yes | Export CSV |

## Data Storage

- **Stories**: `backend/data/anecdotes.json`
- **Subscribers**: `backend/data/subscribers.json`
- **Uploads**: `backend/uploads/`

## Deployment

### Build for production:
```bash
./deploy.sh
```

### Deploy frontend:
The built frontend is in `app/dist/`. Serve it with any static file server:

**Vercel:**
```bash
cd app/dist
vercel --prod
```

**Netlify:**
```bash
cd app/dist
netlify deploy --prod
```

**Nginx:**
```nginx
server {
    listen 80;
    root /path/to/app/dist;
    try_files $uri $uri/ /index.html;
}
```

### Deploy backend:
The backend is a simple Node.js server. Deploy to any VPS or platform:

**Railway/Render/Heroku:**
- Set `PORT` environment variable
- Start command: `node backend/server.js`

**PM2:**
```bash
pm2 start backend/server.js --name afrobeats-api
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Backend server port |
| `GOOGLE_CLIENT_ID` | (empty) | Google OAuth client id for Google sign-in |

## Project Structure

```
├── app/                    # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── sections/       # Page sections
│   │   ├── context/        # React contexts
│   │   └── services/       # API services
│   └── dist/               # Built frontend
├── backend/
│   ├── server.js           # Backend server
│   ├── package.json        # Backend package
│   ├── data/               # Data files
│   │   ├── anecdotes.json  # Stories data
│   │   └── subscribers.json
│   └── uploads/            # Image uploads
├── deploy.sh               # Deployment script
└── start.sh                # Development start script
```

## License

MIT
