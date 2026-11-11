-- PROSOEL Costes: asistente de unificación manual de referencias.
-- Único usuario autorizado: Sergio (compras@prosoel.es), admin activo.
-- No modifica nunca los pedidos ni líneas originales, cantidades ni precios.
-- Los textos nuevos futuros se normalizan solo si coinciden proveedor,
-- referencia y descripción origen previamente aprobados; el importador conserva
-- sus controles de precio y su registro de incidencias.

create or replace function private.normalization_unify_lookup(p_reference text)
returns table (
  line_id bigint, order_reference text, order_date date,
  supplier_id bigint, supplier_name text,
  source_reference text, source_description text, effective_description text,
  net_unit_price numeric, quantity numeric,
  line_revision integer, excluded boolean, material_linked boolean,
  line_kind text
)
language plpgsql security definer
set search_path=''
as $function$
declare
  actor text := lower(coalesce(auth.jwt()->>'email',''));
  key text := upper(regexp_replace(btrim(coalesce(p_reference,'')),'[[:space:]]+','','g'));
begin
  if auth.uid() is null or actor <> 'compras@prosoel.es'
     or not exists(select 1 from public.app_users u
       where u.active and u.role='admin' and lower(u.email)=actor) then
    raise exception 'Acceso reservado a Sergio' using errcode='42501';
  end if;
  if length(key) not between 3 and 100 then
    raise exception 'Introduce una referencia válida (3 a 100 caracteres)';
  end if;

  return query
  select l.id, o.order_reference, o.order_date, o.supplier_id,
    coalesce(s.name,'Sin proveedor')::text,
    l.supplier_reference, l.description_original,
    coalesce(x.corrected_description,l.description_original),
    l.net_unit_price,l.quantity,coalesce(x.revision,0),
    (coalesce(x.excluded,false) or coalesce(z.excluded,false)),
    (l.material_id is not null),
    l.line_kind
  from public.order_lines l
  join public.orders o on o.id=l.order_id
  left join public.suppliers s on s.id=o.supplier_id
  left join public.purchase_line_overrides x on x.order_line_id=l.id
  left join public.purchase_order_overrides z on z.order_id=o.id
  where upper(regexp_replace(btrim(coalesce(l.supplier_reference,'')),
    '[[:space:]]+','','g'))=key
  order by o.order_date desc nulls last,o.id desc,l.line_number desc,l.id desc
  limit 301;
end;
$function$;

create or replace function public.normalization_unify_lookup(p_reference text)
returns table (
  line_id bigint, order_reference text, order_date date,
  supplier_id bigint, supplier_name text,
  source_reference text, source_description text, effective_description text,
  net_unit_price numeric, quantity numeric,
  line_revision integer, excluded boolean, material_linked boolean,
  line_kind text
)
language sql security invoker
set search_path=''
as $function$
  select * from private.normalization_unify_lookup(p_reference);
$function$;

create or replace function private.normalization_unify_save(
  p_reference text,
  p_line_ids bigint[],
  p_expected_revisions integer[],
  p_description text,
  p_create_rules boolean default true,
  p_note text default null
)
returns jsonb
language plpgsql security definer
set search_path=''
as $function$
declare
  actor text := lower(coalesce(auth.jwt()->>'email',''));
  ref_key text := upper(regexp_replace(btrim(coalesce(p_reference,'')),'[[:space:]]+','','g'));
  canonical text := regexp_replace(btrim(coalesce(p_description,'')),'[[:space:]]+',' ','g');
  selected_count int := coalesce(cardinality(p_line_ids),0);
  reason text;
  i int;
  rec record;
  grp record;
  rule_existing record;
  source_count int;
  old_revision int;
  old_effective text;
  new_corrected text;
  current_ref text;
  v_reference text;
  updates int := 0;
  already int := 0;
  rules int := 0;
  created_rules int := 0;
  original_checksum text;
  after_checksum text;
