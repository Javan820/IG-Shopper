# Shop Discovery Worker

A local Python worker that scrapes Instagram for Hong Kong shop accounts and
fills the IGShop HK approval queue. It runs **on your PC** (not on Vercel) and
talks directly to Supabase.

## How it fits together

```
Admin panel (/admin/discovery)  ──enqueue──▶  shop_discovery_jobs (Supabase)
                                                      │ poll
                                                      ▼
                                         this worker (Playwright + IG session)
                                                      │ insert pending
                                                      ▼
Admin panel (/admin/shops)  ◀── shops with status='pending', source='discovery'
```

You enqueue a search from the admin panel (category + count). The worker picks
it up, scrapes matching shop accounts, and inserts them as **pending** — nothing
goes live until you approve it in the Shops queue.

## Setup (already done on this PC)

A self-contained virtual environment lives in `worker/.venv` with all
dependencies + Chromium installed, and `.env` is populated from the app's
`.env.local`. The launchers all use `.venv\Scripts\python.exe`, so the system
`python` (which may be the Windows Store stub) is never used.

To rebuild from scratch on a new machine:

```bat
cd "business\BB OIG Shop\worker"
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m playwright install chromium
copy .env.example .env   :: then fill SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
```

## One-time Instagram login (only thing you must do by hand)

Double-click **`setup_login.bat`**. A browser opens — log into the
**dedicated / throwaway** IG account (handle any 2FA), and the session is saved
to `sessions/instagram.json`. You only do this once (re-run if the worker later
reports the session expired).

> **Use a throwaway Instagram account.** Scraping violates Instagram's ToS and
> the account can get rate-limited or banned. Never use your personal or the
> business's real account.

## Running — no terminal needed

The worker **auto-starts hidden at every Windows login** via a Startup shortcut
(`IGShop Discovery Worker`) that runs `launch_worker_hidden.vbs`. You don't open
a terminal. It polls `shop_discovery_jobs` every ~10s and processes queued jobs.

- **Until you've done the IG login above,** it just waits (it won't fail jobs).
- A **single-instance guard** means only one copy ever runs, even if Startup and
  a manual launch overlap.
- **Start it now without rebooting:** double-click `launch_worker_hidden.vbs`.
- **Watch what it's doing:** open `worker.log` (every action is appended there).
- **Stop it:** end the `python.exe` running `discovery_worker.py` in Task Manager.
- **Disable auto-start:** delete the `IGShop Discovery Worker` shortcut from
  `shell:startup` (Win+R → `shell:startup`).

## Tuning discovery

Seed search terms per category live in `CATEGORY_TERMS` at the top of
[`ig_shop_agent.py`](ig_shop_agent.py). Add or refine terms (English or Chinese)
to improve results for a category.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Job shows `error: Instagram session expired` | Re-run `setup_login.bat` |
| Jobs stay `queued` forever | Worker isn't running (or not logged in) — check `worker.log`; run `setup_login.bat` if it says "No Instagram session" |
| Worker can't connect | Check `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` in `.env` |
| 0 found repeatedly | IG may be rate-limiting — raise `SEARCH_DELAY` / `ENRICH_DELAY` in `.env`, wait, or set `HEADLESS=0` to watch |
| Runs too slowly | Lower `SEARCH_DELAY` / `ENRICH_DELAY` in `.env` (defaults 1.1 / 0.85s) |
| Want to watch the browser | Set `HEADLESS=0` in `.env` |

## Files

- `discovery_worker.py` — poll loop + Supabase reads/writes (single-instance)
- `ig_shop_agent.py` — Playwright Instagram account scraper + category terms
- `setup_session.py` — IG login logic (run it via `setup_login.bat`)
- `setup_login.bat` — double-click to do the one-time IG login
- `run_worker.bat` — runs the worker, logging to `worker.log`
- `launch_worker_hidden.vbs` — starts the worker with no window (Startup target)
- `.venv/` — local Python env with all deps + Chromium (gitignored)
- `.env` — Supabase credentials (gitignored)
- `sessions/` — saved IG login (gitignored)
- `worker.log` — runtime log (gitignored)
