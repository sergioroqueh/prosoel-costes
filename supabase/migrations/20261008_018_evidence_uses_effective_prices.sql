CREATE OR REPLACE FUNCTION private.rebuild_review_evidence(p_key text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare changed_rows integer;
begin
 with obs as (
  select g.reference_key, l.description_original,
         upper(l.description_original) as txt,
         private.review_guess_family(l.description_original) as family
  from public.normalization_review_groups g
  join public.order_lines_effective l
   on g.reference_key=upper(regexp_replace(btrim(l.supplier_reference),'[[:space:]]+','','g'))
  where (p_key is null or g.reference_key=p_key)
    and l.line_kind not in ('environmental_fee','freight','service')
    and l.usable_for_prices
 ),
 extracted as (
  select reference_key,family,
    replace((regexp_match(txt,'([0-9]+([,.][0-9]+)?)[[:space:]]*W([^[:alpha:]]|$)'))[1],',','.') as power,
    coalesce(
     (regexp_match(txt,'DI[AÁ]METRO[[:space:]]*([0-9]{1,3})([^0-9]|$)'))[1],
     (regexp_match(txt,'Ø[[:space:]]*([0-9]{1,3})([^0-9]|$)'))[1],
     (regexp_match(txt,'D[.][[:space:]]*([0-9]{1,3})([^0-9]|$)'))[1]
    ) as diameter,
    case when family='cables' then replace(coalesce(
       (regexp_match(txt,'[0-9]+[XG]([0-9]+([,.][0-9]+)?)'))[1],
       (regexp_match(txt,'([0-9]+([,.][0-9]+)?)[[:space:]]*MM([^[:alpha:]]|$)'))[1]
    ),',','.') end as section,
    case when family='aparamenta'
     then (regexp_match(txt,'([0-9]{1,3})[[:space:]]*A([^[:alpha:]]|$)'))[1]
    end as current_a
  from obs
 ),
 grouped as (
 select reference_key,
   array_agg(distinct family order by family) as families,
   coalesce(array_agg(distinct family order by family) filter(where family<>'sin_clasificar'),'{}'::text[]) as known_families,
   coalesce(array_agg(distinct power order by power) filter(where power is not null),'{}'::text[]) as powers,
   coalesce(array_agg(distinct diameter order by diameter) filter(where diameter is not null),'{}'::text[]) as diameters,
   coalesce(array_agg(distinct section order by section) filter(where section is not null),'{}'::text[]) as sections,
   coalesce(array_agg(distinct current_a order by current_a) filter(where current_a is not null),'{}'::text[]) as currents
 from extracted group by reference_key
 ),
 decisions as (
 select reference_key,families,known_families,powers,diameters,sections,currents,
   case when cardinality(known_families)>1 then 'mixta'
        when cardinality(known_families)=1 then known_families[1]
        else 'sin_clasificar' end as family,
   pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'familias',case when cardinality(known_families)>1 then to_jsonb(known_families) end,
      'potencias_W',case when cardinality(powers)>1 then to_jsonb(powers) end,
      'diametros_mm',case when cardinality(diameters)>1 then to_jsonb(diameters) end,
      'secciones_mm2',case when cardinality(sections)>1 then to_jsonb(sections) end,
      'intensidades_A',case when cardinality(currents)>1 then to_jsonb(currents) end
   )) as alerts
 from grouped
 )
 update public.normalization_review_groups as g
 set suggested_family=d.family,
     family_signals=to_jsonb(d.families),
     technical_alerts=d.alerts,
     evidence_refreshed_at=now()
 from decisions d
 where g.reference_key=d.reference_key
   and (g.suggested_family,g.family_signals,g.technical_alerts)
     is distinct from (d.family,to_jsonb(d.families),d.alerts);
 get diagnostics changed_rows=row_count;
 return changed_rows;
end;
$function$
