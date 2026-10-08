
-- V11: alertas técnicas por todas las descripciones originales, sin fusionar precios.
-- Normalizar también la ortografía del identificador de familia.
create or replace function private.review_guess_family(p_description text)
returns text language sql immutable set search_path='' as $$
select case
 when upper(coalesce(p_description,'')) ~ 'MAGNETOT|DIFERENCIAL|DISYUNTOR|CONTACTOR|GUARDAMOTOR|SOBRETENSI[OÓ]N|AUTOM[AÁ]TICO|INTERRUPTOR AUT|TX3[[:space:]]*[0-9]|IC60|IK60'
   then 'aparamenta'
 when upper(coalesce(p_description,'')) ~ 'H07Z1|H07V|RZ1|RV[- ]?K|ES07Z|CABLE|MANGUERA EL[EÉ]CTR|CONDUCTOR EL[EÉ]CTR|UTP|FIBRA [OÓ]PTICA|CAT[.]?[[:space:]]*[567]'
   then 'cables'
 when upper(coalesce(p_description,'')) ~ 'LUMINARIA|LUM[.]?[[:space:]]|DOWNLIGHT|APLIQUE|PLAF[OÓ]N|FOCO LED|PANTALLA LED|PANTALLA ESTANCA|FAROLA|BALIZA LED|PROYECTOR LED|TIRA LED|L[AÁ]MPARA LED|BOMBILLA LED|EMERGENCIA LED'
   then 'iluminacion'
 when upper(coalesce(p_description,'')) ~ 'TUBO|CORRUGAD|CANALIZACI[OÓ]N|CANALETA|BANDEJA|CONDUCTO|RIGID|R[IÍ]GID|AISCAN'
   then 'canalizaciones'
 when upper(coalesce(p_description,'')) ~ 'SCHUKO|ENCHUFE|CONMUTADOR|CRUZAMIENTO|MECANISMO|TECLA|BASE DOBLE|MARCO SIMPLE|MARCO DOBLE|PULSADOR|BASE DE CORRIENTE|TOMA RJ45|TOMA TV'
   then 'mecanismos'
 when upper(coalesce(p_description,'')) ~ 'ANTENA|REPARTIDOR|VIDEOPORTERO|PORTERO ELECT|MONITOR DUOX|RACK|SPLITTER|LATIGUILLO|RECEPTOR [OÓ]PTICO|MULTIPLEXOR|CONECTOR SC/APC'
   then 'telecomunicaciones'
 when upper(coalesce(p_description,'')) ~ 'ARMARIO|ENVOLVENTE|CAJA|CUADRO EL[EÉ]CTR|ARQUETA|REGISTRO FINAL|COFRET'
   then 'envolventes_cajas'
 when upper(coalesce(p_description,'')) ~ 'PICA DE TIERRA|COBRE DESNUDO|PUESTA A TIERRA|RED EQUIPOTENCIAL'
   then 'puesta_tierra'
 when upper(coalesce(p_description,'')) ~ 'BRIDA|ABRAZADERA|TORNILLO|GRAPA|TACO [0-9]|FIJACI[OÓ]N'
   then 'fijaciones'
 else 'sin_clasificar'
end;
$$;

create index if not exists order_lines_ref_normalized_idx
 on public.order_lines ((upper(regexp_replace(btrim(supplier_reference),'[[:space:]]+','','g'))))
 where supplier_reference is not null;

create or replace function private.rebuild_review_evidence(p_key text default null)
returns integer
language plpgsql volatile security definer set search_path=''
as $body$
declare changed_rows integer;
begin
 with obs as (
  select g.reference_key, l.description_original,
         upper(l.description_original) as txt,
         private.review_guess_family(l.description_original) as family
  from public.normalization_review_groups g
  join public.order_lines l
   on g.reference_key=upper(regexp_replace(btrim(l.supplier_reference),'[[:space:]]+','','g'))
  where (p_key is null or g.reference_key=p_key)
    and l.line_kind not in ('environmental_fee','freight','service')
 ),
 extracted as (
  select reference_key,family,
    (regexp_match(txt,'([0-9]+([,.][0-9]+)?)[[:space:]]*W([^[:alpha:]]|$)'))[1] as power,
    coalesce(
     (regexp_match(txt,'DI[AÁ]METRO[[:space:]]*([0-9]{1,3})([^0-9]|$)'))[1],
     (regexp_match(txt,'Ø[[:space:]]*([0-9]{1,3})([^0-9]|$)'))[1],
     (regexp_match(txt,'D[.][[:space:]]*([0-9]{1,3})([^0-9]|$)'))[1]
    ) as diameter,
    case when family='cables' then coalesce(
       (regexp_match(txt,'[0-9]+[XG]([0-9]+([,.][0-9]+)?)'))[1],
       (regexp_match(txt,'([0-9]+([,.][0-9]+)?)[[:space:]]*MM([^[:alpha:]]|$)'))[1]
    ) end as section,
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
$body$;
revoke all on function private.rebuild_review_evidence(text) from public,anon,authenticated;

create or replace function private.review_evidence_after_change()
returns trigger
language plpgsql volatile security definer set search_path=''
as $body$
begin
 perform private.rebuild_review_evidence(new.reference_key);
 return new;
end;
$body$;
revoke all on function private.review_evidence_after_change() from public,anon,authenticated;

drop trigger if exists normalization_evidence_refresh on public.normalization_review_groups;
create trigger normalization_evidence_refresh
after insert or update of observed_reference,sample_description,supplier_count,
 purchase_count,line_count,description_count,distinct_wattages,risk_level
on public.normalization_review_groups
for each row execute function private.review_evidence_after_change();

select private.rebuild_review_evidence(null);
