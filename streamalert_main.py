"""
StreamAlert - OTT Release Tracker
FastAPI + TMDB + Neon PostgreSQL + Telegram + Email alerts

Setup:
  pip install fastapi uvicorn asyncpg httpx python-dotenv apscheduler
  pip install aiosmtplib python-telegram-bot

Environment variables (.env):
  DATABASE_URL=postgresql+asyncpg://user:pass@neon-host/dbname
  TMDB_API_KEY=your_tmdb_v3_key
  TELEGRAM_BOT_TOKEN=your_bot_token
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your@gmail.com
  SMTP_PASS=your_app_password
  SECRET_KEY=any_random_string
"""

import os
import asyncio
from datetime import date, timedelta
from contextlib import asynccontextmanager
from typing import Optional

import httpx
import asyncpg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
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

# TMDB language codes → human-readable map
LANG_MAP = {
    "English": "en", "Hindi": "hi", "Dutch": "nl", "Tamil": "ta",
    "Telugu": "te", "Korean": "ko", "Spanish": "es", "Japanese": "ja",
    "French": "fr", "German": "de",
}

# TMDB watch provider IDs (Netflix=8, Prime=9, Disney+=337, Apple=350, HBO=384, Hotstar=122)
PLATFORM_IDS = {
    "netflix": 8, "prime": 9, "disney": 337, "apple": 350, "hbo": 384, "hotstar": 122
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
        CREATE TABLE IF NOT EXISTS users (
            id          SERIAL PRIMARY KEY,
            email       TEXT UNIQUE,
            telegram_id TEXT,
            platforms   TEXT[]  DEFAULT '{}',
            languages   TEXT[]  DEFAULT '{}',
            types       TEXT[]  DEFAULT '{}',
            freq        TEXT    DEFAULT 'instant',   -- instant | daily | weekly
            notify_new  BOOLEAN DEFAULT TRUE,
            notify_soon BOOLEAN DEFAULT TRUE,
            notify_trailer BOOLEAN DEFAULT FALSE,
            created_at  TIMESTAMPTZ DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS seen_releases (
            tmdb_id     INT,
            media_type  TEXT,
            user_id     INT REFERENCES users(id),
            notified_at TIMESTAMPTZ DEFAULT now(),
            PRIMARY KEY (tmdb_id, media_type, user_id)
        );
        CREATE TABLE IF NOT EXISTS digest_queue (
            id          SERIAL PRIMARY KEY,
            user_id     INT REFERENCES users(id),
            message     TEXT,
            queued_at   TIMESTAMPTZ DEFAULT now()
        );
        """)


# ── Lifespan (startup/shutdown) ───────────────────────────────────────────────
scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    scheduler.add_job(daily_scan, "cron", hour=8, minute=0)   # 08:00 UTC daily
    scheduler.add_job(send_digests, "cron", hour=9, minute=0) # 09:00 UTC daily
    scheduler.start()
    yield
    scheduler.shutdown()
    if pool:
        await pool.close()

app = FastAPI(title="StreamAlert API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# ── Pydantic schemas ──────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: Optional[str] = None
    telegram_id: Optional[str] = None
    platforms: list[str] = ["netflix", "prime"]
    languages: list[str] = ["English", "Hindi"]
    types: list[str] = ["Movies", "Series"]
    freq: str = "instant"
    notify_new: bool = True
    notify_soon: bool = True
    notify_trailer: bool = False

class UserUpdate(UserCreate):
    pass


# ── API Routes ────────────────────────────────────────────────────────────────
@app.post("/users", status_code=201)
async def create_user(body: UserCreate):
    p = await get_pool()
    async with p.acquire() as conn:
        try:
            row = await conn.fetchrow("""
                INSERT INTO users (email, telegram_id, platforms, languages, types, freq,
                                   notify_new, notify_soon, notify_trailer)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                RETURNING id
            """, body.email, body.telegram_id, body.platforms, body.languages,
                body.types, body.freq, body.notify_new, body.notify_soon, body.notify_trailer)
            return {"id": row["id"], "status": "created"}
        except asyncpg.UniqueViolationError:
            raise HTTPException(409, "Email already registered")

@app.put("/users/{user_id}")
async def update_user(user_id: int, body: UserUpdate):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute("""
            UPDATE users SET email=$1, telegram_id=$2, platforms=$3, languages=$4,
            types=$5, freq=$6, notify_new=$7, notify_soon=$8, notify_trailer=$9
            WHERE id=$10
        """, body.email, body.telegram_id, body.platforms, body.languages,
            body.types, body.freq, body.notify_new, body.notify_soon, body.notify_trailer,
            user_id)
    return {"status": "updated"}

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    p = await get_pool()
    async with p.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE id=$1", user_id)
        if not row:
            raise HTTPException(404, "User not found")
        return dict(row)

@app.get("/releases")
async def get_releases(languages: str = "English,Hindi", platforms: str = "netflix,prime",
                       days_ahead: int = 30, media_type: str = "movie"):
    """Preview upcoming releases via TMDB (used by frontend)."""
    lang_codes = [LANG_MAP.get(l, "en") for l in languages.split(",")]
    results = []
    async with httpx.AsyncClient() as client:
        for lang_code in lang_codes[:3]:  # cap to 3 langs per call
            data = await fetch_upcoming(client, media_type, lang_code, days_ahead)
            results.extend(data)
    return {"releases": results[:30]}

@app.post("/scan")
async def trigger_scan():
    """Manually trigger a release scan (for testing)."""
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
    endpoint = f"{TMDB_BASE}/discover/{'movie' if media_type == 'Movies' else 'tv'}"
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
    """Return list of platform IDs (as strings) available in NL."""
    endpoint = f"{TMDB_BASE}/{'movie' if media_type == 'Movies' else 'tv'}/{tmdb_id}/watch/providers"
    r = await client.get(endpoint, params={"api_key": TMDB_KEY}, timeout=10)
    if r.status_code != 200:
        return []
    data = r.json().get("results", {}).get("NL", {})  # Netherlands — change to IN for India
    providers = data.get("flatrate", []) + data.get("free", [])
    return [str(p["provider_id"]) for p in providers]


# ── Daily scan ────────────────────────────────────────────────────────────────
async def daily_scan():
    """Fetch new/upcoming releases per user preferences and send alerts."""
    p = await get_pool()
    async with p.acquire() as conn:
        users = await conn.fetch("SELECT * FROM users")

    async with httpx.AsyncClient() as client:
        for user in users:
            user_id = user["id"]
            seen_ids = set()
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT tmdb_id, media_type FROM seen_releases WHERE user_id=$1", user_id
                )
                seen_ids = {(r["tmdb_id"], r["media_type"]) for r in rows}

            new_releases = []
            for media_type in user["types"]:
                for lang_name in user["languages"]:
                    lang_code = LANG_MAP.get(lang_name, "en")
                    items = await fetch_upcoming(client, media_type, lang_code, 7)
                    for item in items:
                        key = (item["tmdb_id"], media_type)
                        if key in seen_ids:
                            continue
                        # Check watch provider matches user's platforms
                        providers = await get_watch_providers(client, item["tmdb_id"], media_type)
                        wanted = [str(PLATFORM_IDS[pl]) for pl in user["platforms"] if pl in PLATFORM_IDS]
                        if any(p in providers for p in wanted):
                            item["provider_ids"] = providers
                            new_releases.append(item)
                            seen_ids.add(key)

            if not new_releases:
                continue

            # Record as seen
            async with pool.acquire() as conn:
                await conn.executemany(
                    "INSERT INTO seen_releases (tmdb_id, media_type, user_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
                    [(r["tmdb_id"], r["media_type"], user_id) for r in new_releases]
                )

            message = format_message(new_releases)

            if user["freq"] == "instant":
                await dispatch_alert(user, message)
            else:
                # Queue for digest
                async with pool.acquire() as conn:
                    await conn.execute(
                        "INSERT INTO digest_queue (user_id, message) VALUES ($1,$2)",
                        user_id, message
                    )


def format_message(releases: list[dict]) -> str:
    lines = ["🎬 *StreamAlert — New releases for you!*\n"]
    for r in releases[:10]:
        date_str = r.get("release_date", "TBA")
        lines.append(f"• *{r['title']}* ({r['media_type']}) — {date_str}")
        if r.get("overview"):
            lines.append(f"  _{r['overview'][:100]}..._")
    return "\n".join(lines)


async def dispatch_alert(user: dict, message: str):
    if user["telegram_id"]:
        await send_telegram(user["telegram_id"], message)
    if user["email"]:
        await send_email(user["email"], "StreamAlert: New releases for you!", message)


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


# ── Digest sender (09:00 daily) ───────────────────────────────────────────────
async def send_digests():
    p = await get_pool()
    async with p.acquire() as conn:
        rows = await conn.fetch("""
            SELECT dq.user_id, u.email, u.telegram_id, u.freq,
                   string_agg(dq.message, chr(10)) AS combined_msg
            FROM digest_queue dq
            JOIN users u ON u.id = dq.user_id
            WHERE u.freq IN ('daily', 'weekly')
            GROUP BY dq.user_id, u.email, u.telegram_id, u.freq
        """)
        for row in rows:
            user = dict(row)
            await dispatch_alert(user, user["combined_msg"])
        await conn.execute("DELETE FROM digest_queue WHERE user_id = ANY($1)",
                           [r["user_id"] for r in rows])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
