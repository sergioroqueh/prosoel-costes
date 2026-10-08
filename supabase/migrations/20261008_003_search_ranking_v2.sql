-- Search ranking v2: preserve historical sourcing; prefer exact codes and matching wattage.
create or replace function public.search_costs(
    search_query text,
    result_limit integer default 30
)
returns table(
    kind text,
    material_id bigint,
    title text,
    reference text,
    manufacturer text,
    status text,
    purchase_count bigint,
    line_count bigint,
    last_order_date date,
    last_net_price numeric,
    last_supplier text,
    score real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
    with material_hits as (
        select
            m.id,
            m.canonical_name,
            m.manufacturer,
            m.manufacturer_reference,
            m.review_status,
            greatest(
                extensions.similarity(lower(coalesce(m.canonical_name, '')), lower(search_query)),
                extensions.similarity(lower(coalesce(m.manufacturer_reference, '')), lower(search_query)),
                extensions.similarity(lower(coalesce(m.manufacturer, '')), lower(search_query)),
                coalesce(max(extensions.similarity(
                    lower(coalesce(ci.preferred_description, '')),
                    lower(search_query)
                )), 0)
            )::real + (
CASE WHEN lower(coalesce(m.manufacturer_reference,'')) = lower(btrim(search_query)) THEN 10 ELSE 0 END
+ CASE WHEN regexp_replace(lower(coalesce(m.canonical_name,'')), '[[:space:]]+', '', 'g') LIKE '%' || regexp_replace(lower(btrim(search_query)), '[[:space:]]+', '', 'g') || '%' THEN 1.5 ELSE 0 END
+ CASE WHEN (regexp_match(lower(search_query), '([0-9]+)[[:space:]]*w([^[:alpha:]]|$)'))[1] IS NULL THEN 0
 WHEN (regexp_match(lower(coalesce(m.canonical_name,'')), '([0-9]+)[[:space:]]*w([^[:alpha:]]|$)'))[1] = (regexp_match(lower(search_query), '([0-9]+)[[:space:]]*w([^[:alpha:]]|$)'))[1] THEN 4
 WHEN (regexp_match(lower(coalesce(m.canonical_name,'')), '([0-9]+)[[:space:]]*w([^[:alpha:]]|$)'))[1] IS NOT NULL THEN -4 ELSE 0 END
)::real as score
        from public.materials m
        left join public.commercial_items ci on ci.material_id = m.id
        where private.has_app_access()
          and (
            lower(coalesce(m.canonical_name, '')) like '%' || lower(search_query) || '%'
            or lower(coalesce(m.manufacturer_reference, '')) like '%' || lower(search_query) || '%'
            or lower(coalesce(m.manufacturer, '')) like '%' || lower(search_query) || '%'
            or lower(coalesce(ci.preferred_description, '')) like '%' || lower(search_query) || '%'
            or extensions.similarity(lower(coalesce(m.canonical_name, '')), lower(search_query)) >= 0.18
            or extensions.similarity(lower(coalesce(ci.preferred_description, '')), lower(search_query)) >= 0.18
        )
        group by m.id
    ),
    resolved as (
        select
            'material'::text as kind,
            h.id as material_id,
            h.canonical_name as title,
            h.manufacturer_reference as reference,
            h.manufacturer,
            h.review_status as status,
            count(distinct ol.order_id) as purchase_count,
            count(ol.id) as line_count,
            max(o.order_date) as last_order_date,
            (
                select ol2.net_unit_price
                from public.order_lines ol2
                join public.orders o2 on o2.id = ol2.order_id
                where ol2.material_id = h.id
                  and ol2.net_unit_price > 0
                  and ol2.line_kind not in ('environmental_fee', 'freight', 'service')
                order by o2.order_date desc nulls last, o2.id desc, ol2.line_number desc
                limit 1
            ) as last_net_price,
            (
                select s2.name
                from public.order_lines ol2
                join public.orders o2 on o2.id = ol2.order_id
                left join public.suppliers s2 on s2.id = o2.supplier_id
                where ol2.material_id = h.id
                  and ol2.net_unit_price > 0
                  and ol2.line_kind not in ('environmental_fee', 'freight', 'service')
                order by o2.order_date desc nulls last, o2.id desc, ol2.line_number desc
                limit 1
            ) as last_supplier,
            h.score
        from material_hits h
        left join public.order_lines ol
          on ol.material_id = h.id
         and ol.line_kind not in ('environmental_fee', 'freight', 'service')
        left join public.orders o on o.id = ol.order_id
        group by
            h.id, h.canonical_name, h.manufacturer_reference, h.manufacturer,
            h.review_status, h.score
    ),
    pending as (
        select
            'historical'::text as kind,
            null::bigint as material_id,
            ol.description_original as title,
            ol.supplier_reference as reference,
            null::text as manufacturer,
            'pending'::text as status,
            count(distinct ol.order_id) as purchase_count,
            count(*) as line_count,
            max(o.order_date) as last_order_date,
            (
                array_agg(
                    ol.net_unit_price
                    order by o.order_date desc nulls last, o.id desc, ol.line_number desc
                ) filter (where ol.net_unit_price > 0)
            )[1] as last_net_price,
            (
                array_agg(
                    s.name
                    order by o.order_date desc nulls last, o.id desc, ol.line_number desc
                ) filter (where ol.net_unit_price > 0)
            )[1] as last_supplier,
            greatest(
                extensions.similarity(lower(ol.description_original), lower(search_query)),
                extensions.similarity(lower(coalesce(ol.supplier_reference, '')), lower(search_query))
            )::real + (
CASE WHEN lower(coalesce(ol.supplier_reference,'')) = lower(btrim(search_query)) THEN 10 ELSE 0 END
+ CASE WHEN regexp_replace(lower(coalesce(ol.description_original,'')), '[[:space:]]+', '', 'g') LIKE '%' || regexp_replace(lower(btrim(search_query)), '[[:space:]]+', '', 'g') || '%' THEN 1.5 ELSE 0 END
+ CASE WHEN (regexp_match(lower(search_query), '([0-9]+)[[:space:]]*w([^[:alpha:]]|$)'))[1] IS NULL THEN 0
 WHEN (regexp_match(lower(coalesce(ol.description_original,'')), '([0-9]+)[[:space:]]*w([^[:alpha:]]|$)'))[1] = (regexp_match(lower(search_query), '([0-9]+)[[:space:]]*w([^[:alpha:]]|$)'))[1] THEN 4
 WHEN (regexp_match(lower(coalesce(ol.description_original,'')), '([0-9]+)[[:space:]]*w([^[:alpha:]]|$)'))[1] IS NOT NULL THEN -4 ELSE 0 END
)::real as score
        from public.order_lines ol
        join public.orders o on o.id = ol.order_id
        left join public.suppliers s on s.id = o.supplier_id
        where private.has_app_access()
          and ol.material_id is null
          and ol.line_kind not in ('environmental_fee', 'freight', 'service')
          and (
            lower(ol.description_original) like '%' || lower(search_query) || '%'
            or lower(coalesce(ol.supplier_reference, '')) = lower(search_query)
            or extensions.similarity(lower(ol.description_original), lower(search_query)) >= 0.18
            or extensions.similarity(lower(coalesce(ol.supplier_reference, '')), lower(search_query)) >= 0.25
          )
        group by ol.supplier_reference, ol.description_original
    )
    select *
    from (
        select * from resolved
        union all
        select * from pending
    ) all_hits
    order by score desc, purchase_count desc, kind asc
    limit greatest(1, least(result_limit, 100));
$$;

