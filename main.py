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
import json
from datetime import date, datetime, timedelta
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
TMDB_BASE        = "https://api.themoviedb.org/3"
TMDB_KEY         = os.getenv("TMDB_API_KEY")
WATCHMODE_API_KEY  = os.getenv("WATCHMODE_API_KEY")   # watchmode.com
MOTN_API_KEY       = os.getenv("MOTN_API_KEY")        # RapidAPI — Streaming Availability (MovieOfTheNight)

# Watchmode source IDs for global platforms
WATCHMODE_SOURCE_MAP = {
    "netflix": 203,
    "prime":   26,
    "disney":  372,
    "apple":   371,
    "hbo":     387,
}

# MovieOfTheNight catalog IDs — only Indian-exclusive platforms (saves quota)
MOTN_CATALOG_MAP = {
    "hotstar": "hotstar",
    "zee5":    "zee5",
    "sonyliv": "sonyliv",
}
# Platforms intentionally excluded from MOTN (covered by Watchmode instead)
# netflix, prime, disney, apple, hbo → Watchmode handles these
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

# TMDB language code → display name (for the digest)
LANG_NAMES = {
    "en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
    "kn": "Kannada", "ko": "Korean", "ja": "Japanese", "ml": "Malayalam",
    "es": "Spanish", "fr": "French", "de": "German", "it": "Italian",
    "zh": "Chinese", "pt": "Portuguese", "ru": "Russian",
}

# TMDB genre id → name (movie + TV genres)
GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
    878: "Sci-Fi", 53: "Thriller", 10752: "War", 37: "Western",
    10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality",
    10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics",
}


def lang_label(code: str) -> str:
    """Readable language name from a TMDB language code."""
    if not code:
        return ""
    return LANG_NAMES.get(code, code.upper())


def genre_labels(genre_ids, limit: int = 3) -> list:
    """Map TMDB genre ids → readable names (capped)."""
    names = [GENRE_MAP[g] for g in (genre_ids or []) if g in GENRE_MAP]
    return names[:limit]

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
        await conn.execute("""
        CREATE TABLE IF NOT EXISTS streaming_cache (
            id          SERIAL PRIMARY KEY,
            fetched_at  TIMESTAMPTZ DEFAULT now(),
            items       JSONB NOT NULL
        );
        """)
        await conn.execute("""
        CREATE TABLE IF NOT EXISTS api_cache (
            cache_key   TEXT PRIMARY KEY,
            fetched_at  TIMESTAMPTZ DEFAULT now(),
            data        JSONB NOT NULL
        );
        """)


# ── Lifespan (startup/shutdown) ───────────────────────────────────────────────
scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # The weekly weekend digest is triggered by the GitHub Action (the free-tier
    # server sleeps when idle, so an in-process cron can't be relied on to fire).
    # Keep only the streaming-cache refresh, which also runs on each cold start.
    scheduler.add_job(refresh_streaming_cache, "interval", hours=24)
    scheduler.start()
    asyncio.create_task(refresh_streaming_cache())  # populate on first boot
    yield
    scheduler.shutdown()
    if pool:
        await pool.close()

