-- Applied with Supabase migration pulse_support_server_only_grants on 2026-11-21.
-- The website uses server-side service-role requests; public roles have no direct table API.
revoke all on table public.pulse_support_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.pulse_support_requests to service_role;
