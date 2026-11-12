-- Aplicar únicamente recepciones confirmadas de líneas existentes, incluso cuando
-- otro pedido del mismo libro requiere revisión estructural.
-- No incorpora pedidos ni líneas nuevos, no reabre recepciones, no altera
-- referencias, cantidades, albaranes, observaciones ni cierres manuales.
create or replace function public.tracking_apply_verified_receipts(
  p_source_id text, p_orders jsonb, p_run_id bigint
) returns jsonb
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_order jsonb;
  v_line jsonb;
  old_order public.tracking_orders%rowtype;
  old_line public.tracking_lines%rowtype;
  verified integer := 0;
  applied integer := 0;
  conflicting integer := 0;
  updated_orders bigint[] := '{}';
  order_id bigint;
begin
  if current_user <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_orders is null or pg_catalog.jsonb_typeof(p_orders) <> 'array'
     or pg_catalog.jsonb_array_length(p_orders) not between 1 and 20000 then
    raise exception 'invalid_snapshot';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_source_id, 990211));
  if not exists (
    select 1 from public.tracking_drive_catalog
    where file_id = p_source_id and status = 'approved' and automatic_import_enabled
  ) or not exists (
    select 1 from public.tracking_sync_settings
    where id = 1 and automatic_sync_enabled and auth_setup = 'validated'
  ) or not exists (
    select 1 from public.tracking_sync_runs
    where id = p_run_id and source_id = p_source_id and state = 'running'
  ) then
    raise exception 'partial_sync_not_authorized';
  end if;
  for v_order in select value from pg_catalog.jsonb_array_elements(p_orders) as e(value) loop
    if pg_catalog.jsonb_typeof(v_order->'lines') is distinct from 'array'
       or pg_catalog.jsonb_array_length(v_order->'lines') > 2000 then
      raise exception 'invalid_order_lines';
    end if;
    select * into old_order
      from public.tracking_orders
      where source_id = p_source_id
        and order_reference = (v_order->>'order_reference')
      for update;
    if not found then
      conflicting := conflicting + 1;
      continue;
    end if;
    -- Identidad del pedido: no confiar en coincidencias de número con
    -- fecha/fila/proveedor/obra/responsable diferentes.
    if old_order.source_row is distinct from (v_order->>'source_row')::integer
       or old_order.order_date is distinct from (v_order->>'order_date')::date
       or old_order.supplier is distinct from coalesce(v_order->>'supplier','')
       or old_order.responsible is distinct from coalesce(v_order->>'responsible','')
       or old_order.delivery_location is distinct from coalesce(v_order->>'delivery_location','') then
      conflicting := conflicting + 1;
      continue;
    end if;
    for v_line in select value from pg_catalog.jsonb_array_elements(v_order->'lines') as e(value) loop
      -- Sólo cambio positivo: verde + SI de una línea ya registrada.
      if coalesce((v_line->>'source_green')::boolean,false) is not true
         or coalesce((v_line->>'source_si')::boolean,false) is not true
         or coalesce((v_line->>'drive_line_finalized')::boolean,false) is not true then
        continue;
      end if;
      select * into old_line
        from public.tracking_lines
        where order_id = old_order.id
          and source_row = (v_line->>'source_row')::integer
        for update;
      if not found
         or old_line.reference is distinct from coalesce(v_line->>'reference','')
         or old_line.description is distinct from coalesce(v_line->>'description','')
         or old_line.requested_qty is distinct from (v_line->>'requested_qty')::numeric then
        conflicting := conflicting + 1;
        continue;
      end if;
      verified := verified + 1;
      if old_line.drive_line_finalized then continue; end if;
      update public.tracking_lines
         set source_green = true, source_si = true, drive_line_finalized = true
         where id = old_line.id and drive_line_finalized = false;
      if not found then continue; end if;
      insert into public.tracking_sync_events (
        source_id, run_id, order_id, line_id, event_type, before_json, after_json
      ) values (
        p_source_id, p_run_id, old_order.id, old_line.id, 'status_change',
        pg_catalog.jsonb_build_object('received',false, 'mode','verified_partial'),
        pg_catalog.jsonb_build_object('received',true, 'mode','verified_partial')
      );
      applied := applied + 1;
      if not (old_order.id = any(updated_orders)) then
        updated_orders := pg_catalog.array_append(updated_orders,old_order.id);
      end if;
    end loop;
  end loop;
  foreach order_id in array updated_orders loop
    update public.tracking_orders
      set drive_finalized = (
        select pg_catalog.bool_and(l.drive_line_finalized)
        from public.tracking_lines l where l.order_id = order_id
      ) where id = order_id;
  end loop;
  -- Importante: NO avanzar la versión de Drive: el conflicto sigue pendiente.
  return pg_catalog.jsonb_build_object(
    'safe_receipts_applied',applied,
    'safe_lines_verified',verified,
    'unmatched_or_conflicting',conflicting,
    'orders_updated',pg_catalog.array_length(updated_orders,1)
  );
end
$$;
revoke all on function public.tracking_apply_verified_receipts(text,jsonb,bigint)
  from public, anon, authenticated;
grant execute on function public.tracking_apply_verified_receipts(text,jsonb,bigint)
  to service_role;
