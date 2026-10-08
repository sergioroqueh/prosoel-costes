CREATE OR REPLACE FUNCTION public.material_research_priority(result_limit integer DEFAULT 40)
 RETURNS TABLE(commercial_item_id bigint, supplier_reference text, supplier_description text, supplier_name text, purchase_count bigint, latest_order_date date, research_attempts integer, family_hint text, conflicting_descriptions bigint, code_collision boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
with scored as (
 select
 q.commercial_item_id,
 q.source_reference supplier_reference,
 q.source_description supplier_description,
 s.name supplier_name,
 count(distinct l.order_id)::bigint purchase_count,
 max(o.order_date) latest_order_date,
 q.attempt_count research_attempts,
 coalesce(q.extracted_signals->>'cable_family',
   case when upper(q.source_description) like '%AISCAN%' then 'AISCAN'
        when upper(q.source_description) like '%TX3%' then 'LEGRAND-TX3'
        else '' end
 ) family_hint,
 count(distinct upper(l.description_original))::bigint conflicting_descriptions,
 exists (
   select 1 from public.commercial_items other
   where upper(btrim(other.supplier_reference))=upper(btrim(q.source_reference))
    and other.id<>q.commercial_item_id
    and other.preferred_description is distinct from q.source_description
    and exists(select 1 from public.order_lines ol2 where ol2.commercial_item_id=other.id
     and ol2.line_kind not in ('environmental_fee','freight','service'))
 ) code_collision
 from public.material_enrichment_queue q
 join public.commercial_items ci on ci.id=q.commercial_item_id
 join public.suppliers s on ci.supplier_id=s.id
 join public.order_lines_effective l on l.commercial_item_id=ci.id
   and l.usable_for_prices
   and l.line_kind not in ('environmental_fee','freight','service')
 join public.orders o on o.id=l.order_id
 where (auth.role()='service_role' or (select private.has_app_access()))
   and q.status in ('waiting_for_evidence','no_match','needs_review')
   and (q.last_attempt_at is null or q.last_attempt_at < now() - interval '14 days')
 group by q.commercial_item_id,q.source_reference,q.source_description,s.name,
   q.attempt_count,q.extracted_signals
)
select commercial_item_id,supplier_reference,supplier_description,supplier_name,
purchase_count,latest_order_date,research_attempts,family_hint,conflicting_descriptions,code_collision
from scored
where purchase_count>0
order by
 purchase_count desc,
 case when family_hint<>'' then 0 else 1 end,
 latest_order_date desc nulls last,
 commercial_item_id
limit greatest(1,least(coalesce(result_limit,40),150));
$function$;