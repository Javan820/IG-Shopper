"""
Instagram shop-account discovery agent.

Unlike a post scraper, this collects *accounts* (shop handles + profile
metadata). It uses Instagram's logged-in topsearch endpoint to find accounts
matching Hong Kong shop search terms, then visits each candidate profile to pull
the display name, bio and website.

Browser/session/stealth/consent handling is adapted from the proven
`2026 Travel/agents/base.py` + `instagram.py`. Requires a saved Playwright
session created by `setup_session.py`.
"""

import asyncio
import base64
import random
from datetime import datetime, timezone, timedelta
from pathlib import Path

from playwright.async_api import async_playwright, Page

SESSIONS_DIR = Path(__file__).parent / 'sessions'
IG_APP_ID = '936619743392459'  # public web app id IG sends on its own XHRs

try:
    from playwright_stealth import stealth_async as _stealth_async
    _HAS_STEALTH = True
except ImportError:
    _HAS_STEALTH = False


class SessionExpiredError(Exception):
    """Raised when the saved Instagram session is no longer logged in."""


def _agent_log(msg: str) -> None:
    print(f'  [{datetime.now():%H:%M:%S}] {msg}', flush=True)


# Hong Kong-focused seed search terms per shop category.
# IG topsearch returns ~5 users per query, so each category needs ~8 terms to
# build an adequate candidate pool. Chinese '香港'-anchored product terms hugely
# outperform English 'hk*shop' terms, which surface foreign lookalikes
# (Korean/Indonesian/Gulf "dessertshop"/"bakery" accounts) and generic aggregator
# pages. The terms below were validated against live topsearch — '香港'+product
# returns ~5/5 real HK accounts (many with .hk handles), vs 0–1/5 for English.
# Cross-category HK anchors ('香港網店', '香港代購', '香港手作', '香港小店') pad the pool.
CATEGORY_TERMS: dict[str, list[str]] = {
    'Fashion & Clothing': ['香港服飾', '香港時裝', '香港穿搭', '香港女裝', '香港網店', '香港代購', '香港手作', '私訊訂購'],
    'Beauty & Skincare': ['香港美妝', '香港護膚', '香港化妝品', '香港彩妝', '香港香水', '香港網店', '香港代購', '私訊訂購'],
    'Food & Drinks': ['香港甜品', '香港蛋糕', '香港自家製', '香港食品', '香港生日蛋糕', '香港曲奇', '香港手作甜品', '香港訂蛋糕'],
    'Art & Prints': ['香港插畫', '香港手繪', '香港文創', '香港藝術', '香港畫作', '香港手作', '香港網店', '私訊訂購'],
    'Jewellery & Accessories': ['香港手作飾物', '香港飾物', '香港耳環', '香港首飾', '香港手作', '香港網店', '香港代購', '私訊訂購'],
    'Home & Lifestyle': ['香港家居', '香港家品', '香港生活雜貨', '香港居家', '香港手作', '香港網店', '香港代購', '香港小店'],
    'Books & Stationery': ['香港文具', '香港手帳', '香港文創', '香港貼紙', '香港小店', '香港網店', '香港手作', '私訊訂購'],
    'Health & Wellness': ['香港保健', '香港健康產品', '香港營養', '香港有機', '香港代購', '香港網店', '香港自家製', '私訊訂購'],
    'Vintage & Second-hand': ['香港古著', '香港二手', '香港復古', '香港古著店', '香港vintage', '香港網店', '香港小店', '私訊訂購'],
    'Digital Products': ['香港設計', '香港文創', '香港插畫', '香港創作', '香港手作', '香港網店', '私訊訂購', '香港代購'],
    'Other': ['香港網店', '香港代購', '香港手作', '香港小店', '私訊訂購', '香港自家製', '香港甜品', '香港飾物'],
}

DEFAULT_TERMS = ['香港網店', '香港代購', '香港手作', '香港小店', '私訊訂購', '香港自家製']

