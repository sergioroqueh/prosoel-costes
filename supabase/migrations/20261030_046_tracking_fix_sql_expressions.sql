create or replace function public.tracking_apply_pilot_snapshot(
 p_source_id text, p_orders jsonb, p_modified_at timestamptz, p_md5 text, p_run_id bigint
) returns jsonb
language plpgsql security invoker
set search_path = ''
as $$
declare
  f public.tracking_drive_catalog%rowtype;
  o jsonb;
  l jsonb;
  old_order public.tracking_orders%rowtype;
  old_line public.tracking_lines%rowtype;
  created_order bigint;
  seen_order_refs text[] := '{}';
  existing_orders int;
  old_max_row int;
  seen_existing int := 0;
  order_line_count int;
  created_orders int := 0;
  created_lines int := 0;
  changed_status int := 0;
  changed_notes int := 0;
  changed_albarans int := 0;
  changed_quantity int := 0;
  total_lines int := 0;
  v_order_ref text;
  v_order_row int;
  v_line_row int;
  v_green boolean;
  v_si boolean;
  v_final boolean;
  v_ref text;
  v_description text;
  v_qty numeric;
  v_note text;
  v_alb text;
  v_date date;
  v_supplier text;
  v_location text;
  v_responsible text;
  v_receipt date;
  v_before jsonb;
  v_after jsonb;
