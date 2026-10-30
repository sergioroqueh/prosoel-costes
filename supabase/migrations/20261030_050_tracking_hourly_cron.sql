-- Cron horario: invoca sólo el backend con token secreto leído desde Vault.
-- Sin claves ni tokens incrustados en texto ni en GitHub.
select cron.schedule(
  'prosoel-hermafer-drive-every-hour',
  '0 * * * *',
  $cron$
  select net.http_post(
    url:='https://kusbndefngttaiytcrui.supabase.co/functions/v1/drive-hourly-sync',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-prosoel-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets
       where name='prosoel_tracking_cron_token')
    ),
    body:='{"scheduled":true}'::jsonb,
    timeout_milliseconds:=30000
  );
  $cron$
);
