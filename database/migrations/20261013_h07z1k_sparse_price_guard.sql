-- Strengthen sparse-history price checks for confirmed H07Z1-K import rules.
-- Even one comparable old purchase must stop an extreme (>2x or <0.5x) deviation.
-- Retain the 1.55x / 0.60x median thresholds when there are >=3 comparables.
create or replace function private.apply_confirmed_import_rules(p_order_id bigint)
returns jsonb language plpgsql security definer set search_path to ''
as $norm$
declare
 actor text:=lower(coalesce(auth.jwt()->>'email',''));
 allowed boolean;
 owner_email text;
 rec record;
 rule_rec record;
 baseline numeric;
 minimum_comparable numeric;
 comparison_count integer;
 old_price numeric;
 normal_status text;
 detail_text text;
 applied_count integer:=0;
 alerts integer:=0;
 pending integer:=0;
begin
 select exists(select 1 from public.app_users u where lower(u.email)=actor
  and u.active and u.role='admin') into allowed;
 select lower(imported_by) into owner_email from public.orders where id=p_order_id;
 if not coalesce(allowed,false) or auth.uid() is null or owner_email is distinct from actor then
  raise exception 'Normalización: pedido no autorizado' using errcode='42501';
 end if;

 for rec in
  select l.id,l.supplier_reference,l.description_original,l.net_unit_price,l.line_kind,o.supplier_id
  from public.order_lines l join public.orders o on o.id=l.order_id
  where l.order_id=p_order_id order by l.id
 loop
  if rec.line_kind in ('environmental_fee','freight','service') then continue; end if;
  select r.* into rule_rec
  from private.confirmed_import_normalization_rules r
  where r.active and r.supplier_id=rec.supplier_id
    and r.source_reference_key=upper(regexp_replace(btrim(coalesce(rec.supplier_reference,'')),'[[:space:]]+','','g'))
    and r.source_description_key=upper(regexp_replace(btrim(rec.description_original),'[[:space:]]+',' ','g'))
  limit 1;

  if not found then
   if upper(rec.description_original) like '%H07Z1%'
    or exists (select 1 from private.confirmed_import_normalization_rules r
      where r.active and r.supplier_id=rec.supplier_id
       and r.source_reference_key=upper(regexp_replace(btrim(coalesce(rec.supplier_reference,'')),'[[:space:]]+','','g')))
   then
    insert into private.import_normalization_results
      (order_id,order_line_id,decision,detail,processed_by)
    values(p_order_id,rec.id,'no_confirmed_rule',
      'Sin regla exacta aprobada. Revisar sección, color, fabricante y referencia antes de agrupar.',actor);
    pending:=pending+1;
   end if;
   continue;
  end if;

  select count(*),percentile_cont(0.5) within group(order by h.net_unit_price),min(h.net_unit_price)
    into comparison_count,baseline,minimum_comparable
  from public.order_lines_effective h join public.orders oh on oh.id=h.order_id
  where oh.supplier_id=rec.supplier_id and h.order_id<>p_order_id
   and h.supplier_reference=rule_rec.target_reference
   and h.description_original=rule_rec.target_description
   and h.usable_for_prices and h.net_unit_price>0
   and h.line_kind not in ('environmental_fee','freight','service');

  old_price:=rec.net_unit_price;
  if old_price is null or old_price<=0
   or (comparison_count>=3 and baseline>0 and
      (old_price>baseline*1.55 or old_price<baseline*0.60))
   or (comparison_count>=1 and minimum_comparable>0 and
      (old_price>minimum_comparable*2.00 or old_price<minimum_comparable*0.50))
  then
   insert into private.import_normalization_results
     (order_id,order_line_id,rule_id,decision,detail,processed_by)
   values(p_order_id,rec.id,rule_rec.id,'price_alert',
     format('Precio pendiente: neto %s, mediana comparable %s, menor comparable %s, compras %s. Precio original intacto.',
     coalesce(old_price::text,'n/d'),coalesce(baseline::text,'n/d'),
     coalesce(minimum_comparable::text,'n/d'),comparison_count),actor);
   alerts:=alerts+1;
   continue;
  end if;

  if rule_rec.target_reference is not distinct from rec.supplier_reference
    and rule_rec.target_description is not distinct from rec.description_original then
   normal_status:='already_standard';
   detail_text:='Referencia y descripción ya estandarizadas; sin revisión innecesaria.';
  else
   perform private.apply_purchase_line_review(rec.id,'correct',
      rule_rec.target_reference,rule_rec.target_description,
      'Regla confirmada H07Z1-K #'||rule_rec.id||
      ': proveedor, referencia y descripción original previamente verificados; control de precio aprobado. Sin modificar datos originales ni importes.',0);
   normal_status:='applied';
   detail_text:='Corrección efectiva aplicada con versión 1 y auditoría de compras.';
   applied_count:=applied_count+1;
  end if;
  insert into private.import_normalization_results
    (order_id,order_line_id,rule_id,decision,detail,processed_by)
  values(p_order_id,rec.id,rule_rec.id,normal_status,detail_text,actor);
 end loop;

 return jsonb_build_object('applied',applied_count,'price_alerts',alerts,'pending',pending);
end;
$norm$;

revoke all on function private.apply_confirmed_import_rules(bigint) from public,anon;
grant execute on function private.apply_confirmed_import_rules(bigint) to authenticated;
