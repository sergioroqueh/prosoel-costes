-- Hardening: the DDL event trigger ensure_rls remains active.
-- The event-trigger function is not an RPC endpoint for web users.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;