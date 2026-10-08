-- V9.1: al importar nuevos pedidos actualizar la cola de revisión sin aprobar equivalencias.
CREATE OR REPLACE FUNCTION private.insert_new_prosoel_order(p jsonb)
 RETURNS TABLE(result text, imported_order_id bigint, imported_lines integer, detail text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor text := lower(coalesce(auth.jwt()->>'email',''));
  allowed boolean;
  source_hash text;
  source_name text;
  yr integer;
  seq integer;
  subnum text;
  original_id bigint;
  sid bigint;
  project_id bigint;
  new_id bigint;
  commercial_id bigint;
  variant_key text;
  l jsonb;
  line_idx integer := 0;
  qty numeric;
  price numeric;
  line_total numeric;
  line_kind text;
  num_lines integer;
  sum_total numeric := 0;
  missing_lines boolean := false;
  declared numeric;
  overall_validation text;
  price_validation text;
  effective_year integer;
  effective_num integer;
begin
  select exists(
    select 1 from public.app_users a
    where lower(a.email)=actor and a.active and a.role='admin'
  ) into allowed;
  if not allowed or auth.uid() is null then
    raise exception 'Acceso restringido a administradores' using errcode='42501';
  end if;

  if p is null or jsonb_typeof(p)<>'object' or octet_length(p::text)>262144 then
    raise exception 'Pedido vacío o supera 256 KB de datos extraídos';
  end if;
  if jsonb_typeof(p->'lines')<>'array' then
    raise exception 'No hay líneas de pedido';
  end if;
  num_lines:=jsonb_array_length(p->'lines');
  if num_lines<1 or num_lines>250 then
    raise exception 'La importación individual admite entre 1 y 250 líneas';
  end if;

  source_hash:=lower(p->>'source_sha256');
  source_name:=btrim(coalesce(p->>'source_filename',''));
  yr:=(p->>'order_year')::integer;
  seq:=(p->>'order_number')::integer;
  subnum:=nullif(btrim(coalesce(p->>'order_subnumber','')),'');
  if source_hash is null or source_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'SHA-256 de origen inválido';
  end if;
  if length(source_name)<5 or length(source_name)>240 or lower(source_name) not like '%.xlsx' then
    raise exception 'Nombre de archivo XLSX inválido';
  end if;
  if yr<2024 or yr>2100 or seq<1 or seq>99999 then
    raise exception 'Año o numeración de pedido inválidos';
  end if;
  if nullif(btrim(coalesce(p->>'supplier','')),'') is null then
    raise exception 'Proveedor obligatorio para el pedido';
  end if;
  if p->>'order_date' is null then
    raise exception 'Fecha de pedido obligatoria';
  end if;
  if (p->>'order_date')::date is null then
    raise exception 'Fecha de pedido inválida';
  end if;

  -- Protege las operaciones simultáneas del mismo fichero.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(source_hash,0));
  select id into original_id from public.orders where source_sha256=source_hash;
  if original_id is not null then
    return query select 'duplicate'::text,original_id,0,'El mismo archivo ya fue importado'::text;
    return;
  end if;

  select id into original_id from public.orders o
  where o.order_year=yr and o.order_number=seq
    and coalesce(o.order_subnumber,'')=coalesce(subnum,'')
  order by o.id limit 1;
  if original_id is not null then
    return query select 'number_conflict'::text,original_id,0,
      'Ya existe un pedido con el mismo año, número y subnúmero, pero distinto archivo'::text;
    return;
  end if;

  -- Validación ANTES de insertar. Las líneas originales se preservan como fueron extraídas.
  for l in select value from pg_catalog.jsonb_array_elements(p->'lines') loop
    if jsonb_typeof(l)<>'object' then raise exception 'Línea de pedido inválida'; end if;
    qty:=(l->>'quantity')::numeric;
    if qty is null or qty=0 or abs(qty)>10000000 then
      raise exception 'Cantidad inválida en la línea %',line_idx+1;
    end if;
    if nullif(btrim(coalesce(l->>'description_original','')),'') is null then
      raise exception 'Falta descripción en la línea %',line_idx+1;
    end if;
    variant_key:=lower(coalesce(l->>'commercial_variant_key',''));
    if variant_key !~ '^[0-9a-f]{64}$' then
      raise exception 'Huella de variante inválida en línea %',line_idx+1;
    end if;
    price:=(l->>'net_unit_price')::numeric;
    line_total:=(l->>'total_price')::numeric;
    if price is null or line_total is null then
      missing_lines:=true;
    else
      sum_total:=sum_total+line_total;
    end if;
    line_idx:=line_idx+1;
  end loop;

  declared:=(p->>'declared_total')::numeric;
  overall_validation:=
    case when missing_lines then 'incomplete_prices'
         when declared is not null and abs(pg_catalog.round(sum_total,2)-pg_catalog.round(declared,2))<=0.01 then 'valid'
         else 'total_mismatch' end;

  insert into public.suppliers(name) values (btrim(p->>'supplier'))
  on conflict(name) do update set name=excluded.name returning id into sid;

  project_id:=null;
  if nullif(btrim(coalesce(p->>'project','')),'') is not null then
    select id into project_id from public.projects where name=p->>'project' order by id limit 1;
    if project_id is null then
      insert into public.projects(name,address)
      values(p->>'project',nullif(p->>'project_address',''))
      returning id into project_id;
    end if;
  end if;

  insert into public.orders (
    order_reference,order_year,order_number,order_subnumber,order_identity_source,
    order_identity_status,order_date,supplier_id,project_id,responsible,
    supplier_contact,supplier_email,project_contact,declared_total,unit_header,
    template_variant,internal_order_reference,source_filename,source_sha256,
    validation_status,imported_by
  ) values (
    nullif(p->>'order_reference',''),yr,seq,subnum,
    coalesce(nullif(p->>'order_identity_source',''),'filename'),
    coalesce(nullif(p->>'order_identity_status',''),'candidate'),
    (p->>'order_date')::date,sid,project_id,
    p->>'responsible',p->>'supplier_contact',p->>'supplier_email',p->>'project_contact',
    declared,p->>'unit_header',p->>'template_variant',p->>'internal_order_reference',
    source_name,source_hash,overall_validation,actor
  ) returning id into new_id;

  line_idx:=0;
  for l in select value from pg_catalog.jsonb_array_elements(p->'lines') loop
    line_idx:=line_idx+1;
    variant_key:=lower(l->>'commercial_variant_key');
    insert into public.commercial_items(
      supplier_id,supplier_reference,commercial_variant_key,preferred_description,match_status
    ) values (
      sid,l->>'supplier_reference',variant_key,l->>'description_original','pending'
    ) on conflict(supplier_id,commercial_variant_key) do nothing;
    select id into commercial_id from public.commercial_items
    where supplier_id=sid and commercial_variant_key=variant_key;
    if commercial_id is null then
      raise exception 'No se pudo resolver la variante de la línea %',line_idx;
    end if;

    qty:=(l->>'quantity')::numeric;
    price:=(l->>'net_unit_price')::numeric;
    line_total:=(l->>'total_price')::numeric;
    price_validation:=case
      when price is null or line_total is null then 'incomplete'
      when abs(pg_catalog.round(qty*price,2)-pg_catalog.round(line_total,2)) <=0.01 then 'valid'
      else 'mismatch' end;
    line_kind:=coalesce(nullif(l->>'line_kind',''),'unknown');
    if line_kind not in ('unknown','environmental_fee','freight','service','service_candidate') then
      line_kind:='unknown';
    end if;

    insert into public.order_lines(
      order_id,line_number,source_row,commercial_item_id,quantity,supplier_reference,
      description_original,pvp,discount_raw,discount_components_raw,net_unit_price,
      total_price,price_validation_status,price_validation_detail,
      line_kind,line_kind_confidence,line_kind_reasons,line_kind_review_status
    ) values (
      new_id,line_idx,coalesce((l->>'source_row')::integer,line_idx),commercial_id,
      qty,l->>'supplier_reference',l->>'description_original',
      (l->>'pvp')::numeric,l->>'discount_raw',
      case when jsonb_typeof(l->'discount_components_raw')='array' then l->'discount_components_raw' else '[]'::jsonb end,
      price,line_total,price_validation,
      pg_catalog.jsonb_build_object(
        'calculated_total',case when price is null then null else pg_catalog.round(qty*price,2) end,
        'observed_total',line_total
      ),
      line_kind,
      case when line_kind='environmental_fee' then 0.995
           when line_kind='freight' then 0.99
           when line_kind='service' then 0.97
           when line_kind='service_candidate' then 0.80 else 0 end,
      case when jsonb_typeof(l->'line_kind_reasons')='array' then l->'line_kind_reasons' else '[]'::jsonb end,
      case when line_kind in ('environmental_fee','freight','service') then 'auto' else 'pending' end
    );
  end loop;


  -- Refrescar únicamente los códigos observados en este pedido.
  -- Preservar review_status/review_note/reviewed_by: no se toman decisiones automáticas.
  with impacted as (
    select distinct upper(regexp_replace(btrim(n.supplier_reference),'[[:space:]]+','','g')) as code
    from public.order_lines n
    where n.order_id=new_id and n.supplier_reference is not null
      and length(btrim(n.supplier_reference)) between 3 and 64
      and n.line_kind not in ('environmental_fee','freight','service')
  ),
  grouped as (
    select upper(regexp_replace(btrim(ol.supplier_reference),'[[:space:]]+','','g')) as reference_key,
      min(ol.supplier_reference) as observed_reference,
      max(ol.description_original) as sample_description,
      count(distinct o.supplier_id)::integer supplier_count,
      count(distinct ol.order_id)::integer purchase_count,
      count(*)::integer line_count,
      count(distinct regexp_replace(upper(ol.description_original),'[[:space:]]+',' ','g'))::integer description_count,
      count(distinct (regexp_match(lower(ol.description_original),'([0-9]+)[[:space:]]*w([^[:alpha:]]|$)'))[1])::integer distinct_wattages,
      max(o.order_date) latest_order_date
    from public.order_lines ol join public.orders o on o.id=ol.order_id
    join impacted i on i.code=upper(regexp_replace(btrim(ol.supplier_reference),'[[:space:]]+','','g'))
    where ol.line_kind not in ('environmental_fee','freight','service')
    group by 1
  ),
  candidates as (
    select *,
    (case when distinct_wattages>1 then 100000 else 0 end
       + least(supplier_count,10)*1000
       + least(purchase_count,100)*10
       + least(description_count,100))::integer as priority_score,
    case when distinct_wattages>1 then 'technical_conflict'
         when description_count>1 then 'variant_descriptions'
         else 'cross_supplier' end as risk_level
    from grouped
    where supplier_count>1 or (description_count>1 and line_count>=2)
  )
  insert into public.normalization_review_groups as g
  (reference_key,observed_reference,sample_description,supplier_count,purchase_count,line_count,
    description_count,distinct_wattages,latest_order_date,priority_score,risk_level)
  select reference_key,observed_reference,sample_description,supplier_count,purchase_count,line_count,
    description_count,distinct_wattages,latest_order_date,priority_score,risk_level from candidates
  on conflict(reference_key) do update set
    observed_reference=excluded.observed_reference,
    sample_description=excluded.sample_description,
    supplier_count=excluded.supplier_count,
    purchase_count=excluded.purchase_count,
    line_count=excluded.line_count,
    description_count=excluded.description_count,
    distinct_wattages=excluded.distinct_wattages,
    latest_order_date=excluded.latest_order_date,
    priority_score=excluded.priority_score,
    risk_level=excluded.risk_level,
    refreshed_at=now()
  where g.supplier_count is distinct from excluded.supplier_count
     or g.purchase_count is distinct from excluded.purchase_count
     or g.line_count is distinct from excluded.line_count
     or g.description_count is distinct from excluded.description_count
     or g.distinct_wattages is distinct from excluded.distinct_wattages;

  insert into public.order_import_audit(order_id,source_sha256,source_filename,imported_by,line_count)
  values(new_id,source_hash,source_name,actor,num_lines);
  return query select 'imported'::text,new_id,num_lines,overall_validation;
end;
$function$
;
