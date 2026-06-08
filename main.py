"""
CineAlert - OTT Release Tracker
FastAPI + TMDB + Neon PostgreSQL + Telegram + Email alerts

Setup:
  pip install -r requirements.txt

Environment variables (.env):
  DATABASE_URL=postgresql+asyncpg://user:pass@neon-host/dbname
  TMDB_API_KEY=your_tmdb_v3_key
  TELEGRAM_BOT_TOKEN=your_bot_token
  RESEND_API_KEY=re_xxxxxxxxxxxx
  RESEND_FROM=CineAlert <you@yourdomain.com>
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
from telegram import Bot

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_KEY   = os.getenv("TMDB_API_KEY")
DB_URL     = os.getenv("DATABASE_URL")
TG_TOKEN      = os.getenv("TELEGRAM_BOT_TOKEN")
RESEND_KEY    = os.getenv("RESEND_API_KEY")
RESEND_FROM   = os.getenv("RESEND_FROM", "CineAlert <onboarding@resend.dev>")

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
    "Kannada": "kn", "Korean": "ko", "Japanese": "ja", "Malayalam": "ml",
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
PROVIDER_NAMES = {
    # Global
    "8":   "Netflix",
    "9":   "Prime Video",
    "337": "Disney+",
    "350": "Apple TV+",
    "384": "HBO Max",
    # India
    "122": "Jio Hotstar",   # Disney+ Hotstar IN
    "232": "Zee5",
    "237": "SonyLIV",
    "11":  "MUBI",
    "531": "Paramount+",
    "257": "SunNXT",
    "315": "Apple TV+",     # alternate Apple ID in some regions
}

@app.get("/releases")
async def get_releases(languages: str = "", platforms: str = "", days_ahead: int = 30, media_type: str = "movie"):
    """Preview upcoming releases via TMDB (used by frontend)."""
    lang_list = languages.split(",") if languages else MY_LANGUAGES
    lang_codes = [LANG_MAP.get(l.strip(), "en") for l in lang_list if l.strip()]
    if not lang_codes:
        lang_codes = ["en"]

    # Fetch all languages concurrently — 5 results per language so every language is represented
    per_lang = 10  # fetch up to 10 per language; frontend filters handle the rest
    async with httpx.AsyncClient() as client:
        tasks = [fetch_upcoming(client, media_type, lc, days_ahead, limit=per_lang) for lc in lang_codes]
        lang_results = await asyncio.gather(*tasks)

    # Interleave results (round-robin) so no single language dominates
    merged, seen_ids = [], set()
    for slot in range(per_lang):
        for lang_res in lang_results:
            if slot < len(lang_res):
                item = lang_res[slot]
                if item["tmdb_id"] not in seen_ids:
                    seen_ids.add(item["tmdb_id"])
                    merged.append(item)

    results = merged  # no cap — frontend has filters

    # Fetch provider info for all items concurrently
    media_path = "movie" if media_type in ("movie", "Movies") else "tv"
    async with httpx.AsyncClient() as client:
        provider_tasks = [get_watch_providers(client, item["tmdb_id"], media_type) for item in results]
        all_providers = await asyncio.gather(*provider_tasks)

    for item, provider_ids in zip(results, all_providers):
        item["platforms"] = [PROVIDER_NAMES[pid] for pid in provider_ids if pid in PROVIDER_NAMES]
        item["tmdb_url"] = f"https://www.themoviedb.org/{media_path}/{item['tmdb_id']}"

    return {"releases": results}

@app.get("/released")
async def get_released(languages: str = "", media_type: str = "movie", from_year: int = 2020):
    """Already-released titles from from_year up to today, per selected languages."""
    lang_list = languages.split(",") if languages else MY_LANGUAGES
    lang_codes = [LANG_MAP.get(l.strip(), "en") for l in lang_list if l.strip()]
    if not lang_codes:
        lang_codes = ["en"]

    async with httpx.AsyncClient() as client:
        tasks = [fetch_released(client, media_type, lc, from_year) for lc in lang_codes]
        lang_results = await asyncio.gather(*tasks)

    # Interleave round-robin so no language dominates
    max_len = max((len(r) for r in lang_results), default=0)
    merged, seen_ids = [], set()
    for slot in range(max_len):
        for lang_res in lang_results:
            if slot < len(lang_res):
                item = lang_res[slot]
                if item["tmdb_id"] not in seen_ids:
                    seen_ids.add(item["tmdb_id"])
                    merged.append(item)

    media_path = "movie" if media_type in ("movie", "Movies") else "tv"
    sem = asyncio.Semaphore(10)

    async def _get_providers_safe(client, tmdb_id, media_type):
        async with sem:
            return await get_watch_providers(client, tmdb_id, media_type)

    async with httpx.AsyncClient() as client:
        all_providers = await asyncio.gather(
            *[_get_providers_safe(client, item["tmdb_id"], media_type) for item in merged]
        )

    for item, provider_ids in zip(merged, all_providers):
        item["platforms"] = [PROVIDER_NAMES[pid] for pid in provider_ids if pid in PROVIDER_NAMES]
        item["tmdb_url"] = f"https://www.themoviedb.org/{media_path}/{item['tmdb_id']}"

    return {"releases": merged}


async def fetch_released(client: httpx.AsyncClient, media_type: str, lang: str, from_year: int = 2020, pages: int = 3):
    """Fetch already-released titles sorted by release date descending, 2 pages per language."""
    from_date = f"{from_year}-01-01"
    to_date = date.today().isoformat()
    endpoint = f"{TMDB_BASE}/discover/{'movie' if media_type in ('movie', 'Movies') else 'tv'}"
    results = []
    for page in range(1, pages + 1):
        params = {
            "api_key": TMDB_KEY,
            "with_original_language": lang,
            "primary_release_date.gte": from_date,
            "primary_release_date.lte": to_date,
            "sort_by": "primary_release_date.desc",
            "vote_count.gte": 10,   # skip obscure/unrated entries
            "region": "IN",
            "page": page,
        }
        try:
            r = await client.get(endpoint, params=params, timeout=10)
            r.raise_for_status()
            data = r.json()
            for item in data.get("results", []):
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
            if page >= data.get("total_pages", 1):
                break
        except Exception:
            break
    return results


@app.post("/scan")
async def trigger_scan():
    """Manually trigger a release scan."""
    await daily_scan()
    return {"status": "scan complete"}


# ── TMDB helpers ──────────────────────────────────────────────────────────────
async def fetch_upcoming(client: httpx.AsyncClient, media_type: str, lang: str, days_ahead: int, limit: int = 5):
    today = date.today()
    future = today + timedelta(days=days_ahead)
    params = {
        "api_key": TMDB_KEY,
        "with_original_language": lang,
        "primary_release_date.gte": today.isoformat(),
        "primary_release_date.lte": future.isoformat(),
        "sort_by": "popularity.desc",
        "region": "IN",
        "page": 1,
    }
    endpoint = f"{TMDB_BASE}/discover/{'movie' if media_type in ('movie', 'Movies') else 'tv'}"
    r = await client.get(endpoint, params=params, timeout=10)
    r.raise_for_status()
    data = r.json()
    results = []
    for item in data.get("results", [])[:limit]:
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
    """Return provider IDs available in IN or US region."""
    endpoint = f"{TMDB_BASE}/{'movie' if media_type in ('movie', 'Movies') else 'tv'}/{tmdb_id}/watch/providers"
    r = await client.get(endpoint, params={"api_key": TMDB_KEY}, timeout=10)
    if r.status_code != 200:
        return []
    all_regions = r.json().get("results", {})
    # Prefer IN (India) — covers Hotstar, Zee5, SonyLIV; fall back to US
    region_data = all_regions.get("IN") or all_regions.get("US") or {}
    providers = region_data.get("flatrate", []) + region_data.get("free", []) + region_data.get("ads", [])
    seen, ids = set(), []
    for p in providers:
        pid = str(p["provider_id"])
        if pid not in seen:
            seen.add(pid)
            ids.append(pid)
    return ids


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


# ── Email (Resend) ────────────────────────────────────────────────────────────
async def send_email(to: str, subject: str, body: str):
    if not RESEND_KEY:
        return
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_KEY}", "Content-Type": "application/json"},
            json={
                "from": RESEND_FROM,
                "to": [to],
                "subject": subject,
                "html": f"<pre style='font-family:sans-serif;white-space:pre-wrap'>{body}</pre>",
            },
            timeout=10,
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