app = FastAPI(title="CineAlert API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
@app.head("/health")
async def health():
    """Lightweight liveness ping — returns instantly once the server is up.
    Used by the frontend to detect cold starts on free-tier hosting."""
    return {"status": "ok"}


# ── DB-backed cache (survives restarts) ───────────────────────────────────────
CACHE_TTL_HOURS = 2

async def cache_get(key: str):
    p = await get_pool()
    async with p.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT data FROM api_cache
               WHERE cache_key = $1
                 AND fetched_at > now() - interval '24 hours'""",
            key
        )
    if row:
        return json.loads(row["data"]) if isinstance(row["data"], str) else row["data"]
    return None

async def cache_set(key: str, value):
    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute(
            """INSERT INTO api_cache (cache_key, fetched_at, data)
               VALUES ($1, now(), $2::jsonb)
               ON CONFLICT (cache_key) DO UPDATE
                 SET data = EXCLUDED.data, fetched_at = now()""",
            key, json.dumps(value)
        )


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
    cache_key = f"releases:{languages}:{media_type}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

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

    response = {"releases": results}
    await cache_set(cache_key, response)
    return response

@app.get("/released")
async def get_released(languages: str = "", media_type: str = "movie", from_year: int = 2020):
    """Already-released titles from from_year up to today, per selected languages."""
    cache_key = f"released:{languages}:{media_type}:{from_year}"
    cached = await cache_get(cache_key)
    if cached is not None:
        return cached

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

    response = {"releases": merged}
    await cache_set(cache_key, response)
    return response


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
                    "genre_ids": item.get("genre_ids", []),
                })
            if page >= data.get("total_pages", 1):
                break
        except Exception:
            break
    return results



@app.get("/streaming-upcoming")
async def get_streaming_upcoming(platforms: str = ""):
    """Return shows arriving soon — served from DB cache, refreshed every 6 hours by background job."""
    p = await get_pool()
    async with p.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT items, fetched_at FROM streaming_cache ORDER BY fetched_at DESC LIMIT 1"
        )

    if not row:
        return {"items": [], "cached_at": None}

    all_items = json.loads(row["items"]) if isinstance(row["items"], str) else row["items"]

    # Filter by requested platforms if provided
    if platforms:
        platform_list = {p.strip() for p in platforms.split(",")}
        all_items = [i for i in all_items if i.get("platform") in platform_list]

    return {
        "items": all_items,
        "cached_at": row["fetched_at"].isoformat(),
    }


# ── Background job: refresh Watchmode + MOTN into DB ─────────────────────────
async def refresh_streaming_cache(days_ahead: int = 45):
    """Fetch from Watchmode & MOTN and store results in DB. Called every 6 hours."""
    today  = date.today()
    future = today + timedelta(days=days_ahead)
    items  = []

    async with httpx.AsyncClient() as client:
        tasks = []
        all_watchmode_ids = list(WATCHMODE_SOURCE_MAP.values())
        all_motn_catalogs = list(MOTN_CATALOG_MAP.values())

        if WATCHMODE_API_KEY and all_watchmode_ids:
            tasks.append(_fetch_watchmode(client, all_watchmode_ids, today, future))
        if MOTN_API_KEY and all_motn_catalogs:
            tasks.append(_fetch_motn(client, all_motn_catalogs, days_ahead))

        results = await asyncio.gather(*tasks, return_exceptions=True)

    for r in results:
        if isinstance(r, list):
            items.extend(r)

    if not items:
        return  # don't overwrite DB with empty result on API failure

    # Deduplicate by title+platform, sort by date
    seen, unique = set(), []
    for item in sorted(items, key=lambda x: x.get("available_date") or "9999-99-99"):
        key = (item["title"], item["platform"])
        if key not in seen:
            seen.add(key)
            unique.append(item)

    p = await get_pool()
    async with p.acquire() as conn:
        await conn.execute(
            "INSERT INTO streaming_cache (items) VALUES ($1::jsonb)",
            json.dumps(unique)
        )
        # Keep only the latest 5 rows to avoid unbounded growth
        await conn.execute("""
            DELETE FROM streaming_cache
            WHERE id NOT IN (
                SELECT id FROM streaming_cache ORDER BY fetched_at DESC LIMIT 5
            )
        """)


async def _fetch_watchmode(client: httpx.AsyncClient, source_ids: list, today: date, future: date) -> list:
    id_to_key = {v: k for k, v in WATCHMODE_SOURCE_MAP.items()}
    source_id_set = set(source_ids)
    try:
        r = await client.get(
            "https://api.watchmode.com/v1/releases/",
            params={
                "apiKey":     WATCHMODE_API_KEY,
                "start_date": today.strftime("%Y%m%d"),
                "end_date":   future.strftime("%Y%m%d"),
                "source_ids": ",".join(str(s) for s in source_ids),
            },
            timeout=15,
        )
        r.raise_for_status()
        items = []
        for rel in r.json().get("releases", []):
            sid = rel.get("source_id")
            # Watchmode ignores source_ids filter — enforce client-side
            if sid not in source_id_set:
                continue
            avail_date = rel.get("source_release_date")  # already "YYYY-MM-DD"
            tmdb_id   = rel.get("tmdb_id")
            tmdb_type = "movie" if "movie" in (rel.get("type") or "") else "tv"
            items.append({
                "title":          rel.get("title"),
                "overview":       "",
                "poster":         rel.get("poster_url"),
                "media_type":     tmdb_type,
                "tmdb_id":        tmdb_id,
                "platform":       id_to_key.get(sid, str(sid)),
                "platform_name":  rel.get("source_name"),
                "available_date": avail_date,
                "link":           f"https://www.themoviedb.org/{tmdb_type}/{tmdb_id}" if tmdb_id else None,
            })
        return items
    except Exception:
        return []


async def _fetch_motn(client: httpx.AsyncClient, catalogs: list, days_ahead: int) -> list:
    now    = int(datetime.utcnow().timestamp())
    future = int((datetime.utcnow() + timedelta(days=days_ahead)).timestamp())
    headers = {
        "X-RapidAPI-Key":  MOTN_API_KEY,
        "X-RapidAPI-Host": "streaming-availability.p.rapidapi.com",
    }
    items = []
    for catalog in catalogs:
        try:
            r = await client.get(
                "https://streaming-availability.p.rapidapi.com/changes",
                params={
                    "country":        "in",
                    "catalogs":       catalog,
                    "changeType":     "new",
                    "itemType":       "show",
                    "from":           now,
                    "to":             future,
                    "orderDirection": "asc",
                },
                headers=headers,
                timeout=15,
            )
            r.raise_for_status()
            for change in r.json().get("changes", []):
                show = change.get("show", {})
                # MOTN tmdbId looks like "movie/12345" — keep just the numeric id
                raw_tmdb = show.get("tmdbId") or ""
                tmdb_id = raw_tmdb.split("/")[-1] if raw_tmdb else None
                for opt in show.get("streamingOptions", {}).get("in", []):
                    avail_ts = opt.get("availableFrom")
                    service  = opt.get("service", {})
                    items.append({
                        "title":          show.get("title"),
                        "overview":       (show.get("overview") or "")[:200],
                        "poster":         ((show.get("imageSet") or {}).get("verticalPoster") or {}).get("w480"),
                        "media_type":     "movie" if change.get("showType") == "movie" else "tv",
                        "tmdb_id":        tmdb_id,
                        "platform":       service.get("id"),
                        "platform_name":  service.get("name"),
                        "available_date": datetime.utcfromtimestamp(avail_ts).strftime("%Y-%m-%d") if avail_ts else None,
                        "link":           opt.get("link"),
                    })
        except Exception:
            continue
    return items


@app.post("/scan")
async def trigger_scan():
    """Manually trigger a release scan."""
    await daily_scan()
    return {"status": "scan complete"}


@app.post("/weekly-digest")
async def trigger_weekly_digest():
    """Build & send the weekly weekend digest (theatres + OTT). Triggered by the
    GitHub Action every Saturday; can also be invoked manually."""
    await weekly_digest()
    return {"status": "weekly digest sent"}


# ── TMDB helpers ──────────────────────────────────────────────────────────────
async def fetch_upcoming(client: httpx.AsyncClient, media_type: str, lang: str, days_ahead: int, limit: int = 5, days_back: int = 0):
    today = date.today()
    start = today - timedelta(days=days_back)
    future = today + timedelta(days=days_ahead)
    is_tv = media_type not in ("movie", "Movies")
    date_gte_key = "first_air_date.gte" if is_tv else "primary_release_date.gte"
    date_lte_key = "first_air_date.lte" if is_tv else "primary_release_date.lte"
    params = {
        "api_key": TMDB_KEY,
        "with_original_language": lang,
        date_gte_key: start.isoformat(),
        date_lte_key: future.isoformat(),
        "sort_by": "popularity.desc",
        "region": "IN",
        "page": 1,
    }
    endpoint = f"{TMDB_BASE}/discover/{'tv' if is_tv else 'movie'}"
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
            "genre_ids": item.get("genre_ids", []),
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


async def fetch_tmdb_details(client: httpx.AsyncClient, tmdb_id, media_type: str) -> dict:
    """Fetch original language + genre names for a title (used to enrich OTT items)."""
    kind = "movie" if media_type in ("movie", "Movies") else "tv"
    try:
        r = await client.get(f"{TMDB_BASE}/{kind}/{tmdb_id}", params={"api_key": TMDB_KEY}, timeout=10)
        r.raise_for_status()
        d = r.json()
        return {
            "language": d.get("original_language"),
            "genres": [g["name"] for g in d.get("genres", [])][:3],
        }
    except Exception:
        return {}


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


async def dispatch_alert(message: str, subject: str = "CineAlert: New releases for you!"):
    if MY_TELEGRAM_ID:
        await send_telegram(MY_TELEGRAM_ID, message)
    if MY_EMAIL:
        await send_email(MY_EMAIL, subject, message)


# ── Weekly weekend digest (theatres + OTT) ───────────────────────────────────
async def build_weekly_digest():
    """Gather this week's theatrical releases (new + upcoming) and the OTT
    arrivals coming this week, scoped to the env preferences."""
    today = date.today()

    # 1) In theatres — released in the past week + upcoming this week, my languages
    theatre_items = []
    async with httpx.AsyncClient() as client:
        for lang_name in MY_LANGUAGES:
            lang_code = LANG_MAP.get(lang_name, "en")
            try:
                items = await fetch_upcoming(client, "Movies", lang_code, days_ahead=7, limit=8, days_back=7)
            except Exception:
                continue
            for it in items:
                it["language_name"] = lang_name
            theatre_items.extend(items)

    seen, theatre_unique = set(), []
    for it in sorted(theatre_items, key=lambda x: x.get("release_date") or "9999"):
        if it["tmdb_id"] in seen:
            continue
        seen.add(it["tmdb_id"])
        theatre_unique.append(it)

    # 2) Coming to OTT this week — refresh, then read cache filtered to my platforms
    try:
        await refresh_streaming_cache()
    except Exception:
        pass  # fall back to whatever is already cached
    p = await get_pool()
    async with p.acquire() as conn:
        row = await conn.fetchrow("SELECT items FROM streaming_cache ORDER BY fetched_at DESC LIMIT 1")
    ott_items = []
    if row:
        all_items = json.loads(row["items"]) if isinstance(row["items"], str) else row["items"]
        today_str = today.isoformat()
        week_str = (today + timedelta(days=7)).isoformat()
        for it in all_items:
            if it.get("platform") not in MY_PLATFORMS:
                continue
            ad = it.get("available_date")
            if ad and today_str <= ad <= week_str:
                ott_items.append(it)
        ott_items.sort(key=lambda x: x.get("available_date") or "9999-99-99")

    # Cap to what the digest displays, then enrich each with language + genre
    # via TMDB (the streaming sources don't provide these). TMDB is free/high-limit
    # and this is a weekly job over ≤12 items, so the extra calls are cheap.
    ott_items = ott_items[:12]
    if ott_items:
        async with httpx.AsyncClient() as client:
            async def enrich(it):
                if not it.get("tmdb_id"):
                    return
                det = await fetch_tmdb_details(client, it["tmdb_id"], it.get("media_type", "movie"))
                if det.get("language"):
                    it["language"] = det["language"]
                if det.get("genres"):
                    it["genres"] = det["genres"]
            await asyncio.gather(*(enrich(it) for it in ott_items))

    return theatre_unique, ott_items


def format_weekly_digest_md(theatre_items: list, ott_items: list) -> str:
    lines = ["🎬 *CineAlert — Your Weekend Movie & OTT Digest*\n"]

    lines.append("🎭 *In Theatres — new & upcoming this week*")
    if theatre_items:
        for r in theatre_items[:12]:
            date_str = r.get("release_date") or "TBA"
            meta = [x for x in [
                r.get("language_name"),
                ", ".join(genre_labels(r.get("genre_ids"))),
                f"⭐ {r['rating']:.1f}" if r.get("rating") else "",
            ] if x]
            tail = ("  \n  _" + " · ".join(meta) + "_") if meta else ""
            lines.append(f"• *{r['title']}* — {date_str}{tail}")
    else:
        lines.append("_Nothing new tracked this week._")

    lines.append("")
    lines.append("📺 *Coming to OTT — this week*")
    if ott_items:
        for it in ott_items[:12]:
            date_str = it.get("available_date") or "TBA"
            plat = it.get("platform_name") or it.get("platform") or ""
            meta = [x for x in [
                lang_label(it.get("language")),
                ", ".join(it.get("genres") or []),
            ] if x]
            tail = ("  \n  _" + " · ".join(meta) + "_") if meta else ""
            lines.append(f"• *{it['title']}* — {plat} · {date_str}{tail}")
    else:
        lines.append("_Nothing new tracked this week._")

    lines.append("")
    lines.append("🍿 Have a great weekend! — CineAlert")
    return "\n".join(lines)


def _digest_row_html(title: str, date_str: str, sub: str, poster: str, link: str) -> str:
    if poster:
        poster_html = f'<img src="{poster}" width="46" height="64" alt="" style="border-radius:6px;display:block;" />'
    else:
        poster_html = '<div style="width:46px;height:64px;border-radius:6px;background:#ede9fe;text-align:center;line-height:64px;font-size:22px;">🎬</div>'
    title_html = f'<a href="{link}" style="color:#1e293b;text-decoration:none;">{title}</a>' if link else title
    return (
        '<tr>'
        f'<td width="58" style="padding:8px 12px 8px 0;vertical-align:top;">{poster_html}</td>'
        '<td style="padding:8px 0;vertical-align:top;border-bottom:1px solid #f1f5f9;">'
        f'<div style="font-size:14px;font-weight:600;color:#1e293b;">{title_html}</div>'
        f'<div style="font-size:12px;color:#64748b;margin-top:3px;">{sub}</div>'
        f'<div style="font-size:11px;color:#94a3b8;margin-top:2px;">{date_str}</div>'
        '</td>'
        '</tr>'
    )


def format_weekly_digest_html(theatre_items: list, ott_items: list) -> str:
    def section(title, rows_html):
        body = rows_html or '<tr><td style="font-size:13px;color:#94a3b8;padding:8px 0;">Nothing new tracked this week.</td></tr>'
        return (
            f'<h2 style="font-size:15px;color:#7c3aed;margin:22px 0 4px;">{title}</h2>'
            f'<table style="width:100%;border-collapse:collapse;">{body}</table>'
        )

    theatre_rows = ""
    for r in theatre_items[:12]:
        date_str = r.get("release_date") or "TBA"
        lang = r.get("language_name") or ""
        genres = ", ".join(genre_labels(r.get("genre_ids")))
        rating = f"⭐ {r['rating']:.1f}" if r.get("rating") else ""
        sub = " · ".join(x for x in [lang, genres, rating] if x) or "Movie"
        link = f"https://www.themoviedb.org/movie/{r['tmdb_id']}" if r.get("tmdb_id") else None
        theatre_rows += _digest_row_html(r["title"], f"🗓 {date_str}", sub, r.get("poster"), link)

    ott_rows = ""
    for it in ott_items[:12]:
        date_str = it.get("available_date") or "Coming soon"
        plat = it.get("platform_name") or it.get("platform") or ""
        lang = lang_label(it.get("language"))
        genres = ", ".join(it.get("genres") or [])
        sub = " · ".join(x for x in [f"▶ {plat}", lang, genres] if x)
        ott_rows += _digest_row_html(it["title"], f"🗓 {date_str}", sub, it.get("poster"), it.get("link"))

    return (
        '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">'
        '<div style="background:linear-gradient(135deg,#7c3aed 0%,#e50914 100%);padding:22px 24px;border-radius:14px 14px 0 0;color:#fff;">'
        '<div style="font-size:22px;font-weight:800;">🎬 CineAlert</div>'
        '<div style="font-size:13px;opacity:.9;margin-top:3px;">Your weekend movie &amp; OTT digest</div>'
        '</div>'
        '<div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px;padding:6px 24px 24px;">'
        + section("🎭 In Theatres — new &amp; upcoming this week", theatre_rows)
        + section("📺 Coming to OTT — this week", ott_rows)
        + '<p style="font-size:13px;color:#64748b;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:14px;">🍿 Have a great weekend!<br/>— CineAlert</p>'
        '</div></div>'
    )


async def weekly_digest():
    """Build and send the weekly weekend digest via Telegram + email."""
    theatre_items, ott_items = await build_weekly_digest()
    if not theatre_items and not ott_items:
        return
    subject = "🎬 CineAlert — Your Weekend Movie & OTT Digest"
    if MY_TELEGRAM_ID:
        await send_telegram(MY_TELEGRAM_ID, format_weekly_digest_md(theatre_items, ott_items))
    if MY_EMAIL:
        await send_email(MY_EMAIL, subject, "", html=format_weekly_digest_html(theatre_items, ott_items))


# ── Telegram ──────────────────────────────────────────────────────────────────
async def send_telegram(chat_id: str, text: str):
    if not TG_TOKEN:
        return
    bot = Bot(token=TG_TOKEN)
    await bot.send_message(chat_id=chat_id, text=text, parse_mode="Markdown")


# ── Email (Resend) ────────────────────────────────────────────────────────────
async def send_email(to: str, subject: str, body: str, html: str = None):
    if not RESEND_KEY:
        return
    html_body = html if html is not None else f"<pre style='font-family:sans-serif;white-space:pre-wrap'>{body}</pre>"
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_KEY}", "Content-Type": "application/json"},
            json={
                "from": RESEND_FROM,
                "to": [to],
                "subject": subject,
                "html": html_body,
            },
            timeout=10,
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
