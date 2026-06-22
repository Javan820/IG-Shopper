-- ============================================================
-- Automatic shop discovery
--   * shop_discovery_jobs: a simple queue the admin panel writes
--     to and a local Playwright worker polls. The worker scrapes
--     Instagram for candidate shops and inserts them into `shops`
--     as status='pending' for admin review.
--   * shops.source: distinguishes auto-discovered rows from
--     user-submitted ones in the admin queue.
-- Only the service role touches shop_discovery_jobs (admin panel
-- via createAdminClient + the worker), so RLS is enabled with no
-- anon/authenticated policies.
-- ============================================================

CREATE TABLE IF NOT EXISTS shop_discovery_jobs (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category       text NOT NULL,
  target_count   int  NOT NULL DEFAULT 10 CHECK (target_count BETWEEN 1 AND 50),
  status         text NOT NULL DEFAULT 'queued'
                   CHECK (status IN ('queued', 'running', 'done', 'error')),
  requested_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  found_count    int  NOT NULL DEFAULT 0,
  inserted_count int  NOT NULL DEFAULT 0,
  error          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  started_at     timestamptz,
  finished_at    timestamptz
);

-- Worker grabs the oldest queued job; this index serves that lookup.
CREATE INDEX IF NOT EXISTS shop_discovery_jobs_status_created_idx
  ON shop_discovery_jobs (status, created_at);

ALTER TABLE shop_discovery_jobs ENABLE ROW LEVEL SECURITY;
-- No policies: service role bypasses RLS; everyone else is denied.

-- Mark where a shop came from so the approval queue can flag auto rows.
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'user'
    CHECK (source IN ('user', 'discovery'));

-- Raw SQL migrations don't trigger Supabase's automatic grants.
GRANT ALL ON shop_discovery_jobs TO service_role;
