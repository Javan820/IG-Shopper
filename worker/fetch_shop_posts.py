"""
Shop posts fetcher — runs on your PC, talks to Supabase cloud.

For approved + active shops, fetch each shop's latest Instagram posts
(default 10), rehost the thumbnails in the `shop-posts` storage bucket
(IG CDN URLs are signed and expire — never store or hotlink them), and
replace the shop's rows in `shop_posts`. Reels keep is_video=true and
show a play overlay in the UI; the video itself is not rehosted in v1.

Run:
  python fetch_shop_posts.py                    # refresh stale shops (default 15/run)
  python fetch_shop_posts.py --handle some_shop # just one shop
  python fetch_shop_posts.py --force            # ignore freshness window

Uses the same saved Instagram session as the discovery worker
(sessions/instagram.json, created by setup_session.py).
"""

import argparse
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
from discovery_worker import fetch_all

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

load_dotenv(Path(__file__).parent / '.env')

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
HEADLESS = os.environ.get('HEADLESS', '1') != '0'
ENRICH_DELAY = float(os.environ.get('ENRICH_DELAY', '0.85'))

POSTS_BUCKET = 'shop-posts'
POSTS_PER_SHOP = 10
DEFAULT_SHOPS_PER_RUN = 15
DEFAULT_MAX_AGE_DAYS = 7
_EXT_BY_TYPE = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}


def _single_instance() -> bool:
    kernel32 = ctypes.windll.kernel32
    kernel32.CreateMutexW(None, False, 'Global\\IGShopPostsFetcher')
    ERROR_ALREADY_EXISTS = 183
    return kernel32.GetLastError() != ERROR_ALREADY_EXISTS


def _log(msg: str) -> None:
    print(f'[{dt.datetime.now():%H:%M:%S}] {msg}', flush=True)


def _iso(ts: int | None) -> str | None:
    if not ts:
        return None
    return dt.datetime.fromtimestamp(int(ts), dt.timezone.utc).isoformat()


def pick_shops(db: Client, handle: str | None, max_age_days: int, cap: int, force: bool) -> list[dict]:
    """Approved + active shops whose posts are missing or stale, oldest-fetch
    first so every shop eventually rotates through the budget."""
    def make_query():
        query = (
            db.table('shops')
            .select('id, ig_handle, ig_handle_status')
            .eq('status', 'approved')
            .eq('is_active', True)
        )
        if handle:
            query = query.eq('ig_handle', handle.strip().lower().lstrip('@'))
        return query

    shops = [
        s for s in fetch_all(make_query)
        if s.get('ig_handle_status') != 'broken'
    ]
    if handle or force:
        return shops[:cap]

    rows = fetch_all(lambda: db.table('shop_posts').select('shop_id, fetched_at'))
    freshest: dict[str, str] = {}
    for row in rows:
        current = freshest.get(row['shop_id'])
        if current is None or row['fetched_at'] > current:
            freshest[row['shop_id']] = row['fetched_at']

    cutoff = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=max_age_days)).isoformat()
    due = [s for s in shops if freshest.get(s['id'], '') < cutoff]
    due.sort(key=lambda s: freshest.get(s['id'], ''))
    return due[:cap]


def upload_thumb(db: Client, shop_id: str, shortcode: str, b64: str, content_type: str | None) -> str | None:
    ctype = (content_type or 'image/jpeg').split(';')[0].strip().lower()
    ext = _EXT_BY_TYPE.get(ctype)
    if ext is None:
        # Bucket only allows jpeg/png/webp; coerce anything else to jpeg.
        ctype, ext = 'image/jpeg', 'jpg'
    path = f'{shop_id}/{shortcode}.{ext}'
    try:
        data = base64.b64decode(b64)
        db.storage.from_(POSTS_BUCKET).upload(
            path, data, {'content-type': ctype, 'upsert': 'true'}
        )
        return db.storage.from_(POSTS_BUCKET).get_public_url(path)
    except Exception as e:
        _log(f'    ! thumb upload failed for {shop_id}/{shortcode}: {e}')
        return None


