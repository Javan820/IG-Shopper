-- ============================================================
-- Migration 004: Grant table/sequence/function access to
-- anon, authenticated, and service_role.
-- Required because raw SQL migrations do not trigger
-- Supabase's automatic post-create grants.
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
