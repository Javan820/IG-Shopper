"""
Backfill shop cover images from Instagram profile pictures.

For every shop in the DB that has no cover_image_url (pending OR already
approved), this fetches the account's current Instagram profile picture and
uploads it to the `shop-covers` bucket as the cover image — the same thing the
discovery worker now does automatically for newly discovered shops.

Run (one-off, after the worker venv + IG session are set up):
  .venv/Scripts/python.exe backfill_covers.py            # all shops missing a cover
  .venv/Scripts/python.exe backfill_covers.py --limit 20 # cap how many to process
  .venv/Scripts/python.exe backfill_covers.py --dry-run  # list what would change
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

from ig_shop_agent import IgShopAgent, SessionExpiredError
from discovery_worker import upload_cover, _normalize_handle, _log

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

load_dotenv(Path(__file__).parent / '.env')

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SERVICE_ROLE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
SESSION_FILE = Path(__file__).parent / 'sessions' / 'instagram.json'
HEADLESS = os.environ.get('HEADLESS', '1') != '0'
ENRICH_DELAY = float(os.environ.get('ENRICH_DELAY', '0.85'))


def shops_missing_cover(db: Client) -> list[dict]:
    """All shops (any status) with no cover image and a live IG handle."""
    res = db.table('shops').select(
        'id, ig_handle, name, cover_image_url, ig_handle_status'
    ).execute()
    out = []
    for row in (res.data or []):
        if (row.get('cover_image_url') or '').strip():
            continue  # already has a cover — leave it alone
        if row.get('ig_handle_status') == 'dead':
            continue  # handle no longer resolves; skip
        out.append(row)
    return out


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=0, help='Max shops to process (0 = all)')
    parser.add_argument('--dry-run', action='store_true', help='List candidates without changing anything')
    args = parser.parse_args()

    if not SUPABASE_URL or not SERVICE_ROLE_KEY:
        print('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
        sys.exit(1)
    if not SESSION_FILE.exists():
        print('No Instagram session found. Run setup_session.py first.')
        sys.exit(1)

    db = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)
    shops = shops_missing_cover(db)
    if args.limit > 0:
        shops = shops[: args.limit]

    if not shops:
        _log('No shops missing a cover image. Nothing to do.')
        return

    _log(f'{len(shops)} shop(s) missing a cover image.')
    for s in shops:
        _log(f'  · @{s["ig_handle"]} — {s.get("name") or ""}')

    if args.dry_run:
        _log('Dry run — no changes made.')
        return

    # Map normalised handle -> shop row, so we can match the scraped pics back.
    by_handle = {_normalize_handle(s['ig_handle']): s for s in shops}
    handles = list(by_handle.keys())

    agent = IgShopAgent(headless=HEADLESS, enrich_delay=ENRICH_DELAY)
    try:
        pics = await agent.fetch_profile_pics(handles)
    except SessionExpiredError as e:
        _log(f'ERROR — {e}')
        sys.exit(1)

    updated = 0
    for handle, pic in pics.items():
        shop = by_handle.get(handle)
        if not shop:
            continue
        url = upload_cover(db, shop['id'], pic['b64'], pic.get('type'))
        if not url:
            continue
        try:
            db.table('shops').update({'cover_image_url': url}).eq('id', shop['id']).execute()
            updated += 1
            _log(f'  ✓ @{handle} cover set')
        except Exception as e:
            _log(f'  ! @{handle} update failed: {e}')

    _log(f'Done — {updated} cover(s) set of {len(shops)} shop(s) missing one.')


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\nBackfill stopped.')
