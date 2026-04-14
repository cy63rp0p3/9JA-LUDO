# Naija Ludo (4-Player Online)

Realtime Ludo web app with private room codes, guest players, and custom capture rules.

## Tech Stack

- `frontend`: Next.js + React + Socket.IO client
- `backend`: Express + Socket.IO server (authoritative game engine)
- `shared`: shared TypeScript types

## Custom Rules Implemented

- No safe spaces.
- Captured enemy token returns to base.
- Capturing token immediately reaches home (counts as one finished token).

## Local Development

1. Install dependencies:
   - `npm install`
2. Run backend:
   - `npm run dev --workspace backend`
3. In another terminal, run frontend:
   - `npm run dev --workspace frontend`
4. Open `http://localhost:3000`.

## Environment Variables

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### Backend (`backend/.env`)

```env
PORT=4000
```

## Deploy (Vercel + Render/Railway)

### Frontend on Vercel

1. Import project on Vercel.
2. Set Root Directory to `frontend`.
3. Add env var: `NEXT_PUBLIC_BACKEND_URL` to your deployed backend URL.
4. Build command: `npm run build`.

### Backend on Render/Railway

1. Create a new Node web service from repo.
2. Set Root Directory to `backend`.
3. Build command: `npm install && npm run build`.
4. Start command: `node dist/index.js`.
5. Add env var `PORT` if your platform requires it.

## Test

- Run backend tests:
  - `npm run test --workspace backend`
