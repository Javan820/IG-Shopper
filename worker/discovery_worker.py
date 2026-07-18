"""
Shop discovery worker — runs on your PC, talks to Supabase cloud.

Loop:
  1. Claim the oldest queued shop_discovery_jobs row (mark 'running').
  2. Scrape Instagram for shop accounts in that job's category.
  3. Insert new ones into `shops` as status='pending' for admin review.
  4. Mark the job 'done' (or 'error').

Setup (one-time):
  pip install -r requirements.txt
  python -m playwright install chromium
  copy .env.example .env   # then fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
  python setup_session.py  # log into the dedicated IG account

Run:
  python discovery_worker.py
"""

import asyncio
import base64
import ctypes
import datetime as dt
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

from ig_shop_agent import IgShopAgent, SessionExpiredError

# Logs go to worker.log via cmd, which defaults to the Windows code page (cp1252)
# and otherwise crashes when a discovered shop name has Chinese/emoji characters.
# Force UTF-8 so logging never throws on non-Latin names.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

load_dotenv(Path(__file__).parent / '.env')

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
POLL_INTERVAL_SECONDS = 10

# Saved Instagram login. Until this exists (created by setup_session.py), the
# worker waits instead of claiming jobs — so auto-start never burns queued jobs
# into 'error' just because nobody has logged in yet.
SESSION_FILE = Path(__file__).parent / 'sessions' / 'instagram.json'

# Set HEADLESS=0 in .env to watch the browser while debugging.
HEADLESS = os.environ.get('HEADLESS', '1') != '0'

# Average pause (seconds) between requests. Raise if IG starts rate-limiting
# (jobs returning 0 found / errors); lower to go faster. Each pause jitters ±40%.
SEARCH_DELAY = float(os.environ.get('SEARCH_DELAY', '1.1'))
ENRICH_DELAY = float(os.environ.get('ENRICH_DELAY', '0.85'))


def _single_instance() -> bool:
    """True if we acquired the lock; False if another worker is already running.

    Uses a named Windows mutex so two spawned instances don't race to claim
    the same job. The mutex is released automatically when this process exits.
    """
    kernel32 = ctypes.windll.kernel32
    kernel32.CreateMutexW(None, False, 'Global\\IGShopDiscoveryWorker')
    ERROR_ALREADY_EXISTS = 183
    return kernel32.GetLastError() != ERROR_ALREADY_EXISTS


def _now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _log(msg: str) -> None:
    print(f'[{dt.datetime.now():%H:%M:%S}] {msg}', flush=True)


def _normalize_handle(raw: str) -> str:
    return raw.strip().lower().lstrip('@')


async def claim_next_job(db: Client) -> dict | None:
    """Fetch the oldest queued job and flip it to 'running'."""
    res = (
        db.table('shop_discovery_jobs')
        .select('*')
        .eq('status', 'queued')
        .order('created_at', desc=False)
        .limit(1)
        .execute()
    )
    jobs = res.data or []
    if not jobs:
        return None
    job = jobs[0]
    db.table('shop_discovery_jobs').update(
        {'status': 'running', 'started_at': _now()}
    ).eq('id', job['id']).execute()
    return job


def fetch_all(make_query, page_size: int = 1000) -> list[dict]:
    """Fetch every row for a query, paging past PostgREST's 1000-row cap.

    `make_query` is a zero-arg callable returning a fresh filtered query
    builder; each page re-builds it because builders are single-use.
    """
    rows: list[dict] = []
    offset = 0
    while True:
        page = make_query().range(offset, offset + page_size - 1).execute().data or []
        rows.extend(page)
        if len(page) < page_size:
            return rows
        offset += page_size


def existing_handles(db: Client) -> set[str]:
    """All handles already in `shops` plus the admin's rejected-and-cleared
    blocklist, so we never insert duplicates or re-discover rejected shops."""
    handles = {
        _normalize_handle(r['ig_handle'])
        for r in fetch_all(lambda: db.table('shops').select('ig_handle'))
    }
    try:
        blocked = fetch_all(lambda: db.table('discovery_blocklist').select('ig_handle'))
        handles |= {_normalize_handle(r['ig_handle']) for r in blocked}
    except Exception as e:
        # Table missing until its migration runs — warn but keep discovering.
        _log(f'  ! blocklist unavailable ({e}); proceeding without it')
    return handles


COVER_BUCKET = 'shop-covers'
_EXT_BY_TYPE = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}