# Bio keywords that strongly indicate an actual IG shop (not a KOL/brand).
_SHOP_SIGNALS = [
    # Order methods — the clearest signal that this is a transactional shop
    '私訊訂購', '私訊落單', 'dm to order', 'dm for order', 'dm us', 'order via dm',
    'order here', 'order now', 'shop now', 'place order', '落單', '訂購',
    # Logistics
    'sf express', '順豐', 'delivery', '送貨', 'local pickup', '自取', '郵寄',
    # Contact (shops post these; KOLs rarely do)
    'whatsapp', 'wechat', 'telegram', '📦', '🛍', '🛒',
    # Pricing / product info
    'hkd', 'hk$', '$hkd', 'price list', 'pricelist', '價錢', '售價',
    # Stock / product posts
    'in stock', 'limited stock', 'preorder', 'pre-order', '現貨', '預購', '入貨',
    # Generic shop words
    'online shop', 'onlineshop', 'ig shop', 'igshop', 'e-shop', 'eshop',
    '網店', '小店', '本地小店', 'shop link', 'shoplink',
]

# Bio keywords that suggest KOL / influencer / promotional account (not a shop).
_KOL_SIGNALS = [
    'kol', 'influencer', 'content creator', 'blogger', 'vlogger',
    'collab', 'collaboration', 'pr friendly', 'pr welcome', 'paid partnership',
    'ambassador', 'brand ambassador', 'sponsored', 'gifted', 'gifted by',
    'ugc', 'ugc creator', 'lifestyle blogger', 'fashion blogger',
    '網紅', '時尚博主', '美妝博主', '生活博主',
]

# Bio/name signals that confirm an account actually operates in Hong Kong.
# At least one must appear; accounts with zero HK signals are rejected.
# NOTE: bare 'hk' is deliberately NOT here — it matches foreign handles like
# @hk_bakery.id (Indonesia) and @hkbakery_philly (Philadelphia). Currency/logistics
# notation ('hkd', 'hk$', '順豐', '面交') is HK-specific and safe.
_HK_LOCATION_SIGNALS = [
    '香港', '852',                                          # HK country code / Chinese name
    'hong kong', 'hongkong', '🇭🇰',                        # English name + flag emoji
    'hk$', '$hkd', 'hkd',                                  # currency notation (HK-specific)
    '九龍', 'kowloon', '新界', '港島',                      # HK regions
    '全港', '本港',                                          # "all HK" / "local HK"
    '旺角', '銅鑼灣', '尖沙咀', '觀塘', '沙田',             # HK districts
    '天水圍', '元朗', '屯門', '將軍澳', '大埔', '荃灣',
    '面交',                                                  # in-person pickup (HK idiom)
    '順豐', 'hkpost',                                       # HK logistics
]

# Explicit non-HK markers. When any of these appear in the handle or bio AND the
# account shows no STRONG HK signal, it is rejected — these are the accounts that
# the old "any 'hk' substring / any Chinese = HK" logic wrongly admitted
# (@hk_bakery.id, @hkbakery_philly, @sadanfashop, etc.).
_FOREIGN_SIGNALS = [
    # Country-code handle suffixes (e.g. hk_bakery.id, shop_ph, store_my)
    '.id', '.ph', '.my', '.sg', '.us', '.uk', '.au', '.ca', '.tw', '.jp', '.kr', '.th',
    '_id', '_ph', '_my', '_sg', '_us', '_uk', '_au', '_ca', '_tw', '_jp', '_kr', '_th',
    # City / country names that pin an account elsewhere
    'philly', 'philadelphia', 'philippines', 'pilipinas',
    'indonesia', 'malaysia', 'singapore', 'taiwan', '台灣', '臺灣',
    'jakarta', 'manila', 'bangkok', 'thailand', 'vietnam',
    'london', ' uk', 'united kingdom', 'nyc', 'usa', 'united states', ' u.s.',
    'tokyo', 'japan', 'korea', 'seoul', 'sydney', 'australia',
    'mainland', '大陸', '内地', '內地', '深圳', '广州', '上海', '北京',
]

# Strong, unambiguous HK markers. The presence of any of these overrides a foreign
# marker (e.g. a `.hk`-ending handle is HK even if some other token looks foreign).
_STRONG_HK_BIO = [
    '香港', 'hong kong', 'hongkong', '🇭🇰',
    'hkd', 'hk$', '$hkd', '順豐', '面交', 'hkpost',
    '九龍', 'kowloon', '新界', '港島',
    '旺角', '銅鑼灣', '尖沙咀', '觀塘', '沙田',
    '天水圍', '元朗', '屯門', '將軍澳', '大埔', '荃灣',
]

