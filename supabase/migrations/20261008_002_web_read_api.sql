-- PROSOEL Costes - read API additions for static web client

create or replace function public.historical_price_history(
    p_reference text,
    p_description text,
    result_limit integer default 200
)
returns table(
    order_line_id bigint,
    order_id bigint,
    order_reference text,
    order_year integer,
    order_number integer,
    order_subnumber text,
    order_date date,
    supplier text,
    project text,
    quantity numeric,
    supplier_reference text,
    description_original text,
    pvp numeric,
    discount_raw text,
    net_unit_price numeric,
    total_price numeric,
    price_validation_status text,
    source_filename text
)
language sql
stable
security invoker
set search_path = public
as $$
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
    from public.order_lines ol
    join public.orders o on o.id = ol.order_id
    left join public.suppliers s on s.id = o.supplier_id
    left join public.projects p on p.id = o.project_id
    where private.has_app_access()
      and ol.material_id is null
      and ol.line_kind not in ('environmental_fee', 'freight', 'service')
      and (
        (p_reference is not null and ol.supplier_reference = p_reference)
        or ol.description_original = p_description
      )
    order by o.order_date desc nulls last, o.id desc, ol.line_number desc
    limit greatest(1, least(result_limit, 1000));
$$;

revoke execute on function public.historical_price_history(text, text, integer)
from public, anon;
grant execute on function public.historical_price_history(text, text, integer)
to authenticated;

-- Convenience read function for the material header + usage counters.
create or replace function public.material_summary(p_material_id bigint)
returns table(
    id bigint,
    canonical_name text,
    category text,
    subcategory text,
    family text,
    manufacturer text,
    manufacturer_reference text,
    base_unit text,
    attributes jsonb,
    review_status text,
    purchase_count bigint,
    line_count bigint,
    total_quantity numeric,
    min_net_price numeric,
    median_net_price numeric,
    max_net_price numeric,
    last_order_date date
)
language sql
stable
security invoker
set search_path = public
as $$
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
    left join public.order_lines ol
      on ol.material_id = m.id
     and ol.line_kind not in ('environmental_fee', 'freight', 'service')
    left join public.orders o on o.id = ol.order_id
    where private.has_app_access()
      and m.id = p_material_id
    group by m.id;
$$;

revoke execute on function public.material_summary(bigint) from public, anon;
grant execute on function public.material_summary(bigint) to authenticated;
