CREATE OR REPLACE FUNCTION public.material_research_priority(result_limit integer DEFAULT 40)
 RETURNS TABLE(commercial_item_id bigint, supplier_reference text, supplier_description text, supplier_name text, purchase_count bigint, latest_order_date date, research_attempts integer, family_hint text, conflicting_descriptions bigint, code_collision boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
with candidate_queue as materialized (
 select
  q.commercial_item_id,q.source_reference,q.source_description,
  q.attempt_count,q.extracted_signals,ci.supplier_id
 from public.material_enrichment_queue q
 join public.commercial_items ci on ci.id=q.commercial_item_id
 where (auth.role()='service_role' or (select private.has_app_access()))
   and q.status in ('waiting_for_evidence','no_match','needs_review')
   and (q.last_attempt_at is null or q.last_attempt_at < now()-interval '14 days')
   -- Scope to families that the current free researcher can validate.
   and (
      (upper(btrim(q.source_reference)) ~ '^CR(16|20|25|32|40|50)$'
       and upper(q.source_description) like '%AISCAN%')
    or (upper(btrim(q.source_reference)) ~ '^4035(84|85|86|87|88|89|90)$'
       and upper(q.source_description) like '%TX3%')
    or (length(btrim(coalesce(q.source_reference,''))) >= 5
       and upper(q.source_description) ~ 'TELEV[EÉ]S|FERMAX|JUNG')
   )
),
active_lines as materialized (
 select l.commercial_item_id,l.order_id,l.description_original,o.order_date
 from public.order_lines_effective l
 join public.orders o on o.id=l.order_id
 where l.commercial_item_id is not null
   and l.usable_for_prices
   and l.line_kind not in ('environmental_fee','freight','service')
),
purchase_totals as (
 select
  commercial_item_id,
  count(distinct order_id)::bigint as purchase_count,
  max(order_date)::date as latest_order_date,
  count(distinct upper(description_original))::bigint as conflicting_descriptions
 from active_lines
 group by commercial_item_id
),
code_duplicates as (
 select
  upper(btrim(ci.supplier_reference)) as normalized_reference,
  count(distinct ci.preferred_description)::bigint as description_variants
 from public.commercial_items ci
 join purchase_totals purchases on purchases.commercial_item_id=ci.id
 where nullif(btrim(coalesce(ci.supplier_reference,'')),'') is not null
 group by upper(btrim(ci.supplier_reference))
)
select
 q.commercial_item_id,
 q.source_reference as supplier_reference,
 q.source_description as supplier_description,
 s.name as supplier_name,
 p.purchase_count,
 p.latest_order_date,
 q.attempt_count as research_attempts,
 coalesce(q.extracted_signals->>'cable_family',
   case when upper(q.source_description) like '%AISCAN%' then 'AISCAN'
        when upper(q.source_description) like '%TX3%' then 'LEGRAND-TX3'
        else '' end
 ) as family_hint,
 p.conflicting_descriptions,
 coalesce(d.description_variants,0)>1 as code_collision
from candidate_queue q
join purchase_totals p on p.commercial_item_id=q.commercial_item_id
join public.suppliers s on s.id=q.supplier_id
left join code_duplicates d on d.normalized_reference=upper(btrim(q.source_reference))
where p.purchase_count>0
order by
 p.purchase_count desc,
 case when coalesce(q.extracted_signals->>'cable_family',
   case when upper(q.source_description) like '%AISCAN%' then 'AISCAN'
        when upper(q.source_description) like '%TX3%' then 'LEGRAND-TX3'
        else '' end)<>'' then 0 else 1 end,
 p.latest_order_date desc nulls last,
 q.commercial_item_id
limit greatest(1,least(coalesce(result_limit,40),150));
$function$;