# Order-method signals — the single clearest "this is a transactional shop" marker.
# Used to rescue an exact-search-term handle (e.g. @hkfoodshop) only if it really
# sells; otherwise such generic/aggregator handles are skipped.
_ORDER_METHOD_SIGNALS = [
    '私訊訂購', '私訊落單', 'dm to order', 'dm for order', 'dm us', 'order via dm',
    'order here', 'order now', 'place order', '落單', '訂購', 'whatsapp order',
]

# Minimum number of feed posts for an account to be considered a live shop.
# Near-empty stores (@poorjjstore) are dropped here.
_MIN_POST_COUNT = 3

# Minimum score for an account to be kept as a shop candidate.
# Each shop signal = +2, website = +1. Requiring >= 2 means at least one genuine
# shop signal must be present — a website-only (1) or zero-signal (0) account no
# longer slips through (these admitted content/aggregator pages like @hkfoodshop).
_MIN_SHOP_SCORE = 2


def _is_strong_hk(handle: str, name: str, bio: str) -> bool:
    """True if the account shows an unambiguous Hong Kong signal.

    Handle markers (`.hk` ending, `_hk`/`.hk`/`hkg`/`igshophk` tokens) or a strong
    HK bio marker (HKD, 順豐, 面交, district names, 香港...). Deliberately stricter
    than a bare 'hk' prefix, which matches foreign handles like @hkbakery_philly.
    """
    h = handle.lower()
    if (
        h.endswith('.hk') or h.endswith('_hk') or h.endswith('hkg') or
        '_hk' in h or '.hk' in h or 'igshophk' in h or 'hkig' in h
    ):
        return True
    text = (name + ' ' + bio).lower()
    return any(sig.lower() in text for sig in _STRONG_HK_BIO)


def _shop_score(name: str, bio: str, website_url: str | None) -> int:
    """
    Score a candidate account on how likely it is to be a real IG shop
    (not a KOL, brand page, or lifestyle account).

    Returns an integer; >= _MIN_SHOP_SCORE = keep, < _MIN_SHOP_SCORE = discard.
    """
    text = (name + ' ' + bio).lower()
    score = 0

    for sig in _SHOP_SIGNALS:
        if sig.lower() in text:
            score += 2

    for sig in _KOL_SIGNALS:
        if sig.lower() in text:
            score -= 3

    # Having a website link is a mild positive signal (shops often link storefronts).
    if website_url:
        score += 1

    return score


