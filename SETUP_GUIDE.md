# StreamAlert — Deployment & Setup Guide

## Project structure
```
streamalert/
├── main.py              ← FastAPI backend (the one you got)
├── requirements.txt
├── render.yaml          ← Render deployment config
├── .env                 ← local only, never commit
└── frontend/            ← GitHub Pages static site (React build)
    └── StreamAlert_Frontend.jsx
```

---

## 1. TMDB API key
1. Sign up free at https://www.themoviedb.org/signup
2. Go to Settings → API → Create API key (v3 auth)
3. Add to `.env` as `TMDB_API_KEY=...`

---

## 2. Telegram bot
1. Open Telegram, message `@BotFather`
2. Send `/newbot`, follow prompts → get your **bot token**
3. Add to `.env` as `TELEGRAM_BOT_TOKEN=...`
4. To get your own chat ID: message `@userinfobot`

---

## 3. Email (Gmail SMTP)
1. Enable 2FA on your Gmail account
2. Go to Google Account → Security → App Passwords → generate one
3. Add to `.env`:
   ```
   SMTP_USER=your@gmail.com
   SMTP_PASS=your_16_char_app_password
   ```

---

## 4. Neon PostgreSQL
1. Create a free project at https://neon.tech
2. Copy the connection string → add to `.env` as:
   ```
   DATABASE_URL=postgresql+asyncpg://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
   ```

---

## 5. requirements.txt
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
asyncpg==0.29.0
httpx==0.27.0
python-dotenv==1.0.1
apscheduler==3.10.4
aiosmtplib==3.0.1
python-telegram-bot==21.3
pydantic[email]==2.7.1
```

---

## 6. render.yaml (deploy to Render free tier)
```yaml
services:
  - type: web
    name: streamalert-api
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
```

---

## 7. Quick start (local)
```bash
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
uvicorn main:app --reload
```

---

## 8. API endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /users | Register with preferences |
| PUT | /users/{id} | Update preferences |
| GET | /users/{id} | Get user preferences |
| GET | /releases | Preview releases (for frontend) |
| POST | /scan | Manually trigger scan |

### Example: register a user
```bash
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@email.com",
    "telegram_id": "@yourusername",
    "platforms": ["netflix", "prime", "hbo"],
    "languages": ["English", "Hindi"],
    "types": ["Movies", "Series"],
    "freq": "instant",
    "notify_new": true,
    "notify_soon": true
  }'
```

---

## 9. Cron schedule
The scheduler runs automatically inside the FastAPI process:
- **08:00 UTC** — daily_scan() fetches new releases and sends instant alerts
- **09:00 UTC** — send_digests() flushes queued messages for digest users

On Render's free tier, the service sleeps after inactivity. Use UptimeRobot to ping `/docs`
every 14 minutes to keep it awake. Note: this counts toward your monthly hours.
For the cron to be reliable, consider upgrading to Render's $7/mo Starter plan or
using a GitHub Actions scheduled workflow as an alternative free cron.

---

## 10. GitHub Actions alternative cron (free)
Create `.github/workflows/scan.yml`:
```yaml
name: Daily OTT scan
on:
  schedule:
    - cron: '0 8 * * *'   # 08:00 UTC
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger scan
        run: curl -X POST https://your-app.onrender.com/scan
```
This wakes the Render service and triggers the scan externally — no UptimeRobot needed.

---

## Country note
The code defaults to `NL` (Netherlands) for watch provider lookups.
Change `"NL"` in `get_watch_providers()` to `"IN"` to also check Indian availability.
You can pass both and union the results.
