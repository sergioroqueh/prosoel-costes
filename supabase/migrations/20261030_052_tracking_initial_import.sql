-- Inicialización transaccional: solo XLSX compatible, importación única, sin activar cron.
create or replace function public.tracking_initial_import(
 p_source_id text,p_orders jsonb,p_modified_at timestamptz,p_md5 text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 f public.tracking_drive_catalog%rowtype;
 o jsonb; l jsonb; order_id bigint;
 order_ref text; order_row integer; line_row integer;
 seen_ref text[]:='{}';
 seen_line_rows integer[]:='{}';
 expected_lines int; line_count int:=0; count_orders int:=0;
 received_count int:=0; completed_count int:=0;
 completed bool; line_done bool; all_done bool;
begin
 if current_user<>'service_role' then
   raise exception 'service_role_required' using errcode='42501';
 end if;
 if p_source_id is null or p_modified_at is null or
    p_orders is null or jsonb_typeof(p_orders)<>'array' or
    jsonb_array_length(p_orders) not between 1 and 20000 then
   raise exception 'invalid_initial_snapshot';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_source_id,990211));
 select * into f from public.tracking_drive_catalog where file_id=p_source_id for update;
 if not found or f.status<>'candidate' or f.validation_status<>'compatible'
    or f.source_mime<>'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    or f.validation_at is null or f.validation_at<now()-interval '12 hours' then
   raise exception 'source_not_validated';
 end if;
 if exists(select 1 from public.tracking_sources where id=p_source_id)
    or exists(select 1 from public.tracking_orders where source_id=p_source_id) then
   raise exception 'source_already_imported';
 end if;
 if (f.validation_stats->>'orders')::int <> jsonb_array_length(p_orders) then
   raise exception 'order_count_changed_since_validation';
 end if;
 expected_lines:=(f.validation_stats->>'lines')::int;
 if expected_lines is null or expected_lines<1 then
   raise exception 'invalid_validation_baseline';
 end if;
 insert into public.tracking_sources(id,display_name,drive_url,modified_at_source,synced_at,sync_mode)
 values(p_source_id,f.source_title,
   'https://drive.google.com/file/d/'||p_source_id||'/view',
   p_modified_at,now(),'snapshot');
 for o in select value from pg_catalog.jsonb_array_elements(p_orders) x(value) loop
   order_ref:=btrim(coalesce(o->>'order_reference',''));
   order_row:=(o->>'source_row')::integer;
   completed:=(o->>'drive_finalized')::boolean;
   if order_ref='' or order_ref=any(seen_ref) or order_row<3
      or nullif(o->>'order_date','') is null
      or jsonb_typeof(o->'lines')<>'array'
      or jsonb_array_length(o->'lines') not between 1 and 2000
      or completed is null then
     raise exception 'ambiguous_order_or_duplicate';
   end if;
   seen_ref:=pg_catalog.array_append(seen_ref,order_ref);
   all_done:=true;
   insert into public.tracking_orders(
     source_id,source_row,order_reference,order_date,supplier,responsible,
     delivery_location,drive_finalized,reception_date
   ) values(
     p_source_id,order_row,order_ref,(o->>'order_date')::date,
     coalesce(o->>'supplier',''),coalesce(o->>'responsible',''),
     coalesce(o->>'delivery_location',''),completed,
     nullif(o->>'reception_date','')::date
   ) returning id into order_id;
   for l in select value from pg_catalog.jsonb_array_elements(o->'lines') x(value) loop
     line_row:=(l->>'source_row')::integer;
     line_done:=(l->>'drive_line_finalized')::boolean;
     if line_row<order_row or line_row=any(seen_line_rows)
       or nullif(l->>'description','') is null
       or (l->>'requested_qty')::numeric<0
       or (l->>'requested_qty')::numeric is null
       or line_done is null
       or line_done is distinct from ((l->>'source_green')::boolean and (l->>'source_si')::boolean) then
       raise exception 'ambiguous_line_or_duplicate';
     end if;
     seen_line_rows:=pg_catalog.array_append(seen_line_rows,line_row);
     insert into public.tracking_lines(
       order_id,source_row,reference,description,requested_qty,albaran,
       observations,source_green,source_si,drive_line_finalized
     )values(order_id,line_row,coalesce(l->>'reference',''),l->>'description',
       (l->>'requested_qty')::numeric,coalesce(l->>'albaran',''),
       coalesce(l->>'observations',''),(l->>'source_green')::boolean,
       (l->>'source_si')::boolean,line_done);
     line_count:=line_count+1;
     if line_done then received_count:=received_count+1; else all_done:=false; end if;
   end loop;
   if completed is distinct from all_done then
     raise exception 'order_closed_contradicts_materials';
   end if;
   if completed then completed_count:=completed_count+1; end if;
   count_orders:=count_orders+1;
 end loop;
 if line_count<>expected_lines or count_orders<>(f.validation_stats->>'orders')::int or
   received_count<>(f.validation_stats->>'received')::int or
   completed_count<>(f.validation_stats->>'completed')::int then
   raise exception 'snapshot_changed_or_inconsistent';
 end if;
 update public.tracking_drive_catalog set
   status='approved',automatic_import_enabled=false,
   last_imported_at=now(),last_imported_modified_at=p_modified_at,
   last_imported_md5=case when p_md5 ~ '^[a-fA-F0-9]{32}$' then lower(p_md5) else null end,
   import_error=null
   where file_id=p_source_id;
 return jsonb_build_object('source_id',p_source_id,'orders',count_orders,
   'lines',line_count,'received',received_count,'completed',completed_count,
   'automatic_sync',false);
end $$;
revoke all on function public.tracking_initial_import(text,jsonb,timestamptz,text) from public,anon,authenticated;
grant execute on function public.tracking_initial_import(text,jsonb,timestamptz,text) to service_role;
grant insert on public.tracking_sources to service_role;
grant usage,select on sequence public.tracking_orders_id_seq,public.tracking_lines_id_seq to service_role;
