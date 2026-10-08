CREATE OR REPLACE FUNCTION public.normalization_review_queue_v3(p_query text DEFAULT NULL::text, p_risk text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_family text DEFAULT NULL::text, p_alerts_only boolean DEFAULT false, p_sort text DEFAULT 'impact'::text, result_limit integer DEFAULT 30, p_offset integer DEFAULT 0)
 RETURNS TABLE(reference_key text, observed_reference text, sample_description text, supplier_count integer, purchase_count integer, line_count integer, description_count integer, distinct_wattages integer, latest_order_date date, priority_score integer, risk_level text, review_status text, suggested_family text, family_signals jsonb, technical_alerts jsonb, requires_recheck boolean, total_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
 select g.reference_key,g.observed_reference,g.sample_description,
        g.supplier_count,g.purchase_count,g.line_count,g.description_count,
        g.distinct_wattages,g.latest_order_date,g.priority_score,g.risk_level,g.review_status,
        g.suggested_family,g.family_signals,g.technical_alerts,
        (g.review_status<>'pending' and g.reviewed_at is not null
         and g.evidence_refreshed_at > g.reviewed_at + interval '1 second') as requires_recheck,
        count(*) over() as total_count
 from public.normalization_review_groups g
 where private.has_app_access()
   and g.candidate_active
   and (nullif(btrim(p_query),'') is null
        or g.reference_key ilike '%'||btrim(p_query)||'%'
        or g.sample_description ilike '%'||btrim(p_query)||'%')
   and (nullif(p_risk,'') is null or g.risk_level=p_risk)
   and (nullif(p_status,'') is null or g.review_status=p_status)
   and (nullif(p_family,'') is null or g.suggested_family=p_family)
   and (not coalesce(p_alerts_only,false) or g.technical_alerts <> '{}'::jsonb)
 order by
   case when coalesce(p_sort,'impact')='impact'
        then case when g.technical_alerts <> '{}'::jsonb then 0 else 1 end end asc nulls last,
   case when coalesce(p_sort,'impact')='impact' then g.purchase_count end desc nulls last,
   case when p_sort='recent' then g.latest_order_date end desc nulls last,
   case when p_sort='purchases' then g.purchase_count end desc nulls last,
   case when p_sort='suppliers' then g.supplier_count end desc nulls last,
   g.priority_score desc,g.reference_key asc
 limit greatest(1,least(coalesce(result_limit,30),50))
 offset greatest(0,least(coalesce(p_offset,0),10000));
$function$;