def save_posts(db: Client, shop: dict, posts: list[dict]) -> int:
    """Upload thumbnails, upsert rows, then prune rows (and their storage
    objects) for posts that dropped out of the latest set. Never wipes a
    shop's existing deck when a fetch comes back empty-handed."""
    shop_id = shop['id']
    rows = []
    for position, post in enumerate(posts):
        url = upload_thumb(db, shop_id, post['shortcode'], post['thumb_b64'], post['thumb_type'])
        if not url:
            continue
        rows.append({
            'shop_id': shop_id,
            'shortcode': post['shortcode'],
            'caption': post['caption'],
            'is_video': post['is_video'],
            'media_url': url,
            'taken_at': _iso(post['taken_at']),
            'position': position,
            'fetched_at': dt.datetime.now(dt.timezone.utc).isoformat(),
        })
    if not rows:
        return 0

    db.table('shop_posts').upsert(rows, on_conflict='shop_id,shortcode').execute()

    keep = {r['shortcode'] for r in rows}
    existing = (
        db.table('shop_posts').select('id, shortcode').eq('shop_id', shop_id).execute().data or []
    )
    stale_ids = [r['id'] for r in existing if r['shortcode'] not in keep]
    if stale_ids:
        db.table('shop_posts').delete().in_('id', stale_ids).execute()
        stale_paths = []
        try:
            objects = db.storage.from_(POSTS_BUCKET).list(shop_id) or []
            keep_prefixes = {f'{sc}.' for sc in keep}
            stale_paths = [
                f'{shop_id}/{o["name"]}'
                for o in objects
                if not any(o['name'].startswith(p) for p in keep_prefixes)
            ]
            if stale_paths:
                db.storage.from_(POSTS_BUCKET).remove(stale_paths)
        except Exception as e:
            _log(f'    ! stale media cleanup failed for {shop_id}: {e}')
    return len(rows)


async def main() -> int:
    parser = argparse.ArgumentParser(description='Fetch + rehost latest IG posts per shop.')
    parser.add_argument('--handle', help='only this shop handle')
    parser.add_argument('--shops', type=int, default=DEFAULT_SHOPS_PER_RUN,
                        help=f'max shops per run (default {DEFAULT_SHOPS_PER_RUN})')
    parser.add_argument('--max-age-days', type=int, default=DEFAULT_MAX_AGE_DAYS,
                        help=f'refresh shops whose posts are older than this (default {DEFAULT_MAX_AGE_DAYS})')
    parser.add_argument('--force', action='store_true', help='ignore the freshness window')
    args = parser.parse_args()

    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        _log('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in worker/.env')
        return 1
    if not _single_instance():
        _log('Another posts fetcher is already running — exiting.')
        return 0

    db = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    shops = pick_shops(db, args.handle, args.max_age_days, args.shops, args.force)
    if not shops:
        _log('No shops need a posts refresh.')
        return 0

    _log(f'Fetching latest posts for {len(shops)} shop(s)…')
    agent = IgShopAgent(headless=HEADLESS, enrich_delay=ENRICH_DELAY)
    by_handle = {s['ig_handle']: s for s in shops}
    try:
        results = await agent.fetch_latest_posts(list(by_handle), limit=POSTS_PER_SHOP)
    except SessionExpiredError as e:
        _log(f'✗ {e}')
        return 1

    saved_shops = 0
    for handle, posts in results.items():
        shop = by_handle[handle]
        if not posts:
            _log(f'@{handle}: no posts captured — leaving existing deck untouched')
            continue
        count = save_posts(db, shop, posts)
        if count:
            saved_shops += 1
            _log(f'@{handle}: saved {count} post(s)')

    _log(f'Done — {saved_shops}/{len(shops)} shop(s) updated.')
    return 0


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