begin
  if auth.uid() is null or actor <> 'compras@prosoel.es'
     or not exists (select 1 from public.app_users u
       where u.active and u.role='admin' and lower(u.email)=actor) then
    raise exception 'Acceso reservado a Sergio' using errcode='42501';
  end if;
  if length(ref_key) not between 3 and 100 then
    raise exception 'Referencia no válida';
  end if;
  if selected_count<1 or selected_count>200
     or coalesce(cardinality(p_expected_revisions),0)<>selected_count
     or exists(select 1 from unnest(p_line_ids) x where x is null)
     or (select count(distinct x) from unnest(p_line_ids) x)<>selected_count then
    raise exception 'Selecciona entre 1 y 200 líneas únicas y sus versiones de revisión';
  end if;
  if length(canonical) not between 10 and 350 or canonical~'[[:cntrl:]]' then
    raise exception 'La descripción definitiva debe tener 10 a 350 caracteres';
  end if;
  if length(coalesce(p_note,''))>500 then
    raise exception 'La justificación debe tener como máximo 500 caracteres';
  end if;
  reason := format('Unificación manual aprobada por Sergio en PROSOEL Costes. Referencia %s; descripción definitiva: %s. Se preserva el Excel original y el histórico de precios.',ref_key,canonical);
  if nullif(btrim(coalesce(p_note,'')),'') is not null then
    reason:=reason||' Observación: '||btrim(p_note);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(ref_key,20261111));
  perform 1 from public.order_lines l where l.id=any(p_line_ids) order by l.id for update of l;
  select min(l.supplier_reference),count(distinct l.supplier_reference),
    md5(string_agg(to_jsonb(l)::text,'|' order by l.id))
  into v_reference,source_count,original_checksum
  from public.order_lines l where l.id=any(p_line_ids);
  if source_count<>1
     or upper(regexp_replace(btrim(coalesce(v_reference,'')),'[[:space:]]+','','g'))<>ref_key then
    raise exception 'Todas las líneas seleccionadas deben tener la misma referencia original';
  end if;

  -- Evita reglas para subgrupos ambiguos (misma fuente y texto en líneas sin seleccionar).
  if coalesce(p_create_rules,true) then
    for grp in
      select o.supplier_id,
        upper(regexp_replace(btrim(l.description_original),'[[:space:]]+',' ','g')) source_key,
        count(*)::int selected_lines
      from public.order_lines l join public.orders o on o.id=l.order_id
      where l.id=any(p_line_ids)
      group by o.supplier_id,upper(regexp_replace(btrim(l.description_original),'[[:space:]]+',' ','g'))
    loop
      select count(*) into source_count from public.order_lines l
      join public.orders o on o.id=l.order_id
      left join public.purchase_line_overrides x on x.order_line_id=l.id
      left join public.purchase_order_overrides z on z.order_id=o.id
      where o.supplier_id=grp.supplier_id
        and upper(regexp_replace(btrim(coalesce(l.supplier_reference,'')),'[[:space:]]+','','g'))=ref_key
        and upper(regexp_replace(btrim(l.description_original),'[[:space:]]+',' ','g'))=grp.source_key
        and not coalesce(x.excluded,false)
        and not coalesce(z.excluded,false)
        and l.material_id is null
        and l.line_kind not in ('environmental_fee','freight','service');
      if source_count<>grp.selected_lines then
        raise exception 'Para guardar la regla futura, selecciona todas las compras de cada variante y proveedor (% / %).',
          grp.supplier_id,grp.source_key;
      end if;
      select r.* into rule_existing from private.confirmed_import_normalization_rules r
      where r.supplier_id=grp.supplier_id
        and r.source_reference_key=ref_key and r.source_description_key=grp.source_key
      for update;
      if found and (rule_existing.target_reference<>v_reference or rule_existing.target_description<>canonical) then
        raise exception 'Ya existe una regla diferente para esa variante; revísala antes de sustituirla';
      end if;
    end loop;
  end if;

  for i in 1..selected_count loop
    select l.id,l.order_id,l.supplier_reference,l.description_original,l.line_kind,l.material_id,
      o.supplier_id,coalesce(x.corrected_reference,'') corrected_reference,
      x.corrected_description,coalesce(x.revision,0) revision,
      coalesce(x.excluded,false) line_excluded,
      coalesce(z.excluded,false) order_excluded
    into rec
    from public.order_lines l join public.orders o on o.id=l.order_id
    left join public.purchase_line_overrides x on x.order_line_id=l.id
    left join public.purchase_order_overrides z on z.order_id=o.id
    where l.id=p_line_ids[i];
    if not found
       or upper(regexp_replace(btrim(coalesce(rec.supplier_reference,'')),'[[:space:]]+','','g'))<>ref_key
       or rec.line_excluded or rec.order_excluded
       or rec.material_id is not null or rec.line_kind in ('environmental_fee','freight','service')
       or (rec.corrected_reference<>'' and upper(regexp_replace(btrim(rec.corrected_reference),'[[:space:]]+','','g'))<>ref_key) then
      raise exception 'Compra no apta o referencia incompatible: %',p_line_ids[i];
    end if;
    old_revision:=rec.revision;
    if old_revision is distinct from p_expected_revisions[i] then
      raise exception 'La línea % cambió desde que la consultaste. Vuelve a buscar antes de guardar.',p_line_ids[i];
    end if;

    old_effective:=coalesce(rec.corrected_description,rec.description_original);
    if old_effective=canonical then
      already:=already+1;
      continue;
    end if;
    new_corrected:=case when rec.description_original=canonical then null else canonical end;

    insert into public.purchase_line_overrides
      (order_line_id,corrected_reference,corrected_description,excluded,
       reason,revision,reviewed_by,reviewed_at)
    values (rec.id,nullif(rec.corrected_reference,''),new_corrected,false,
      reason,old_revision+1,actor,now())
    on conflict(order_line_id) do update set
      corrected_reference=excluded.corrected_reference,
      corrected_description=excluded.corrected_description,
      excluded=false,reason=excluded.reason,revision=excluded.revision,
      reviewed_by=excluded.reviewed_by,reviewed_at=now();

    insert into public.purchase_review_events
      (target_type,target_id,previous_value,next_value,reason,actor)
    values ('line',rec.id,
      jsonb_build_object('revision',old_revision,'corrected_reference',nullif(rec.corrected_reference,''),
        'corrected_description',rec.corrected_description,'excluded',false),
      jsonb_build_object('revision',old_revision+1,'corrected_reference',nullif(rec.corrected_reference,''),
        'corrected_description',new_corrected,'excluded',false),
      reason,actor);
    updates:=updates+1;
  end loop;

  if coalesce(p_create_rules,true) then
    for grp in
      select o.supplier_id,
        upper(regexp_replace(btrim(l.description_original),'[[:space:]]+',' ','g')) source_key,
        count(*)::int selected_lines
      from public.order_lines l join public.orders o on o.id=l.order_id
      where l.id=any(p_line_ids)
      group by o.supplier_id,upper(regexp_replace(btrim(l.description_original),'[[:space:]]+',' ','g'))
    loop
      insert into private.confirmed_import_normalization_rules
        (supplier_id,source_reference_key,source_description_key,target_reference,
         target_description,evidence_lines,family,approved_source,active)
      values (grp.supplier_id,ref_key,grp.source_key,v_reference,canonical,
        grp.selected_lines,'UNIFICACION_MANUAL',
        format('Confirmación Sergio en PROSOEL Costes: %s; origen proveedor %s, referencia y descripción exactas',now()::date,grp.supplier_id),
        true)
      on conflict(supplier_id,source_reference_key,source_description_key) do update
        set evidence_lines=greatest(private.confirmed_import_normalization_rules.evidence_lines,
          excluded.evidence_lines),
            active=true;
      rules:=rules+1;
    end loop;
  end if;

  select md5(string_agg(to_jsonb(l)::text,'|' order by l.id)) into after_checksum
  from public.order_lines l where l.id=any(p_line_ids);
  if after_checksum is distinct from original_checksum then
    raise exception 'Se detectó un cambio en datos originales; operación cancelada';
  end if;

  perform private.reconcile_review_reference(v_reference);

  return jsonb_build_object('result','saved','reference',v_reference,
    'description',canonical,'selected_lines',selected_count,
    'updated_lines',updates,'already_correct',already,
    'future_rules',rules,'future_scope','supplier_reference_original_description');
end;
$function$;

create or replace function public.normalization_unify_save(
  p_reference text,
  p_line_ids bigint[],
  p_expected_revisions integer[],
  p_description text,
  p_create_rules boolean default true,
  p_note text default null
)
returns jsonb
language sql security invoker
set search_path=''
as $function$
  select private.normalization_unify_save(p_reference,p_line_ids,p_expected_revisions,
    p_description,p_create_rules,p_note);
$function$;

revoke all on function private.normalization_unify_lookup(text) from public,anon,authenticated;
revoke all on function private.normalization_unify_save(text,bigint[],integer[],text,boolean,text) from public,anon,authenticated;
revoke all on function public.normalization_unify_lookup(text) from public,anon,authenticated;
revoke all on function public.normalization_unify_save(text,bigint[],integer[],text,boolean,text) from public,anon,authenticated;

grant execute on function private.normalization_unify_lookup(text) to authenticated;
grant execute on function private.normalization_unify_save(text,bigint[],integer[],text,boolean,text) to authenticated;
grant execute on function public.normalization_unify_lookup(text) to authenticated;
grant execute on function public.normalization_unify_save(text,bigint[],integer[],text,boolean,text) to authenticated;
