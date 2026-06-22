"""
One-time Instagram login for the discovery worker.

Opens a visible browser — log in with the DEDICATED / throwaway IG account
(not your personal or business account; scraping carries a ban risk). The
session is saved to sessions/instagram.json and reused by the worker.

Usage:
  python setup_session.py

Re-run this whenever the worker reports the session has expired (~every
30–90 days, or after IG logs the account out).
"""

import asyncio
from pathlib import Path

from playwright.async_api import async_playwright, Page

SESSIONS_DIR = Path(__file__).parent / 'sessions'
LOGIN_URL = 'https://www.instagram.com/accounts/login/'
TIMEOUT_SECONDS = 300  # 5 minutes to finish logging in
REQUIRED_COOKIE = 'sessionid'  # definitive auth cookie — don't save before it's set

COOKIE_SELECTORS = [
    'button:has-text("Allow all cookies")',
    'button:has-text("Accept all cookies")',
    'button:has-text("Accept All")',
    'button:has-text("Allow essential and optional cookies")',
    'button:has-text("同意")',
    'button:has-text("接受")',
    'button:has-text("全部接受")',
]


def _logged_in(url: str) -> bool:
    return (
        'instagram.com' in url
        and 'login' not in url
        and 'signup' not in url
        and 'challenge' not in url
        and 'consent' not in url
    )


async def dismiss_cookie_banner(page: Page) -> None:
    for selector in COOKIE_SELECTORS:
        try:
            btn = page.locator(selector).first
            if await btn.is_visible(timeout=1000):
                await btn.click()
                await asyncio.sleep(0.5)
                return
        except Exception:
            continue


async def wait_for_login(page: Page) -> bool:
    print('  Waiting for login... (saves automatically once detected)')
    print('  Complete any 2FA / consent / challenge prompts in the browser window.\n')
    for i in range(TIMEOUT_SECONDS):
        await asyncio.sleep(1)
        if i < 15:
            await dismiss_cookie_banner(page)
        if not _logged_in(page.url):
            continue
        # Hold for a few seconds to catch post-login redirects (consent/challenge).
        stable = True
        for _ in range(8):
            await asyncio.sleep(1)
            if not _logged_in(page.url):
                stable = False
                break
        if not stable:
            continue
        cookies = {c['name'] for c in await page.context.cookies()}
        if REQUIRED_COOKIE not in cookies:
            continue
        return True
    return False


async def main() -> None:
    SESSIONS_DIR.mkdir(exist_ok=True)
    session_file = SESSIONS_DIR / 'instagram.json'

    print('\n' + '=' * 50)
    print('  Instagram session setup')
    print('=' * 50)
    print('  Log in with your DEDICATED / throwaway account.')
    print('  A SEPARATE Chrome window is opening (titled "Instagram").')
    print('  If you do not see it, check your taskbar / press Alt+Tab.')
    print('  Keep THIS window open — it closes itself once login is detected.\n')

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False, args=['--start-maximized'])
        context = await browser.new_context(
            no_viewport=True,  # let the window actually maximize so it's easy to spot
            user_agent=(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                'AppleWebKit/537.36 (KHTML, like Gecko) '
                'Chrome/124.0.0.0 Safari/537.36'
            ),
        )
        page = await context.new_page()
        await page.bring_to_front()
        await page.goto(LOGIN_URL)
        await asyncio.sleep(2)
        await dismiss_cookie_banner(page)

        if await wait_for_login(page):
            await asyncio.sleep(2)
            await context.storage_state(path=str(session_file))
            print(f'  [OK] Logged in! Session saved to {session_file}')
        else:
            print(f'  [TIMEOUT] Login not detected within {TIMEOUT_SECONDS}s. Try again.')

        await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
