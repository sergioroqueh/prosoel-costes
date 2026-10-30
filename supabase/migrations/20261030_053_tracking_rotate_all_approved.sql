-- Distribuye la revisión de 27 libros en un ciclo de 54 minutos.
-- Una sola descarga a la vez: cada 2 minutos se comprueba un libro diferente.
-- La lista es dinámica y solo incluye aprobados con acceso habilitado.
update public.tracking_drive_catalog
set validation_status='compatible',validation_at=now(),
 validation_stats='{"orders":118,"lines":488,"received":395,"completed":91,"partial":10,"noneReceived":17}'::jsonb,
 validation_error=null
where file_id='1nquTLnM2pUwA0Gt5jgjfKDcSWaLAgslJ' and status='approved';
update public.tracking_drive_catalog set automatic_import_enabled=true
where status='approved' and validation_status='compatible';
update public.tracking_sync_settings set automatic_sync_enabled=true,
 requested_interval_minutes=54,updated_at=now()
where id=1 and auth_setup='validated';
select cron.unschedule('prosoel-hermafer-drive-every-hour');
select cron.schedule(
 'prosoel-tracking-rotation-every-2min',
 '*/2 * * * *',
 $cron$
 select net.http_post(
  url:='https://kusbndefngttaiytcrui.supabase.co/functions/v1/drive-hourly-sync',
  headers:=jsonb_build_object(
   'Content-Type','application/json',
   'x-prosoel-cron-secret',
    (select decrypted_secret from vault.decrypted_secrets
      where name='prosoel_tracking_cron_token')
  ),
  body:=jsonb_build_object(
   'slot', mod(
     floor(extract(epoch from now())/120)::bigint,
     greatest(1,(select count(*) from public.tracking_drive_catalog
       where status='approved' and automatic_import_enabled))::bigint
   )::int
  ),
  timeout_milliseconds:=30000
 );
 $cron$
);
