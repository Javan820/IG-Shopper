-- ============================================================
-- Discovery blocklist
--   Handles the admin has rejected and cleared from the queue.
--   Without this, "Clear rejected" deletes the shop rows and the
--   discovery worker happily re-discovers and re-inserts the exact
--   same shops on its next run (and users can re-submit them).
--   * clearRejectedShops copies handles here before deleting.
--   * The worker unions these handles into its known-handles set.
--   * submitShop rejects submissions matching a blocklisted handle.
--   * approveShop removes a handle from the blocklist so an admin
--     approval always wins over an old rejection.
-- Only the service role touches this table (admin actions + worker),
-- so RLS is enabled with no anon/authenticated policies.
-- ============================================================

CREATE TABLE IF NOT EXISTS discovery_blocklist (
  ig_handle  text PRIMARY KEY,
  reason     text NOT NULL DEFAULT 'rejected',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE discovery_blocklist ENABLE ROW LEVEL SECURITY;
-- No policies: service role bypasses RLS; everyone else is denied.

GRANT ALL ON discovery_blocklist TO service_role;