begin
  -- service_role is the only executable database API role. The caller must also
  -- authenticate with the cron credential in the Edge function.
  if current_user <> 'service_role' then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  if p_orders is null or jsonb_typeof(p_orders)<>'array'
     or jsonb_array_length(p_orders) not between 1 and 20000 then
    raise exception 'invalid_snapshot';
  end if;
  if p_modified_at is null or p_modified_at > now()+interval '1 day'
     or p_md5 is null or length(p_md5)>128 then
    raise exception 'invalid_source_version';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_source_id, 990211));
  select * into f from public.tracking_drive_catalog
  where file_id=p_source_id for update;
  if not found or f.status <> 'approved' or not f.automatic_import_enabled then
    raise exception 'source_not_authorized';
  end if;
  if not exists(select 1 from public.tracking_sync_settings
       where id=1 and automatic_sync_enabled and auth_setup='validated') then
    raise exception 'automatic_sync_disabled';
  end if;
  if not exists(select 1 from public.tracking_sources where id=p_source_id) then
    raise exception 'source_not_imported';
  end if;
  select count(*),coalesce(max(source_row),0) into existing_orders,old_max_row
  from public.tracking_orders where source_id=p_source_id;
  select greatest(old_max_row,coalesce(max(l.source_row),0))
    into old_max_row from public.tracking_lines l
    join public.tracking_orders o on o.id=l.order_id
    where o.source_id=p_source_id;
  if existing_orders=0 then raise exception 'baseline_missing'; end if;

  -- Validate EVERY item before commit. Any exception rolls back all changes.
  for o in select value from pg_catalog.jsonb_array_elements(p_orders) as x(value) loop
    v_order_ref := pg_catalog.btrim(o->>'order_reference');
    v_order_row := (o->>'source_row')::int;
    v_date := (o->>'order_date')::date;
    v_supplier := coalesce(o->>'supplier','');
    v_responsible := coalesce(o->>'responsible','');
    v_location := coalesce(o->>'delivery_location','');
    v_receipt := nullif(o->>'reception_date','')::date;
    if v_order_ref is null or v_order_ref = '' or v_order_row < 3 or v_date is null
       or v_order_ref = any(seen_order_refs) then
      raise exception 'invalid_or_duplicate_order';
    end if;
    seen_order_refs := pg_catalog.array_append(seen_order_refs,v_order_ref);
    if jsonb_typeof(o->'lines')<>'array'
       or jsonb_array_length(o->'lines')<1
       or jsonb_array_length(o->'lines')>2000 then
      raise exception 'invalid_order_lines';
    end if;
    total_lines := total_lines + jsonb_array_length(o->'lines');
    if total_lines>120000 then raise exception 'too_many_lines'; end if;

    select * into old_order from public.tracking_orders
      where source_id=p_source_id and order_reference=v_order_ref;
    if found then
      seen_existing := seen_existing+1;
      if old_order.source_row <> v_order_row or old_order.order_date <> v_date
         or old_order.supplier <> v_supplier
         or old_order.responsible <> v_responsible
         or old_order.delivery_location <> v_location then
        raise exception 'existing_order_structure_changed';
      end if;
      select count(*) into order_line_count from public.tracking_lines where order_id=old_order.id;
      if order_line_count <> jsonb_array_length(o->'lines') then
        raise exception 'existing_order_lines_changed';
      end if;
      created_order:=old_order.id;
    else
      -- New orders only at the end, otherwise rows would move and require reconciliation.
      if v_order_row <= old_max_row then raise exception 'non_appended_new_order'; end if;
      insert into public.tracking_orders(source_id,source_row,order_reference,order_date,
         supplier,responsible,delivery_location,drive_finalized,reception_date)
      values(p_source_id,v_order_row,v_order_ref,v_date,
         v_supplier,v_responsible,v_location,(o->>'drive_finalized')::boolean,v_receipt)
      returning id into created_order;
      created_orders:=created_orders+1;
      insert into public.tracking_sync_events(source_id,run_id,order_id,event_type,after_json)
       values(p_source_id,p_run_id,created_order,'new_order',
         pg_catalog.jsonb_build_object('reference',v_order_ref,'date',v_date));
    end if;
    for l in select value from pg_catalog.jsonb_array_elements(o->'lines') as x(value) loop
      v_line_row := (l->>'source_row')::int;
      v_ref:=coalesce(l->>'reference','');
      v_description:=coalesce(l->>'description','');
      v_qty:=(l->>'requested_qty')::numeric;
      v_note:=coalesce(l->>'observations','');
      v_alb:=coalesce(l->>'albaran','');
      v_green:=coalesce((l->>'source_green')::boolean,false);
      v_si:=coalesce((l->>'source_si')::boolean,false);
      v_final:=coalesce((l->>'drive_line_finalized')::boolean,false);
      if v_line_row < v_order_row or v_description='' or v_qty is null or v_qty<0
         or v_final is distinct from (v_green and v_si) then
        raise exception 'invalid_material_line';
      end if;
      if old_order.id is not null and created_order=old_order.id then
        select * into old_line from public.tracking_lines
          where order_id=created_order and source_row=v_line_row;
        if not found or old_line.reference<>v_ref or old_line.description<>v_description then
          raise exception 'existing_line_identity_changed';
        end if;
        if old_line.drive_line_finalized and not v_final then
          raise exception 'received_line_reopened_requires_review';
        end if;
        v_before:=pg_catalog.to_jsonb(old_line);
        if old_line.drive_line_finalized is distinct from v_final then
          changed_status:=changed_status+1;
          insert into public.tracking_sync_events(source_id,run_id,order_id,line_id,event_type,before_json,after_json)
            values(p_source_id,p_run_id,created_order,old_line.id,'status_change',
              pg_catalog.jsonb_build_object('received',old_line.drive_line_finalized),
              pg_catalog.jsonb_build_object('received',v_final));
        end if;
        if old_line.requested_qty is distinct from v_qty then
          changed_quantity:=changed_quantity+1;
          insert into public.tracking_sync_events(source_id,run_id,order_id,line_id,event_type,before_json,after_json)
          values(p_source_id,p_run_id,created_order,old_line.id,'qty_change',
             pg_catalog.jsonb_build_object('qty',old_line.requested_qty),
             pg_catalog.jsonb_build_object('qty',v_qty));
        end if;
        if old_line.observations is distinct from v_note then
          changed_notes:=changed_notes+1;
          insert into public.tracking_sync_events(source_id,run_id,order_id,line_id,event_type,before_json,after_json)
          values(p_source_id,p_run_id,created_order,old_line.id,'observation_change',
             pg_catalog.jsonb_build_object('text',old_line.observations),
             pg_catalog.jsonb_build_object('text',v_note));
        end if;
        if old_line.albaran is distinct from v_alb then
          changed_albarans:=changed_albarans+1;
          insert into public.tracking_sync_events(source_id,run_id,order_id,line_id,event_type,before_json,after_json)
          values(p_source_id,p_run_id,created_order,old_line.id,'albaran_change',
             pg_catalog.jsonb_build_object('text',old_line.albaran),
             pg_catalog.jsonb_build_object('text',v_alb));
        end if;
        update public.tracking_lines set requested_qty=v_qty,albaran=v_alb,
          observations=v_note,source_green=v_green,source_si=v_si,drive_line_finalized=v_final
          where id=old_line.id;
      else
        insert into public.tracking_lines(order_id,source_row,reference,description,
          requested_qty,albaran,observations,source_green,source_si,drive_line_finalized)
        values(created_order,v_line_row,v_ref,v_description,v_qty,v_alb,v_note,v_green,v_si,v_final)
        returning id into old_line.id;
        created_lines:=created_lines+1;
        insert into public.tracking_sync_events(source_id,run_id,order_id,line_id,event_type,after_json)
          values(p_source_id,p_run_id,created_order,old_line.id,'new_line',
            pg_catalog.jsonb_build_object('row',v_line_row,'reference',v_ref,'qty',v_qty));
      end if;
    end loop;
    -- Prevent malformed snapshots from asserting a complete order with incomplete lines.
    if (o->>'drive_finalized')::boolean is distinct from
       (select bool_and(drive_line_finalized) from public.tracking_lines where order_id=created_order) then
       raise exception 'order_completion_not_equal_to_lines';
    end if;
    -- Status of the order is derived from line confirmations, not from a single SI.
    update public.tracking_orders set drive_finalized=(o->>'drive_finalized')::boolean,
      reception_date=v_receipt where id=created_order;
    -- Important: no update/delete of tracking_decisions, preserving manual closures.
  end loop;
  if seen_existing<>existing_orders then
    raise exception 'source_order_removed_or_renamed';
  end if;
  update public.tracking_sources set modified_at_source=p_modified_at,
    synced_at=now(),sync_mode='scheduled' where id=p_source_id;
  update public.tracking_drive_catalog set last_imported_at=now(),
    last_imported_modified_at=p_modified_at,import_error=null,drive_modified_at=p_modified_at
    where file_id=p_source_id;
  return pg_catalog.jsonb_build_object('new_orders',created_orders,'new_lines',created_lines,
    'status_changes',changed_status,'quantity_changes',changed_quantity,
    'observation_changes',changed_notes,'albaran_changes',changed_albarans,
    'total_orders',jsonb_array_length(p_orders),'total_lines',total_lines);
end
$$;
revoke all on function public.tracking_apply_pilot_snapshot(text,jsonb,timestamptz,text,bigint) from public,anon,authenticated;
grant execute on function public.tracking_apply_pilot_snapshot(text,jsonb,timestamptz,text,bigint) to service_role;
