-- Conciliación puntual confirmada por usuario (12/11/2026).
-- LAHOZ - JOSE FENTANES, pedido 26/848: lugar de entrega OFICINA -> RECOGEN.
-- Mantener identidad y líneas; la recepción se obtendrá exclusivamente del XLSX
-- mediante el sincronizador ordinario (verde + SI), no se fuerza aquí.
do $reconcile$
declare
  v_order public.tracking_orders%rowtype;
  v_valid_lines integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('1u9nxcu8XouhtjCL1P55EubuQHdFAHG4b',990211));
  select * into v_order from public.tracking_orders
   where source_id='1u9nxcu8XouhtjCL1P55EubuQHdFAHG4b' and id=1335 and order_reference='26/848'
   for update;
  if not found then raise exception 'expected_tracking_order_missing'; end if;
  if v_order.source_row <> 83
     or v_order.order_date <> date '2026-11-06'
     or v_order.supplier <> 'GUARCONSA'
     or v_order.responsible <> 'SERGIO'
     or v_order.delivery_location not in ('OFICINA','RECOGEN') then
    raise exception 'unexpected_tracking_order_identity';
  end if;
  select count(*) into v_valid_lines
  from public.tracking_lines l
  where l.order_id=v_order.id
    and ((l.source_row=83 and l.reference='069692L' and l.requested_qty=1)
      or (l.source_row=84 and l.reference='069611L' and l.requested_qty=2));
  if v_valid_lines <> 2
     or (select count(*) from public.tracking_lines where order_id=v_order.id) <> 2 then
    raise exception 'unexpected_material_line_identity';
  end if;
  if v_order.delivery_location='RECOGEN' then
    raise notice '26/848 already reconciled';
    return;
  end if;
  update public.tracking_orders set delivery_location='RECOGEN'
    where id=v_order.id and delivery_location='OFICINA';
  if not found then raise exception 'delivery_location_not_updated'; end if;
  insert into public.tracking_sync_runs (
    source_id,state,started_at,finished_at,message,
    scanned_files,updated_files,unchanged_files,rejected_files,change_summary
  ) values (
    '1u9nxcu8XouhtjCL1P55EubuQHdFAHG4b','partial',now(),now(),
    'Corrección auditada 26/848 OFICINA a RECOGEN; pendiente de sincronización con Drive.',
    0,0,0,0,
    pg_catalog.jsonb_build_object(
      'operation','confirmed_delivery_location_reconciliation',
      'order_id',v_order.id,'order_reference','26/848',
      'source_row',83,'previous','OFICINA','current','RECOGEN',
      'user_confirmation_date','2026-11-12',
      'receipt_status','not_manually_overridden',
      'counts',pg_catalog.jsonb_build_object('reconciled_order_headers',1)
    )
  );
end
$reconcile$;
