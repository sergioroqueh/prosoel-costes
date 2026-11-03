-- PROSOEL / Tracking: alta supervisada de nuevas obras y cola manual de consultas.
-- No crea importaciones ni cambia las fuentes actuales.
create table if not exists public.tracking_new_work_requests (
  id bigint generated always as identity primary key,
  work_name text not null check (length(btrim(work_name)) between 4 and 120),
  drive_url text not null check (length(drive_url) between 30 and 600),
  file_id text not null unique check (file_id ~ '^[A-Za-z0-9_-]{16,128}$'),
  status text not null default 'pending' check (status in ('pending','reviewed','rejected')),
  requested_by text not null default lower(coalesce(auth.jwt()->>'email','')),
  requested_at timestamptz not null default now(),
  review_note text
);
alter table public.tracking_new_work_requests enable row level security;
revoke all on public.tracking_new_work_requests from public,anon,authenticated;
grant select,insert on public.tracking_new_work_requests to authenticated;
grant usage,select on sequence public.tracking_new_work_requests_id_seq to authenticated;
create policy "Sergio lee altas pendientes" on public.tracking_new_work_requests for select to authenticated
  using ((select auth.uid()) is not null and
    lower(coalesce((select auth.jwt())->>'email',''))='compras@prosoel.es' and
    (select private.has_app_access()));
create policy "Sergio registra altas pendientes" on public.tracking_new_work_requests for insert to authenticated
  with check ((select auth.uid()) is not null and
    lower(coalesce((select auth.jwt())->>'email',''))='compras@prosoel.es' and
    lower(requested_by)='compras@prosoel.es' and
    (select private.has_app_access()) and
    not exists (select 1 from public.tracking_drive_catalog c where c.file_id=tracking_new_work_requests.file_id));
comment on table public.tracking_new_work_requests is
  'Solicitudes privadas de nuevas obras. Son datos propuestos, NO fuentes de pedidos aprobadas, y NO activan sincronización.';

create table if not exists public.tracking_manual_refresh_queue (
  source_id text primary key references public.tracking_drive_catalog(file_id) on delete restrict,
  requested_by text not null,
  requested_at timestamptz not null default now(),
  claimed_at timestamptz,
  processed_at timestamptz,
  priority smallint not null default 1,
  status text not null default 'pending' check (status in ('pending','running','done','error')),
  message text,
  attempts integer not null default 0
);
create index if not exists tracking_manual_queue_pending on public.tracking_manual_refresh_queue(status,priority,requested_at);
alter table public.tracking_manual_refresh_queue enable row level security;
revoke all on public.tracking_manual_refresh_queue from public,anon,authenticated;
grant select on public.tracking_manual_refresh_queue to authenticated;
create policy "Sergio consulta cola manual" on public.tracking_manual_refresh_queue for select to authenticated
 using ((select auth.uid()) is not null and
   lower(coalesce((select auth.jwt())->>'email',''))='compras@prosoel.es' and
   (select private.has_app_access()));

create or replace function public.tracking_request_manual_refresh(p_file_id text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user text;
  v_queued integer:=0;
  v_total integer:=0;
begin
  v_user:=lower(coalesce((select auth.jwt())->>'email',''));
  if (select auth.uid()) is null or v_user<>'compras@prosoel.es'
     or not (select private.has_app_access())
     or not exists(select 1 from public.app_users
       where lower(email)=v_user and active) then
    raise exception 'not_authorized' using errcode='42501';
  end if;
  if p_file_id is not null and not exists (
    select 1 from public.tracking_drive_catalog
    where file_id=p_file_id and status='approved' and automatic_import_enabled
  ) then raise exception 'source_not_approved'; end if;
  if not exists(select 1 from public.tracking_sync_settings
      where id=1 and automatic_sync_enabled and auth_setup='validated') then
    raise exception 'sync_disabled';
  end if;

  select count(*) into v_total from public.tracking_drive_catalog c
     where c.status='approved' and c.automatic_import_enabled
       and (p_file_id is null or c.file_id=p_file_id);
  if v_total<1 or v_total>60 then raise exception 'unsupported_source_count'; end if;

  insert into public.tracking_manual_refresh_queue
    (source_id,requested_by,requested_at,claimed_at,processed_at,priority,status,message)
  select c.file_id,v_user,now(),null,null,
     case when p_file_id is null then 1 else 0 end,'pending','Solicitud desde PROSOEL Costes'
  from public.tracking_drive_catalog c
  where c.status='approved' and c.automatic_import_enabled
     and (p_file_id is null or c.file_id=p_file_id)
  on conflict(source_id) do update
     set requested_by=excluded.requested_by,
       requested_at=now(),claimed_at=null,processed_at=null,
       priority=excluded.priority,status='pending',
       message='Solicitud desde PROSOEL Costes'
     where public.tracking_manual_refresh_queue.status in ('done','error')
       and public.tracking_manual_refresh_queue.requested_at<now()-interval '3 minutes';
  get diagnostics v_queued=row_count;
  if p_file_id is not null then
    update public.tracking_manual_refresh_queue set priority=0
    where source_id=p_file_id and status='pending' and priority>0;
  end if;
  return jsonb_build_object('queued',v_queued,'target_count',v_total,
    'mode',case when p_file_id is null then 'all' else 'work' end,
    'message','Se procesarán las fuentes una a una; no se modificará Google Drive');
end $$;
revoke all on function public.tracking_request_manual_refresh(text) from public,anon,authenticated;
grant execute on function public.tracking_request_manual_refresh(text) to authenticated;

create or replace function public.tracking_claim_manual_refresh()
returns text language plpgsql security invoker set search_path=''
as $$
declare v_source text;
begin
  if current_user<>'service_role' then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  with chosen as (
     select q.source_id from public.tracking_manual_refresh_queue q
     join public.tracking_drive_catalog c on c.file_id=q.source_id
     where (q.status='pending' or
       (q.status='running' and q.claimed_at<now()-interval '10 minutes'))
       and c.status='approved' and c.automatic_import_enabled
     order by q.priority,q.requested_at
     for update of q skip locked limit 1
  )
  update public.tracking_manual_refresh_queue q
     set status='running',claimed_at=now(),attempts=attempts+1
  from chosen
  where q.source_id=chosen.source_id returning q.source_id into v_source;
  return v_source;
end $$;
revoke all on function public.tracking_claim_manual_refresh() from public,anon,authenticated;
grant execute on function public.tracking_claim_manual_refresh() to service_role;
grant select,insert,update on public.tracking_manual_refresh_queue to service_role;
grant select on public.tracking_new_work_requests to service_role;

-- Ventana de procesamiento independiente de la rotación regular.
-- Una petición por ejecución, evitando descargar decenas de Excel simultáneamente.
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
 );
$cron$);
