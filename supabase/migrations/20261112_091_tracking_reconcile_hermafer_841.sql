-- Reconciliación específica autorizada por el usuario (05/11): el pedido de
-- FERRETERIA PALACIOS se numeró 26/841 en el Excel tras haber sido importado
-- como 26/842. Es EL MISMO pedido (misma fila, fecha, proveedor y línea).
-- Preservamos su id, recepciones y eventos; no tocamos los pedidos de compras.
do $reconcile$
declare
  v_order public.tracking_orders%rowtype;
  v_lines int;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('1nquTLnM2pUwA0Gt5jgjfKDcSWaLAgslJ',990211)
  );
  select * into v_order from public.tracking_orders
  where source_id='1nquTLnM2pUwA0Gt5jgjfKDcSWaLAgslJ' and id=1330 for update;
  if not found then raise exception 'expected_tracked_order_missing'; end if;
  if v_order.order_reference='26/841' then
    -- Idempotente; sólo si el mismo registro ya fue reconciliado.
    raise notice 'El pedido 1330 ya es 26/841';
    return;
  end if;
  if v_order.order_reference<>'26/842'
     or v_order.source_row<>491 or v_order.order_date<>date '2026-11-05'
     or v_order.supplier<>'FERRETERIA PALACIOS'
     or v_order.responsible<>'SERGIO'
     or v_order.delivery_location<>'RECOGEN' then
    raise exception 'unexpected_order_identity';
  end if;
  if exists (
    select 1 from public.tracking_orders
    where source_id='1nquTLnM2pUwA0Gt5jgjfKDcSWaLAgslJ' and order_reference='26/841'
  ) then raise exception 'renumber_target_already_in_use'; end if;
  select count(*) into v_lines from public.tracking_lines
    where order_id=1330 and source_row=491
      and reference='511416'
      and requested_qty=8
      and description='JGO 4 AMORTIGUADORES SUELO ACO. 48KGS. NEGRO REF.18538';
  if v_lines<>1 or (select count(*) from public.tracking_lines where order_id=1330)<>1 then
    raise exception 'order_line_identity_mismatch';
  end if;
  update public.tracking_orders
     set order_reference='26/841'
   where id=1330 and source_id='1nquTLnM2pUwA0Gt5jgjfKDcSWaLAgslJ' and order_reference='26/842';
  if not found then raise exception 'reconciliation_not_applied'; end if;
  -- La corrida de auditoría NO se atribuye a sincronización efectiva:
  -- 0 archivos escaneados, 0 actualizados. Conserva la versión pendiente.
  insert into public.tracking_sync_runs (
    source_id,state,started_at,finished_at,message,scanned_files,
    updated_files,unchanged_files,rejected_files,change_summary
  ) values (
    '1nquTLnM2pUwA0Gt5jgjfKDcSWaLAgslJ','partial',now(),now(),
    'Reconciliación auditada del número 26/842 a 26/841; pendiente de comprobar Drive.',
    0,0,0,0,
    pg_catalog.jsonb_build_object(
      'operation','manual_order_reference_reconciliation',
      'order_id',1330,'source_row',491,
      'previous','26/842','current','26/841',
      'validated_source','PEDIDOS HERMAFER BOADILLA.xlsx',
      'reason','renumeración ya acordada con el usuario (05/11/2026)',
      'counts',pg_catalog.jsonb_build_object('renumbered_orders',1)
    )
  );
end
$reconcile$;
