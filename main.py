"""
CineAlert - OTT Release Tracker
FastAPI + TMDB + Neon PostgreSQL + Telegram + Email alerts

Setup:
  pip install -r requirements.txt

Environment variables (.env):
  DATABASE_URL=postgresql+asyncpg://user:pass@neon-host/dbname
  TMDB_API_KEY=your_tmdb_v3_key
  TELEGRAM_BOT_TOKEN=your_bot_token
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your@gmail.com
  SMTP_PASS=your_app_password
  MY_PLATFORMS=netflix,prime,hbo
  MY_LANGUAGES=English,Hindi
  MY_TYPES=Movies,Series
  MY_EMAIL=you@gmail.com
  MY_TELEGRAM_ID=@yourhandle
  MY_ALERT_FREQ=instant
  MY_NOTIFY_NEW=true
  MY_NOTIFY_SOON=true
  MY_NOTIFY_TRAILER=false
"""

import os
import asyncio
from datetime import date, timedelta
from contextlib import asynccontextmanager

import httpx
import asyncpg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import aiosmtplib
from email.message import EmailMessage
from telegram import Bot

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_KEY   = os.getenv("TMDB_API_KEY")
DB_URL     = os.getenv("DATABASE_URL")
TG_TOKEN   = os.getenv("TELEGRAM_BOT_TOKEN")
SMTP_HOST  = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT  = int(os.getenv("SMTP_PORT", 587))
SMTP_USER  = os.getenv("SMTP_USER")
SMTP_PASS  = os.getenv("SMTP_PASS")

# Single-user prefs from env
MY_PLATFORMS     = [p.strip() for p in os.getenv("MY_PLATFORMS", "netflix,prime").split(",")]
MY_LANGUAGES     = [l.strip() for l in os.getenv("MY_LANGUAGES", "English,Hindi").split(",")]
MY_TYPES         = [t.strip() for t in os.getenv("MY_TYPES", "Movies,Series").split(",")]
MY_EMAIL         = os.getenv("MY_EMAIL")
MY_TELEGRAM_ID   = os.getenv("MY_TELEGRAM_ID")
MY_ALERT_FREQ    = os.getenv("MY_ALERT_FREQ", "instant")   # instant | daily | weekly
MY_NOTIFY_NEW    = os.getenv("MY_NOTIFY_NEW", "true").lower() == "true"
MY_NOTIFY_SOON   = os.getenv("MY_NOTIFY_SOON", "true").lower() == "true"
MY_NOTIFY_TRAILER = os.getenv("MY_NOTIFY_TRAILER", "false").lower() == "true"

LANG_MAP = {
    "English": "en", "Hindi": "hi", "Tamil": "ta", "Telugu": "te",
    "Kannada": "kn", "Korean": "ko", "Japanese": "ja",
}

PLATFORM_IDS = {
    "netflix": 8, "prime": 9, "disney": 337, "apple": 350,
    "hbo": 384, "hotstar": 122, "zee5": 232, "sonyliv": 237,
}


# ── DB Pool ───────────────────────────────────────────────────────────────────
pool: asyncpg.Pool = None

async def get_pool():
    global pool
    if not pool:
        pool = await asyncpg.create_pool(DB_URL.replace("postgresql+asyncpg", "postgresql"))
    return pool

async def init_db():
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute("""
        CREATE TABLE IF NOT EXISTS seen_releases (
            tmdb_id     INT,
            media_type  TEXT,
            notified_at TIMESTAMPTZ DEFAULT now(),
            PRIMARY KEY (tmdb_id, media_type)
        );
        """)


# ── Lifespan (startup/shutdown) ───────────────────────────────────────────────
scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    scheduler.add_job(daily_scan, "cron", hour=8, minute=0)
    scheduler.start()
    yield
    scheduler.shutdown()
    if pool:
        await pool.close()

