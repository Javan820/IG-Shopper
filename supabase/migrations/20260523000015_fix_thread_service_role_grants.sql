-- service_role bypasses RLS but still needs table-level GRANTs.
-- Migrations 13 and 14 only granted to 'authenticated'/'anon',
-- so the admin client (service_role) was denied on threads.
GRANT ALL ON threads        TO service_role;
GRANT ALL ON thread_likes   TO service_role;
GRANT ALL ON thread_replies TO service_role;