class IgShopAgent:
    def __init__(
        self,
        headless: bool = True,
        search_delay: float = 1.1,
        enrich_delay: float = 0.85,
    ):
        self.headless = headless
        # Average seconds to pause between requests. Higher = gentler on IG's
        # rate-limiter but slower. Each actual pause jitters ±40% around these.
        self.search_delay = max(0.0, search_delay)
        self.enrich_delay = max(0.0, enrich_delay)

    def _jittered(self, base: float) -> float:
        return random.uniform(base * 0.6, base * 1.4)

    def _session_path(self) -> str:
        f = SESSIONS_DIR / 'instagram.json'
        if not f.exists():
            raise SessionExpiredError(
                'No saved Instagram session. Run: python setup_session.py'
            )
        return str(f)

    async def discover(
        self, category: str, target_count: int, known_handles: set[str]
    ) -> list[dict]:
        """
        Return up to `target_count` NEW shop dicts for the category, skipping any
        handle already in `known_handles` (lowercased, no @).
        Each dict: {ig_handle, name, description, website_url}.
        """
        session_path = self._session_path()

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=self.headless,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                ],
            )
            context = await browser.new_context(
                viewport={'width': 1280, 'height': 900},
                user_agent=(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) '
                    'Chrome/124.0.0.0 Safari/537.36'
                ),
                locale='en-US',
                storage_state=session_path,
            )
            page = await context.new_page()
            if _HAS_STEALTH:
                await _stealth_async(page)

            try:
                return await self._scrape(page, category, target_count, known_handles)
            finally:
                await browser.close()

    async def _scrape(
        self, page: Page, category: str, target_count: int, known_handles: set[str]
    ) -> list[dict]:
        # Confirm the session is still logged in.
        await self._ensure_logged_in(page)

        terms = CATEGORY_TERMS.get(category, DEFAULT_TERMS)

        # Collect candidate accounts (handle + name) from topsearch.
        candidates: dict[str, dict] = {}
        for term in terms:
            for entry in await self._topsearch(page, term):
                h = entry['ig_handle'].lower()
                if h in known_handles or h in candidates:
                    continue
                candidates[h] = entry
            await asyncio.sleep(self._jittered(self.search_delay))
            # Extra headroom: the stricter recency/HK/shop filters discard most
            # candidates, so collect more raw candidates per keeper needed.
            if len(candidates) >= target_count * 8:
                break

        # Enrich candidates and score them; keep only likely real shops.
        shops: list[dict] = []
        _agent_log(f'{len(candidates)} candidates from topsearch')
        for handle, base in candidates.items():
            if len(shops) >= target_count:
                break
            enriched = await self._enrich(page, handle)
            if enriched is None:
                _agent_log(f'@{handle}: skip — enrich failed (rate-limited or account gone)')
                continue
            if enriched.get('is_private'):
                _agent_log(f'@{handle}: skip — private account')
                continue

            post_count = enriched.get('post_count') or 0

            # Reject near-empty stores (e.g. @poorjjstore — no real content).
            if post_count < _MIN_POST_COUNT:
                _agent_log(f'@{handle}: skip — only {post_count} post(s)')
                continue

            # Determine the latest-post timestamp reliably. web_profile_info's
            # timeline edges are frequently empty (count present, edges stripped),
            # which previously disabled the recency check entirely. Fall back to the
            # user-feed endpoint to get a real timestamp.
            latest_post_ts = enriched.get('latest_post_ts')
            if latest_post_ts is None and enriched.get('user_id'):
                latest_post_ts = await self._latest_post_ts(page, enriched['user_id'])

            # Reject when recency is unconfirmable (per decision: precision > yield).
            if latest_post_ts is None:
                _agent_log(f'@{handle}: skip — could not confirm a recent post')
                continue

            one_year_ago = datetime.now(timezone.utc) - timedelta(days=365)
            last_dt = datetime.fromtimestamp(latest_post_ts, tz=timezone.utc)
            if last_dt < one_year_ago:
                _agent_log(f'@{handle}: skip — last post {last_dt:%Y-%m-%d} (>1yr ago)')
                continue

            name = enriched.get('name') or base.get('name') or handle
            bio = enriched.get('description') or ''
            website_url = enriched.get('website_url')

            combined_lower = (name + ' ' + bio).lower()
            h = handle.lower()
            strong_hk = _is_strong_hk(handle, name, bio)

            # Foreign-exclusion: an explicit non-HK marker (handle suffix like
            # `.id`/`_philly` or a foreign city/country name) disqualifies unless a
            # STRONG HK signal overrides it. Catches @hk_bakery.id, @hkbakery_philly.
            if not strong_hk and any(sig in combined_lower or sig in h for sig in _FOREIGN_SIGNALS):
                _agent_log(f'@{handle}: skip — foreign marker, no strong HK signal')
                continue

            # HK requirement: a strong HK signal, OR a weaker HK location signal in
            # name/bio. A plain Chinese bio is no longer sufficient on its own — it
            # admitted non-HK Chinese shops (@sadanfashop) — it must come with no
            # foreign marker AND at least one real HK location signal above.
            has_hk_location = any(sig.lower() in combined_lower for sig in _HK_LOCATION_SIGNALS)
            if not strong_hk and not has_hk_location:
                _agent_log(f'@{handle}: skip — no HK signal | name="{name}" bio="{bio[:60]}"')
                continue

            # Generic/aggregator handles that exactly match a search term (e.g.
            # @hkfoodshop from the term "hkfoodshop") are content pages, not shops,
            # unless the bio shows a real order method.
            if h in {t.lower() for t in terms}:
                has_order = any(sig.lower() in combined_lower for sig in _ORDER_METHOD_SIGNALS)
                if not has_order:
                    _agent_log(f'@{handle}: skip — generic aggregator handle (no order method)')
                    continue

            score = _shop_score(name, bio, website_url)
            if score < _MIN_SHOP_SCORE:
                _agent_log(f'@{handle}: skip — score={score} (KOL/brand/not a shop)')
                continue

            # Grab the profile picture to use as the shop's cover image. Fetched
            # in-browser now (the signed CDN URL expires); the worker uploads the
            # bytes to Supabase Storage on insert.
            cover = None
            pic_url = enriched.get('profile_pic_url')
            if pic_url:
                cover = await self._fetch_image_b64(page, pic_url)

            _agent_log(f'@{handle}: KEEP score={score} | "{name}"')
            shops.append({
                'ig_handle': handle,
                'name': name,
                'description': bio or None,
                'website_url': website_url,
                'cover_b64': cover['b64'] if cover else None,
                'cover_type': cover['type'] if cover else None,
            })
            await asyncio.sleep(self._jittered(self.enrich_delay))

        _agent_log(f'{len(shops)} shops kept of {len(candidates)} candidates')
        return shops

    async def _topsearch(self, page: Page, term: str) -> list[dict]:
        """Query IG's blended search for accounts matching `term`."""
        try:
            result = await page.evaluate(
                """async ({ q, appId }) => {
                    const res = await fetch(
                        '/web/search/topsearch/?context=blended&query=' + encodeURIComponent(q),
                        { headers: { 'x-ig-app-id': appId }, credentials: 'include' },
                    );
                    if (!res.ok) return null;
                    return await res.json();
                }""",
                {'q': term, 'appId': IG_APP_ID},
            )
        except Exception:
            return []
        if not result:
            return []
        out: list[dict] = []
        for entry in result.get('users', []) or []:
            u = entry.get('user', {}) or {}
            username = u.get('username')
            if not username:
                continue
            out.append({
                'ig_handle': username,
                'name': u.get('full_name') or username,
            })
        return out

    async def _enrich(self, page: Page, handle: str) -> dict | None:
        """Fetch a profile's web_profile_info JSON directly (no page render)."""
        try:
            result = await page.evaluate(
                """async ({ h, appId }) => {
                    const res = await fetch(
                        '/api/v1/users/web_profile_info/?username=' + encodeURIComponent(h),
                        { headers: { 'x-ig-app-id': appId }, credentials: 'include' },
                    );
                    if (!res.ok) return { status: res.status };
                    return { status: 200, data: await res.json() };
                }""",
                {'h': handle, 'appId': IG_APP_ID},
            )
        except Exception:
            return None
        if not result or result.get('status') != 200:
            # 404 (gone), 401/403 (rate-limited), etc. — skip this candidate.
            return None

        user = ((result.get('data') or {}).get('data') or {}).get('user')
        if not user:
            return None

        bio = (user.get('biography') or '').strip()

        latest_post_ts: int | None = None
        timeline = user.get('edge_owner_to_timeline_media') or {}
        post_count = int(timeline.get('count') or 0)
        edges = timeline.get('edges') or []
        # Take the MAX timestamp across returned edges — the first edge can be a
        # pinned (old) post, which would understate recency.
        for edge in edges:
            ts = (edge.get('node') or {}).get('taken_at_timestamp')
            if ts and (latest_post_ts is None or int(ts) > latest_post_ts):
                latest_post_ts = int(ts)

        # Profile picture — prefer the HD variant. These are signed scontent CDN
        # URLs that expire, so callers download the bytes immediately rather than
        # storing the URL.
        profile_pic_url = (
            (user.get('profile_pic_url_hd') or '').strip()
            or (user.get('profile_pic_url') or '').strip()
            or None
        )

        return {
            'name': (user.get('full_name') or '').strip() or handle,
            'description': bio[:500] or None,
            'website_url': (user.get('external_url') or '').strip() or None,
            'is_private': bool(user.get('is_private')),
            'post_count': post_count,
            'latest_post_ts': latest_post_ts,
            'user_id': (user.get('id') or '').strip() or None,
            'profile_pic_url': profile_pic_url,
        }

    async def _latest_post_ts(self, page: Page, user_id: str) -> int | None:
        """Fallback recency probe: fetch the user's most recent feed items and
        return the newest `taken_at` timestamp. Used when web_profile_info returned
        a post count but no timeline edges (a common IG response shape)."""
        try:
            result = await page.evaluate(
                """async ({ uid, appId }) => {
                    const res = await fetch(
                        '/api/v1/feed/user/' + encodeURIComponent(uid) + '/?count=12',
                        { headers: { 'x-ig-app-id': appId }, credentials: 'include' },
                    );
                    if (!res.ok) return null;
                    return await res.json();
                }""",
                {'uid': user_id, 'appId': IG_APP_ID},
            )
        except Exception:
            return None
        if not result:
            return None
        latest: int | None = None
        for item in (result.get('items') or []):
            ts = item.get('taken_at')
            if ts and (latest is None or int(ts) > latest):
                latest = int(ts)
        return latest

    async def _fetch_image_b64(self, page: Page, url: str) -> dict | None:
        """Download an image through the logged-in page (so IG's CDN sees the
        session cookies/headers) and return it base64-encoded. IG profile-pic
        URLs are signed and hotlink-protected. We fetch through the browser
        context's request API (Playwright's APIRequestContext) rather than an
        in-page `fetch()`: the request carries the session cookies but is NOT
        subject to the page's same-origin/CORS policy, so reading the CDN bytes
        actually succeeds. Returns {'b64', 'type'}."""
        try:
            resp = await page.context.request.get(
                url, headers={'referer': 'https://www.instagram.com/'}, timeout=20000
            )
            if not resp.ok:
                return None
            body = await resp.body()
            ctype = (resp.headers or {}).get('content-type', 'image/jpeg')
        except Exception:
            return None
        if not body:
            return None
        return {'b64': base64.b64encode(body).decode('ascii'), 'type': ctype}

    async def _ensure_logged_in(self, page: Page) -> None:
        """Confirm the saved session is still authenticated; raise if not."""
        await page.goto('https://www.instagram.com/', wait_until='domcontentloaded', timeout=30000)
        await asyncio.sleep(2)
        body = (await page.evaluate('() => document.body.innerText.toLowerCase()')) or ''
        if 'log into instagram' in body or 'log in to instagram' in body:
            raise SessionExpiredError(
                'Instagram session expired. Re-run: python setup_session.py'
            )
        if '/consent/' in page.url:
            await self._dismiss_consent(page)

    async def fetch_profile_pics(self, handles: list[str]) -> dict[str, dict]:
        """For each handle, fetch its current profile picture bytes.

        Returns {handle: {'b64', 'type'}} for handles whose picture was
        retrieved. Used to backfill cover images for shops already in the DB.
        """
        session_path = self._session_path()
        out: dict[str, dict] = {}

        async with async_playwright() as pw:
            browser = await pw.chromium.launch(
                headless=self.headless,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                ],
            )
            context = await browser.new_context(
                viewport={'width': 1280, 'height': 900},
                user_agent=(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                    'AppleWebKit/537.36 (KHTML, like Gecko) '
                    'Chrome/124.0.0.0 Safari/537.36'
                ),
                locale='en-US',
                storage_state=session_path,
            )
            page = await context.new_page()
            if _HAS_STEALTH:
                await _stealth_async(page)

            try:
                await self._ensure_logged_in(page)
                for handle in handles:
                    enriched = await self._enrich(page, handle)
                    if not enriched:
                        _agent_log(f'@{handle}: skip — enrich failed (rate-limited or gone)')
                        await asyncio.sleep(self._jittered(self.enrich_delay))
                        continue
                    pic_url = enriched.get('profile_pic_url')
                    if not pic_url:
                        _agent_log(f'@{handle}: skip — no profile picture')
                        await asyncio.sleep(self._jittered(self.enrich_delay))
                        continue
                    pic = await self._fetch_image_b64(page, pic_url)
                    if pic:
                        out[handle] = pic
                        _agent_log(f'@{handle}: got profile picture')
                    else:
                        _agent_log(f'@{handle}: skip — could not download profile picture')
                    await asyncio.sleep(self._jittered(self.enrich_delay))
            finally:
                await browser.close()

        return out

    async def _dismiss_consent(self, page: Page) -> None:
        for _ in range(8):
            if '/consent/' not in page.url:
                return
            clicked = await page.evaluate("""
                () => {
                    const labels = ['get started', 'continue', 'use limited data', 'allow', 'no thanks', 'decline'];
                    const btns = Array.from(document.querySelectorAll('button,[role="button"]'));
                    for (const label of labels) {
                        const b = btns.find(b => b.innerText.trim().toLowerCase().includes(label));
                        if (b) { b.click(); return true; }
                    }
                    return false;
                }
            """)
            if not clicked:
                break
            await asyncio.sleep(2)