def upload_cover(db: Client, shop_id: str, b64: str, content_type: str | None) -> str | None:
    """Upload a base64 image to the shop-covers bucket as `{shop_id}/cover.{ext}`
    and return its public URL. Returns None on any failure (cover is optional)."""
    ctype = (content_type or 'image/jpeg').split(';')[0].strip().lower()
    ext = _EXT_BY_TYPE.get(ctype)
    if ext is None:
        # Storage bucket only allows jpeg/png/webp; coerce anything else to jpeg.
        ctype, ext = 'image/jpeg', 'jpg'
    path = f'{shop_id}/cover.{ext}'
    try:
        data = base64.b64decode(b64)
        db.storage.from_(COVER_BUCKET).upload(
            path, data, {'content-type': ctype, 'upsert': 'true'}
        )
        return db.storage.from_(COVER_BUCKET).get_public_url(path)
    except Exception as e:
        _log(f'    ! cover upload failed for {shop_id}: {e}')
        return None


def insert_shops(db: Client, category: str, shops: list[dict]) -> int:
    """Insert discovered shops as pending. Returns count actually inserted."""
    inserted = 0
    for shop in shops:
        handle = _normalize_handle(shop['ig_handle'])
        if not handle:
            continue
        payload = {
            'ig_handle': handle,
            'name': (shop.get('name') or handle)[:100],
            'category': category,
            'location': 'Hong Kong',
            'description': shop.get('description'),
            'website_url': shop.get('website_url'),
            'status': 'pending',
            'is_active': False,
            'source': 'discovery',
            'ig_handle_status': 'active',
            'ig_handle_checked_at': _now(),
        }
        try:
            res = db.table('shops').insert(payload).execute()
            inserted += 1
            _log(f'  + @{handle} — {payload["name"]}')
        except Exception as e:
            # Most likely a unique-handle race; skip and continue.
            _log(f'  ! skip @{handle}: {e}')
            continue

        # Set the profile picture as the cover image (best-effort).
        shop_id = (res.data or [{}])[0].get('id')
        cover_b64 = shop.get('cover_b64')
        if shop_id and cover_b64:
            url = upload_cover(db, shop_id, cover_b64, shop.get('cover_type'))
            if url:
                try:
                    db.table('shops').update({'cover_image_url': url}).eq('id', shop_id).execute()
                except Exception as e:
                    _log(f'    ! cover update failed for @{handle}: {e}')
    return inserted


async def process_job(db: Client, job: dict) -> None:
    category = job['category']
    target = int(job.get('target_count') or 10)
    _log(f'Job {job["id"][:8]} — discovering {target} × "{category}"')

    try:
        known = existing_handles(db)
        agent = IgShopAgent(
            headless=HEADLESS,
            search_delay=SEARCH_DELAY,
            enrich_delay=ENRICH_DELAY,
        )
        shops = await agent.discover(category, target, known)
        found = len(shops)
        inserted = insert_shops(db, category, shops)
        db.table('shop_discovery_jobs').update({
            'status': 'done',
            'found_count': found,
            'inserted_count': inserted,
            'finished_at': _now(),
        }).eq('id', job['id']).execute()
        _log(f'Job {job["id"][:8]} done — {inserted} new / {found} found')
    except SessionExpiredError as e:
        _fail_job(db, job, str(e))
    except Exception as e:
        _fail_job(db, job, f'{type(e).__name__}: {e}')


def _fail_job(db: Client, job: dict, message: str) -> None:
    _log(f'Job {job["id"][:8]} ERROR — {message}')
    db.table('shop_discovery_jobs').update({
        'status': 'error',
        'error': message[:500],
        'finished_at': _now(),
    }).eq('id', job['id']).execute()


async def main() -> None:
    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        print('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill it in.')
        sys.exit(1)

    if not _single_instance():
        _log('Another discovery worker is already running — exiting.')
        return

    if not SESSION_FILE.exists():
        _log('No Instagram session found. Run setup_session.py first, then retry.')
        sys.exit(1)

    db = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    _log('Discovery worker started. Processing queued jobs…')

    processed = 0
    while True:
        try:
            job = await claim_next_job(db)
        except Exception as e:
            _log(f'Poll failed: {e}')
            break

        if job is None:
            if processed == 0:
                _log('No queued jobs found. Worker exiting.')
            else:
                _log(f'Queue drained ({processed} job(s) done). Worker shutting down.')
            break

        processed += 1
        await process_job(db, job)
        # Brief pause before re-checking — handles jobs queued while this one ran.
        await asyncio.sleep(2)


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\nWorker stopped.')
