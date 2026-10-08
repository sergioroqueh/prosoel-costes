-- V12: search and history use authorized effective values, source remains intact.
CREATE OR REPLACE FUNCTION public.search_costs_filtered(search_query text, result_limit integer DEFAULT 30, p_supplier_id bigint DEFAULT NULL::bigint, p_year integer DEFAULT NULL::integer, p_sort text DEFAULT 'relevance'::text, p_offset integer DEFAULT 0)
 RETURNS TABLE(kind text, material_id bigint, title text, reference text, manufacturer text, status text, purchase_count bigint, line_count bigint, last_order_date date, last_net_price numeric, last_supplier text, score real, total_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions'
AS $function$
with
params as (
  select lower(btrim(coalesce(search_query,''))) q,
         regexp_replace(lower(btrim(coalesce(search_query,''))), '[[:space:]]+', '', 'g') compact_q,
         (regexp_match(lower(coalesce(search_query,'')), '([0-9]+)[[:space:]]*w([^[:alpha:]]|$)'))[1] requested_watts
),
eligible as (
  select ol.order_id, ol.material_id, ol.supplier_reference, ol.description_original,
         ol.net_unit_price, o.order_date, o.id as oid, ol.line_number, s.name as supplier
  from public.order_lines_effective ol
  join public.orders o on o.id = ol.order_id
  left join public.suppliers s on s.id = o.supplier_id
  where private.has_app_access()
    and ol.usable_for_prices
    and ol.line_kind not in ('environmental_fee','freight','service')
    and (p_supplier_id is null or o.supplier_id = p_supplier_id)
    and (p_year is null or o.order_year = p_year)
),
scored as (
  select e.*,
      (
        greatest(
          extensions.similarity(lower(e.description_original), p.q),
          extensions.similarity(lower(coalesce(e.supplier_reference,'')), p.q)
        )
        + case when p.compact_q <> '' and regexp_replace(lower(coalesce(e.supplier_reference,'')), '[[:space:]]+', '', 'g') = p.compact_q then 10 else 0 end
        + case when p.compact_q <> '' and
              regexp_replace(lower(e.description_original), '[[:space:]]+', '', 'g') like '%' || p.compact_q || '%'
            then 1.5 else 0 end
        + case when p.requested_watts is null then 0
             when (regexp_match(lower(e.description_original), '([0-9]+)[[:space:]]*w([^[:alpha:]]|$)'))[1] = p.requested_watts then 4
             when (regexp_match(lower(e.description_original), '([0-9]+)[[:space:]]*w([^[:alpha:]]|$)'))[1] is not null then -4
             else 0 end
      )::real relevance,
      (
        lower(e.description_original) like '%' || p.q || '%'
        or (p.compact_q <> '' and regexp_replace(lower(coalesce(e.supplier_reference,'')), '[[:space:]]+', '', 'g') = p.compact_q)
        or extensions.similarity(lower(e.description_original),p.q) >= 0.18
        or extensions.similarity(lower(coalesce(e.supplier_reference,'')),p.q) >= 0.25
      ) matches
  from eligible e cross join params p
),
pending as (
 select 'historical'::text kind, null::bigint material_id,
        e.description_original title, e.supplier_reference reference,
        null::text manufacturer, 'pending'::text status,
        count(distinct e.order_id) purchase_count, count(*) line_count,
        max(e.order_date) last_order_date,
        (array_agg(e.net_unit_price order by e.order_date desc nulls last,e.oid desc,e.line_number desc)
          filter (where e.net_unit_price > 0))[1] last_net_price,
        (array_agg(e.supplier order by e.order_date desc nulls last,e.oid desc,e.line_number desc)
          filter (where e.net_unit_price > 0))[1] last_supplier,
        max(e.relevance) score
 from scored e
 where e.material_id is null and e.matches
 group by e.supplier_reference,e.description_original
),
resolved as (
 select 'material'::text kind,m.id material_id,m.canonical_name title,
        m.manufacturer_reference reference,m.manufacturer,m.review_status status,
        count(distinct e.order_id) purchase_count,count(*) line_count,
        max(e.order_date) last_order_date,
        (array_agg(e.net_unit_price order by e.order_date desc nulls last,e.oid desc,e.line_number desc)
          filter (where e.net_unit_price > 0))[1] last_net_price,
        (array_agg(e.supplier order by e.order_date desc nulls last,e.oid desc,e.line_number desc)
          filter (where e.net_unit_price > 0))[1] last_supplier,
        greatest(
          max(e.relevance),
          extensions.similarity(lower(m.canonical_name),p.q),
          extensions.similarity(lower(coalesce(m.manufacturer_reference,'')),p.q)
             + case when p.compact_q <> '' and regexp_replace(lower(coalesce(m.manufacturer_reference,'')), '[[:space:]]+', '', 'g') = p.compact_q then 10 else 0 end
        )::real score
 from public.materials m
 join scored e on e.material_id=m.id
 cross join params p
 group by m.id,p.q,p.compact_q
 having bool_or(e.matches)
   or lower(m.canonical_name) like '%' || p.q || '%'
   or (p.compact_q <> '' and regexp_replace(lower(coalesce(m.manufacturer_reference,'')), '[[:space:]]+', '', 'g') = p.compact_q)
   or extensions.similarity(lower(m.canonical_name),p.q) >= 0.18
),
all_hits as (
 select * from pending
 union all
 select * from resolved
)
select h.kind,h.material_id,h.title,h.reference,h.manufacturer,h.status,
       h.purchase_count,h.line_count,h.last_order_date,h.last_net_price,h.last_supplier,
       h.score,count(*) over() as total_count
from all_hits h
where length(btrim(coalesce(search_query,''))) between 2 and 150
order by
 case when regexp_replace(lower(coalesce(h.reference,'')), '[[:space:]]+', '', 'g') =
           regexp_replace(lower(btrim(coalesce(search_query,''))), '[[:space:]]+', '', 'g')
           and h.reference is not null then 0 else 1 end asc,
 case when p_sort='price_asc' then h.last_net_price end asc nulls last,
 case when p_sort='price_desc' then h.last_net_price end desc nulls last,
 case when p_sort='recent' then h.last_order_date end desc nulls last,
 case when p_sort='frequent' then h.purchase_count end desc nulls last,
 case when p_sort='relevance' or p_sort is null or p_sort not in ('price_asc','price_desc','recent','frequent')
      then h.score end desc nulls last,
 h.score desc,h.purchase_count desc,h.title asc,h.reference asc
limit greatest(1,least(coalesce(result_limit,30),50))
offset greatest(0,least(coalesce(p_offset,0),10000));
$function$;

CREATE OR REPLACE FUNCTION public.historical_price_history_filtered(p_reference text, p_description text, p_supplier_id bigint DEFAULT NULL::bigint, p_year integer DEFAULT NULL::integer, result_limit integer DEFAULT 500)
 RETURNS TABLE(order_line_id bigint, order_id bigint, order_reference text, order_year integer, order_number integer, order_subnumber text, order_date date, supplier text, project text, quantity numeric, supplier_reference text, description_original text, pvp numeric, discount_raw text, net_unit_price numeric, total_price numeric, price_validation_status text, source_filename text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
 select ol.id,o.id,o.order_reference,o.order_year,o.order_number,o.order_subnumber,
        o.order_date,s.name,p.name,ol.quantity,ol.supplier_reference,
        ol.description_original,ol.pvp,ol.discount_raw,ol.net_unit_price,
        ol.total_price,ol.price_validation_status,o.source_filename
 from public.order_lines_effective ol
 join public.orders o on o.id=ol.order_id
 left join public.suppliers s on s.id=o.supplier_id
 left join public.projects p on p.id=o.project_id
 where private.has_app_access()
    and ol.usable_for_prices
   and ol.material_id is null
   and ol.line_kind not in ('environmental_fee','freight','service')
   and ol.supplier_reference is not distinct from p_reference
   and ol.description_original = p_description
   and (p_supplier_id is null or o.supplier_id=p_supplier_id)
   and (p_year is null or o.order_year=p_year)
 order by o.order_date desc nulls last,o.id desc,ol.line_number desc
 limit greatest(1,least(coalesce(result_limit,500),1000));
$function$;

CREATE OR REPLACE FUNCTION public.reference_purchase_history(p_reference text, result_limit integer DEFAULT 500)
 RETURNS TABLE(order_line_id bigint, order_id bigint, order_reference text, order_year integer, order_number integer, order_subnumber text, order_date date, supplier_id bigint, supplier text, project text, quantity numeric, supplier_reference text, description_original text, pvp numeric, discount_raw text, net_unit_price numeric, total_price numeric, price_validation_status text, source_filename text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select ol.id, o.id, o.order_reference, o.order_year, o.order_number,
         o.order_subnumber, o.order_date, o.supplier_id, s.name, p.name,
         ol.quantity, ol.supplier_reference, ol.description_original, ol.pvp,
         ol.discount_raw, ol.net_unit_price, ol.total_price,
         ol.price_validation_status, o.source_filename
  from public.order_lines_effective ol
  join public.orders o on o.id = ol.order_id
  left join public.suppliers s on s.id = o.supplier_id
  left join public.projects p on p.id = o.project_id
  where private.has_app_access()
    and ol.usable_for_prices
    and length(btrim(coalesce(p_reference, ''))) between 3 and 64
    and ol.supplier_reference is not null
    and lower(regexp_replace(ol.supplier_reference, '[[:space:]]+', '', 'g'))
        = lower(regexp_replace(btrim(p_reference), '[[:space:]]+', '', 'g'))
    and ol.line_kind not in ('environmental_fee', 'freight', 'service')
  order by o.order_date desc nulls last, o.id desc, ol.line_number desc
  limit greatest(1, least(coalesce(result_limit,500),500));
$function$;

CREATE OR REPLACE FUNCTION public.material_price_history(p_material_id bigint, result_limit integer DEFAULT 200)
 RETURNS TABLE(order_line_id bigint, order_id bigint, order_reference text, order_year integer, order_number integer, order_subnumber text, order_date date, supplier text, project text, quantity numeric, supplier_reference text, description_original text, pvp numeric, discount_raw text, net_unit_price numeric, total_price numeric, price_validation_status text, source_filename text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    select
        ol.id,
        o.id,
        o.order_reference,
        o.order_year,
        o.order_number,
        o.order_subnumber,
        o.order_date,
        s.name,
        p.name,
        ol.quantity,
        ol.supplier_reference,
        ol.description_original,
        ol.pvp,
        ol.discount_raw,
        ol.net_unit_price,
        ol.total_price,
        ol.price_validation_status,
        o.source_filename
    from public.order_lines_effective ol
    join public.orders o on o.id = ol.order_id
    left join public.suppliers s on s.id = o.supplier_id
    left join public.projects p on p.id = o.project_id
    where private.has_app_access()
    and ol.usable_for_prices
      and ol.material_id = p_material_id
      and ol.line_kind not in ('environmental_fee', 'freight', 'service')
    order by o.order_date desc nulls last, o.id desc, ol.line_number desc
    limit greatest(1, least(result_limit, 1000));
$function$;

CREATE OR REPLACE FUNCTION public.material_summary(p_material_id bigint)
 RETURNS TABLE(id bigint, canonical_name text, category text, subcategory text, family text, manufacturer text, manufacturer_reference text, base_unit text, attributes jsonb, review_status text, purchase_count bigint, line_count bigint, total_quantity numeric, min_net_price numeric, median_net_price numeric, max_net_price numeric, last_order_date date)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
    select
        m.id,
        m.canonical_name,
        m.category,
        m.subcategory,
        m.family,
        m.manufacturer,
        m.manufacturer_reference,
        m.base_unit,
        m.attributes,
        m.review_status,
        count(distinct ol.order_id),
        count(ol.id),
        coalesce(sum(ol.quantity), 0),
        min(ol.net_unit_price) filter (where ol.net_unit_price > 0),
        percentile_cont(0.5) within group (order by ol.net_unit_price)
            filter (where ol.net_unit_price > 0),
        max(ol.net_unit_price) filter (where ol.net_unit_price > 0),
        max(o.order_date)
    from public.materials m
    left join public.order_lines_effective ol
      on ol.material_id = m.id
     and ol.line_kind not in ('environmental_fee', 'freight', 'service')
     and ol.usable_for_prices
    left join public.orders o on o.id = ol.order_id
    where private.has_app_access()
      and m.id = p_material_id
    group by m.id;
$function$;

