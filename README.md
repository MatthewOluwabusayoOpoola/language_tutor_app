# 🇹🇷 Turkish Practice App

A pronunciation-based Turkish language learning app. The app speaks a line, you repeat it, your pronunciation is scored, and you advance only when you pass.

---

## Architecture

- **Frontend**: React + TypeScript (Vite) → deployed on Vercel
- **Backend**: NestJS → deployed on Railway/Fly.io
- **Database**: PostgreSQL (Railway)
- **Cache**: Redis (Railway) — TTS audio cache
- **APIs**: Google Cloud Text-to-Speech (WaveNet tr-TR) + Google Cloud Speech-to-Text

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL running locally
- Redis running locally
- Google Cloud project with TTS + STT APIs enabled
- A `google-credentials.json` service account key file

---

### Backend

```bash
cd turkish-backend
npm install

# Copy env and fill in your values
cp .env .env.local
# Edit DATABASE_URL, REDIS_URL, JWT_SECRET, GOOGLE_APPLICATION_CREDENTIALS

# Run database migrations (auto-sync is on for dev)
npm run start:dev

# Seed countries and cities
npx ts-node src/seed.ts
```

The backend runs on `http://localhost:3000`.

---

### Frontend

```bash
cd turkish-frontend
npm install

# Edit .env if backend URL differs
npm run dev
```

The frontend runs on `http://localhost:5173`.

### Browser requirements

- The app uses the browser Web Speech APIs for best realtime experience:
  - `speechSynthesis` (Text-to-Speech) — widely supported in modern browsers.
  - `SpeechRecognition` / `webkitSpeechRecognition` (Speech-to-Text) — supported
    in Chromium-based browsers (Chrome, Edge) on desktop and Android. Safari
    and some other browsers may not support `SpeechRecognition`.
- If `SpeechRecognition` is unavailable the app falls back to recording audio
  and sending it to the backend for transcription; this may be slower and
  requires microphone permission.
- Recommendation: use the latest Chrome or Edge for the best speech support.

---

## Environment Variables

### Backend `.env`

| Variable                         | Description                         |
| -------------------------------- | ----------------------------------- |
| `DATABASE_URL`                   | PostgreSQL connection string        |
| `REDIS_URL`                      | Redis connection string             |
| `JWT_SECRET`                     | Secret key for JWT signing          |
| `JWT_EXPIRES_IN`                 | Token expiry e.g. `7d`              |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google service account JSON |
| `PORT`                           | Server port (default 3000)          |
| `FRONTEND_URL`                   | Allowed CORS origin                 |

### Frontend `.env`

| Variable       | Description           |
| -------------- | --------------------- |
| `VITE_API_URL` | Backend REST base URL |
| `VITE_WS_URL`  | Backend WebSocket URL |

---

## Conversation Modes

| Mode              | Unlock condition                           |
| ----------------- | ------------------------------------------ |
| Normal (Everyday) | Available from Day 1                       |
| Romantic          | Unlocks after completing all 3 Normal days |

---

## Scoring

Pronunciation is scored using:

- **60%** — Normalised Levenshtein character similarity
- **40%** — Word-level overlap

Minimum passing score: **0.6 (60%)**.

---

## Deployment

### Backend → Railway

1. Push `turkish-backend/` to GitHub
2. Create Railway project → connect repo
3. Add PostgreSQL + Redis plugins
4. Set all env vars in Railway dashboard
5. Deploy — `railway.json` handles the rest

### Frontend → Vercel

1. Push `turkish-frontend/` to GitHub
2. Import project in Vercel
3. Set `VITE_API_URL` and `VITE_WS_URL` to your Railway backend URL
4. Deploy — `vercel.json` handles SPA routing

---

## Seeding Data

Run once after first deploy to populate countries and cities:

```bash
npx ts-node src/seed.ts
```

This seeds 15 countries and 19 cities with correct Turkish grammatical forms.
