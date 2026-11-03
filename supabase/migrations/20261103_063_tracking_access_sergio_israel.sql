-- Seguimiento PROSOEL: habilitar específicamente a Israel sin ampliar permisos
-- de normalización, importación de precios ni administración de fuentes.
create or replace function private.can_access_tracking()
returns boolean language sql stable security definer set search_path=''
as $$
  select (select auth.uid()) is not null
     and lower(coalesce((select auth.jwt())->>'email','')) in
       ('compras@prosoel.es','israel@prosoel.es')
     and exists (
       select 1 from public.app_users u
       where lower(u.email)=lower(coalesce((select auth.jwt())->>'email',''))
         and u.active
     )
$$;
revoke all on function private.can_access_tracking() from public,anon,authenticated;
grant execute on function private.can_access_tracking() to authenticated;

do $apply$
declare rec record;
begin
  for rec in
    select * from (values
      ('tracking_sources','Solo Sergio lee fuentes seguimiento'),
      ('tracking_orders','Solo Sergio lee pedidos seguimiento'),
      ('tracking_lines','Solo Sergio lee lineas seguimiento'),
      ('tracking_decisions','Solo Sergio lee decisiones seguimiento'),
      ('tracking_legacy_review','solo Sergio consulta pedidos históricos ambiguos'),
      ('tracking_drive_catalog','solo Sergio consulta fuentes Drive'),
      ('tracking_drive_folders','solo Sergio consulta inventario carpetas'),
      ('tracking_sync_runs','solo Sergio consulta log sincronizacion'),
      ('tracking_sync_settings','solo Sergio consulta configuracion sync'),
      ('tracking_sync_events','Sergio ve historial de sincronizaciones'),
      ('tracking_manual_refresh_queue','Sergio consulta cola manual')
    ) as t(tbl,old_policy)
  loop
    execute format('drop policy if exists %I on public.%I',rec.old_policy,rec.tbl);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.can_access_tracking()))',
      'Seguimiento Sergio e Israel consultan '||rec.tbl,rec.tbl);
  end loop;
end $apply$;

drop policy if exists "Solo Sergio registra cierres reversibles"
 on public.tracking_decisions;
create policy "Seguimiento Sergio e Israel registran cierres auditados"
 on public.tracking_decisions for insert to authenticated
 with check ((select private.can_access_tracking())
   and actor_uid=(select auth.uid())
   and length(btrim(reason)) between 4 and 500);

-- El alta de nuevas obras continúa restringida a Sergio por RLS.
-- Sólo se amplía la función de petición de refresco a los dos usuarios.
create or replace function public.tracking_request_manual_refresh(p_file_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user text;
 v_queued integer:=0;
 v_total integer:=0;
begin
 v_user:=lower(coalesce((select auth.jwt())->>'email',''));
 if not (select private.can_access_tracking()) then
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
   case when p_file_id is null then 1 else 0 end,
   'pending','Solicitud desde PROSOEL Costes'
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
revoke all on function public.tracking_request_manual_refresh(text)
 from public,anon,authenticated;
grant execute on function public.tracking_request_manual_refresh(text) to authenticated;

comment on function private.can_access_tracking() is
 'Acceso explícito al módulo de seguimiento únicamente a Sergio e Israel, cuentas activas.';
