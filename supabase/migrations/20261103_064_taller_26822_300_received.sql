-- Promoción UNA SOLA VEZ del pedido TALLER 26/822, tras validación OOXML
-- del archivo real en Drive mediante lector supervisado:
-- fila 928, cantidad 300 uds (2 CAJAS), verde y SI, fecha 26/10/26, recibido 27/10/26.
-- Mantiene el texto original en tracking_legacy_review (review_status=resolved).
do $check$
declare
 v_source constant text:='1Gw7_gWxq5ikSjiykVUjH9owngMshTQCQ';
 v_review public.tracking_legacy_review%rowtype;
 v_run bigint;
 v_order bigint;
 v_line bigint;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_source,990211));
 select * into v_review from public.tracking_legacy_review
 where source_id=v_source and source_sheet='PEDIDOS' and source_row=928 for update;
 if not found or v_review.review_status<>'pending'
    or v_review.order_reference<>'26/822'
    or v_review.order_date<>date '2026-10-26'
    or v_review.reason<>'order_contains_ambiguous_lines'
    or v_review.issues_json->0->>'reference'<>'9ZG635M6BTSH'
    or v_review.issues_json->0->>'qty_raw' !~* '^300[[:space:]]+uds[[:space:]]*\([[:space:]]*2[[:space:]]+cajas[[:space:]]*\)$'
    then raise exception 'taller_original_review_does_not_match'; end if;

 if (select count(*) from public.tracking_orders where source_id=v_source)<>20
    or (select count(*) from public.tracking_lines l join public.tracking_orders o on o.id=l.order_id where o.source_id=v_source)<>49
    or exists(select 1 from public.tracking_orders where source_id=v_source and order_reference='26/822')
    or not exists(select 1 from public.tracking_drive_catalog where file_id=v_source and status='approved')
 then raise exception 'taller_baseline_changed'; end if;

 insert into public.tracking_sync_runs(source_id,state,message,started_at,finished_at,
  scanned_files,updated_files,change_summary)
 values(v_source,'success',
   'Validación documental de 300 uds del pedido 26/822; material recibido y cierre preservado',
   now(),now(),1,1,
   '{"supervised_promotion":"26/822","original_quantity":"300 uds (2 CAJAS)","quantity":300,"delivery_verified":true}'::jsonb)
 returning id into v_run;

 insert into public.tracking_orders(
    source_id,source_row,order_reference,order_date,supplier,responsible,
    delivery_location,drive_finalized,reception_date)
 values(v_source,928,'26/822',date '2026-10-26','GUARCONSA','SERGIO',
    'RECOGEN',true,date '2026-10-27')
 returning id into v_order;

 insert into public.tracking_lines(order_id,source_row,reference,description,requested_qty,
    albaran,observations,source_green,source_si,drive_line_finalized)
 values(v_order,928,'9ZG635M6BTSH',
  'Tornillo directo a hormigón BTS H 6-35 manguito M6 gris cincado aluminio',
  300,E'602198884\n602199106','FERRETERIA PALACIOS',true,true,true)
 returning id into v_line;

 insert into public.tracking_sync_events(source_id,run_id,order_id,event_type,after_json)
 values(v_source,v_run,v_order,'new_order',
   jsonb_build_object('reference','26/822','date','2026-10-26','supervised',true));
 insert into public.tracking_sync_events(source_id,run_id,order_id,line_id,event_type,after_json)
 values(v_source,v_run,v_order,v_line,'new_line',
   jsonb_build_object('reference','9ZG635M6BTSH','qty',300,'source_row',928,'verified',true));
 update public.tracking_legacy_review set review_status='resolved' where id=v_review.id;
end $check$;
