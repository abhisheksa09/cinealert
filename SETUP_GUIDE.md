# CineAlert — Deployment & Setup Guide

## Project structure
```
cinealert/
├── main.py              ← FastAPI backend (API + weekly digest)
├── requirements.txt
├── runtime.txt          ← Python version for Render
├── render.yaml          ← Render deployment config for the backend
├── .env                 ← local only, never commit
├── .github/workflows/
│   ├── deploy-backend.yml  ← triggers a Render deploy when backend files change
│   └── weekly-digest.yml   ← Saturday 07:50 UTC: wakes Render, sends the digest
└── frontend/            ← React + Vite app (hosted on Render, auto-deploys from main)
    └── src/CineAlert.jsx   ← the whole UI
```

---

## 1. TMDB API key
1. Sign up free at https://www.themoviedb.org/signup
2. Go to Settings → API → Create API key (v3 auth)
3. Add to `.env` as `TMDB_API_KEY=...`

---

## 2. Streaming "coming soon" data
The **Coming to OTT** tab is filled from two providers (cached in the DB, refreshed every 24h):

| Env var | Provider | Platforms |
|---|---|---|
| `WATCHMODE_API_KEY` | https://api.watchmode.com | Netflix, Prime Video, Disney+, Apple TV+, HBO Max |
| `MOTN_API_KEY` | RapidAPI — Streaming Availability (Movie of the Night) | Jio Hotstar, Zee5, SonyLIV |

If `MOTN_API_KEY` is missing or out of quota, Hotstar / Zee5 / SonyLIV show no titles.

---

## 3. Telegram bot
1. Open Telegram, message `@BotFather`
2. Send `/newbot`, follow prompts → get your **bot token**
3. Add to `.env` as `TELEGRAM_BOT_TOKEN=...`
4. To get your own chat ID: message `@userinfobot` → `MY_TELEGRAM_ID=...`

---

## 4. Email (Resend)
1. Create an account at https://resend.com and generate an API key
2. Add to `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   RESEND_FROM=CineAlert <you@yourdomain.com>   # optional, defaults to onboarding@resend.dev
   MY_EMAIL=you@example.com
   ```

---

## 5. Neon PostgreSQL
1. Create a free project at https://neon.tech
2. Copy the connection string → add to `.env` as:
   ```
   DATABASE_URL=postgresql+asyncpg://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
   ```
Tables (`seen_releases`, `streaming_cache`, `api_cache`) are created automatically on startup.

---

## 6. Digest preferences (env)
```
MY_PLATFORMS=netflix,prime,hbo
MY_LANGUAGES=English,Hindi
MY_TYPES=Movies,Series
```

---

## 7. Quick start (local)
```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload          # backend on :8000

cd frontend && npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

---

## 8. API endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Liveness ping (used for cold-start detection) |
| GET | /releases | Upcoming theatrical releases — `languages`, `media_type` (movie/tv) |
| GET | /released | Already released since `from_year` — `languages`, `media_type` |
| GET | /streaming-upcoming | Titles arriving on OTT soon — `platforms` |
| POST | /weekly-digest | Build & send the weekend digest (email + Telegram) |
| POST | /scan | Manually trigger a release scan |

---

## 9. Scheduling
Render's free tier sleeps when idle, so the weekly digest is triggered by the
`weekly-digest.yml` GitHub Action (Saturday 07:50 UTC) rather than an in-process cron.
The workflow pings `/health` until the server is awake, then POSTs `/weekly-digest`.

GitHub disables scheduled workflows after 60 days without repo activity; the workflow
re-enables itself on every run to prevent that.

---

## Region note
Watch providers are looked up for India (`IN`) first, falling back to `US`.
