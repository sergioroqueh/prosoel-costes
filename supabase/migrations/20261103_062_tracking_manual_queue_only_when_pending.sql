-- Evitar llamadas HTTP ociosas: cron manual solo invoca worker cuando hay solicitudes.
select cron.schedule('prosoel-tracking-manual-queue', '30 seconds',
$cron$
 select net.http_post(
   url:='https://kusbndefngttaiytcrui.supabase.co/functions/v1/drive-hourly-sync',
   headers:=jsonb_build_object('Content-Type','application/json',
     'x-prosoel-cron-secret',
     (select decrypted_secret from vault.decrypted_secrets
      where name='prosoel_tracking_cron_token')),
   body:='{"manual_queue":true}'::jsonb,
   timeout_milliseconds:=30000
 ) where exists (
   select 1 from public.tracking_manual_refresh_queue
   where status='pending' or
    (status='running' and claimed_at<now()-interval '10 minutes')
 );
$cron$);