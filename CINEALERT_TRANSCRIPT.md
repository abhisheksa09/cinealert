# CineAlert — Project Transcript

## What it is
OTT release tracker that monitors new/upcoming content across Netflix, Prime Video, Disney+,
Apple TV+, HBO Max, and Hotstar — filtered by language — and sends Telegram + email alerts.

---

## Stack
- **Backend:** FastAPI + Python, deployed on Render
- **Database:** Neon PostgreSQL (single table only — seen_releases)
- **Scheduler:** APScheduler (cron inside FastAPI process)
- **Alerts:** Telegram Bot API + Gmail SMTP
- **Data source:** TMDB API (free)
- **Frontend:** React (GitHub Pages)

---

## What's done

### Backend (cinealert_main.py)
- [x] FastAPI app scaffold with lifespan, CORS
- [x] TMDB `/discover/movie` and `/discover/tv` integration with language + date filters
- [x] Watch provider lookup per title (TMDB `/watch/providers`) filtered to NL region
- [x] APScheduler: daily_scan() at 08:00 UTC, send_digests() at 09:00 UTC
- [x] Telegram alert via `python-telegram-bot`
- [x] Email alert via `aiosmtplib` (Gmail SMTP), instant + digest modes
- [x] `POST /scan` endpoint to manually trigger scan
- [x] `GET /releases` endpoint for frontend preview

### Database
- [x] Decided: Option 2 — single `seen_releases` table in Neon, prefs in `.env`
- [ ] Schema not yet refactored — still has old multi-user `users` table

### Frontend (CineAlert_Frontend.jsx)
- [x] Platform selector (Netflix, Prime, Disney+, Apple TV+, HBO Max, Hotstar)
- [x] Language selector (English, Hindi, Dutch, Tamil, Telugu, Korean, Spanish, Japanese)
- [x] Content type selector (Movies, Series, Documentaries, Anime)
- [x] Upcoming releases tab (demo data, wired to GET /releases)
- [x] Alert settings tab (Telegram chat ID, email, frequency toggle)
- [ ] Not yet wired to actual backend URL (hardcoded demo data)

### Repo
- [x] Pushed to GitHub as `cinealert`
- [x] GitHub Pages rendering frontend
- [x] Render deployment pending

---

## What's to be done

### 1. Refactor backend to single-user + no users table
- Remove `users` table, `UserCreate`/`UserUpdate` schemas, all `/users` routes
- Remove `digest_queue` table
- Read all prefs from `.env`:
  ```
  MY_PLATFORMS=netflix,prime,hbo
  MY_LANGUAGES=English,Hindi
  MY_TYPES=Movies,Series
  MY_EMAIL=you@gmail.com
  MY_TELEGRAM_ID=@yourhandle
  MY_ALERT_FREQ=instant        # instant | daily | weekly
  MY_NOTIFY_NEW=true
  MY_NOTIFY_SOON=true
  MY_NOTIFY_TRAILER=false
  ```
- Keep `seen_releases` table but remove `user_id` column:
  ```sql
  CREATE TABLE IF NOT EXISTS seen_releases (
      tmdb_id    INT,
      media_type TEXT,
      notified_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (tmdb_id, media_type)
  );
  ```
- daily_scan() reads prefs from env, checks seen_releases, sends alert, inserts seen

### 2. Wire frontend to backend
- Replace hardcoded demo releases with `GET /releases?languages=...&platforms=...`
- Point API base URL to Render service URL (use env var `VITE_API_URL` or hardcode)
- Save preferences form should call `POST /prefs` or just show a copy-paste `.env` snippet

### 3. requirements.txt
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
asyncpg==0.29.0
httpx==0.27.0
python-dotenv==1.0.1
apscheduler==3.10.4
aiosmtplib==3.0.1
python-telegram-bot==21.3
```

### 4. render.yaml
```yaml
services:
  - type: web
    name: cinealert-api
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: TMDB_API_KEY
        sync: false
      - key: TELEGRAM_BOT_TOKEN
        sync: false
      - key: SMTP_USER
        sync: false
      - key: SMTP_PASS
        sync: false
      - key: MY_PLATFORMS
        sync: false
      - key: MY_LANGUAGES
        sync: false
      - key: MY_EMAIL
        sync: false
      - key: MY_TELEGRAM_ID
        sync: false

### 5. GitHub Actions cron (replaces UptimeRobot)
File: .github/workflows/scan.yml
- Trigger: cron 0 8 * * * (08:00 UTC daily)
- Step: curl -X POST https://cinealert.onrender.com/scan
- This wakes Render free tier and triggers scan externally

### 6. Test checklist
- [ ] GET /releases returns real TMDB data
- [ ] POST /scan inserts into seen_releases
- [ ] Second POST /scan sends no duplicate alerts
- [ ] Telegram message received
- [ ] Email received
- [ ] GitHub Actions cron fires correctly
