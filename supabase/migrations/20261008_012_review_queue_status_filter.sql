-- PROSOEL Costes V9.2: permitir filtrar candidatos por su estado de revisión.
-- Mantener la función V7 intacta para compatibilidad con versiones anteriores.
create or replace function public.normalization_review_queue_v2(
 p_query text default null,
 p_risk text default null,
 p_status text default null,
 result_limit integer default 30,
 p_offset integer default 0
)
returns table (
 reference_key text, observed_reference text, sample_description text,
 supplier_count integer,purchase_count integer,line_count integer,
 description_count integer,distinct_wattages integer,latest_order_date date,
 priority_score integer,risk_level text,review_status text,total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $function$
 select g.reference_key,g.observed_reference,g.sample_description,
        g.supplier_count,g.purchase_count,g.line_count,g.description_count,g.distinct_wattages,
        g.latest_order_date,g.priority_score,g.risk_level,g.review_status,
        count(*) over() as total_count
 from public.normalization_review_groups g
 where private.has_app_access()
   and (nullif(btrim(p_query),'') is null
     or g.reference_key ilike '%'||btrim(p_query)||'%'
     or g.sample_description ilike '%'||btrim(p_query)||'%')
   and (nullif(p_risk,'') is null or g.risk_level=p_risk)
   and (nullif(p_status,'') is null or g.review_status=p_status)
 order by
   g.priority_score desc,g.purchase_count desc,g.reference_key asc
 limit greatest(1,least(coalesce(result_limit,30),50))
 offset greatest(0,least(coalesce(p_offset,0),10000));
$function$;
revoke all on function public.normalization_review_queue_v2(text,text,text,integer,integer) from public,anon;
grant execute on function public.normalization_review_queue_v2(text,text,text,integer,integer) to authenticated;