app = FastAPI(title="CineAlert API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ── API Routes ────────────────────────────────────────────────────────────────
@app.get("/releases")
async def get_releases(languages: str = "", platforms: str = "", days_ahead: int = 30, media_type: str = "movie"):
    """Preview upcoming releases via TMDB (used by frontend)."""
    lang_list = languages.split(",") if languages else MY_LANGUAGES
    lang_codes = [LANG_MAP.get(l.strip(), "en") for l in lang_list]
    results = []
    async with httpx.AsyncClient() as client:
        for lang_code in lang_codes[:3]:
            data = await fetch_upcoming(client, media_type, lang_code, days_ahead)
            results.extend(data)
    return {"releases": results[:30]}

@app.post("/scan")
async def trigger_scan():
    """Manually trigger a release scan."""
    await daily_scan()
    return {"status": "scan complete"}


# ── TMDB helpers ──────────────────────────────────────────────────────────────
async def fetch_upcoming(client: httpx.AsyncClient, media_type: str, lang: str, days_ahead: int):
    today = date.today()
    future = today + timedelta(days=days_ahead)
    params = {
        "api_key": TMDB_KEY,
        "with_original_language": lang,
        "primary_release_date.gte": today.isoformat(),
        "primary_release_date.lte": future.isoformat(),
        "sort_by": "popularity.desc",
        "page": 1,
    }
    endpoint = f"{TMDB_BASE}/discover/{'movie' if media_type in ('movie', 'Movies') else 'tv'}"
    r = await client.get(endpoint, params=params, timeout=10)
    r.raise_for_status()
    data = r.json()
    results = []
    for item in data.get("results", [])[:10]:
        results.append({
            "tmdb_id": item["id"],
            "title": item.get("title") or item.get("name"),
            "media_type": media_type,
            "language": lang,
            "release_date": item.get("release_date") or item.get("first_air_date"),
            "poster": f"https://image.tmdb.org/t/p/w185{item['poster_path']}" if item.get("poster_path") else None,
            "overview": item.get("overview", "")[:200],
            "rating": item.get("vote_average"),
        })
    return results

async def get_watch_providers(client: httpx.AsyncClient, tmdb_id: int, media_type: str) -> list[str]:
    """Return provider IDs available in NL region."""
    endpoint = f"{TMDB_BASE}/{'movie' if media_type in ('movie', 'Movies') else 'tv'}/{tmdb_id}/watch/providers"
    r = await client.get(endpoint, params={"api_key": TMDB_KEY}, timeout=10)
    if r.status_code != 200:
        return []
    data = r.json().get("results", {}).get("NL", {})
    providers = data.get("flatrate", []) + data.get("free", [])
    return [str(p["provider_id"]) for p in providers]


# ── Daily scan ────────────────────────────────────────────────────────────────
async def daily_scan():
    """Fetch new/upcoming releases based on env prefs and send alerts."""
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch("SELECT tmdb_id, media_type FROM seen_releases")
    seen_ids = {(r["tmdb_id"], r["media_type"]) for r in rows}

    new_releases = []
    async with httpx.AsyncClient() as client:
        for media_type in MY_TYPES:
            for lang_name in MY_LANGUAGES:
                lang_code = LANG_MAP.get(lang_name, "en")
                items = await fetch_upcoming(client, media_type, lang_code, 7)
                for item in items:
                    key = (item["tmdb_id"], media_type)
                    if key in seen_ids:
                        continue
                    providers = await get_watch_providers(client, item["tmdb_id"], media_type)
                    wanted = [str(PLATFORM_IDS[pl]) for pl in MY_PLATFORMS if pl in PLATFORM_IDS]
                    if any(pid in providers for pid in wanted):
                        item["provider_ids"] = providers
                        new_releases.append(item)
                        seen_ids.add(key)

    if not new_releases:
        return

    async with pool.acquire() as conn:
        await conn.executemany(
            "INSERT INTO seen_releases (tmdb_id, media_type) VALUES ($1,$2) ON CONFLICT DO NOTHING",
            [(r["tmdb_id"], r["media_type"]) for r in new_releases]
        )

    message = format_message(new_releases)
    await dispatch_alert(message)


def format_message(releases: list[dict]) -> str:
    lines = ["🎬 *CineAlert — New releases for you!*\n"]
    for r in releases[:10]:
        date_str = r.get("release_date", "TBA")
        lines.append(f"• *{r['title']}* ({r['media_type']}) — {date_str}")
        if r.get("overview"):
            lines.append(f"  _{r['overview'][:100]}..._")
    return "\n".join(lines)


async def dispatch_alert(message: str):
    if MY_TELEGRAM_ID:
        await send_telegram(MY_TELEGRAM_ID, message)
    if MY_EMAIL:
        await send_email(MY_EMAIL, "CineAlert: New releases for you!", message)


# ── Telegram ──────────────────────────────────────────────────────────────────
async def send_telegram(chat_id: str, text: str):
    if not TG_TOKEN:
        return
    bot = Bot(token=TG_TOKEN)
    await bot.send_message(chat_id=chat_id, text=text, parse_mode="Markdown")


# ── Email ─────────────────────────────────────────────────────────────────────
async def send_email(to: str, subject: str, body: str):
    if not SMTP_USER:
        return
    msg = EmailMessage()
    msg["From"] = SMTP_USER
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    msg.add_alternative(f"<pre>{body}</pre>", subtype="html")
    await aiosmtplib.send(msg, hostname=SMTP_HOST, port=SMTP_PORT,
                          username=SMTP_USER, password=SMTP_PASS, start_tls=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
