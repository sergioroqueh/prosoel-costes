-- PROSOEL Costes V5: consultar una referencia DE COMPRA literal entre proveedores.
-- No demuestra equivalencia técnica ni identifica el fabricante.
-- Conserva líneas originales; no mezcla referencias diferentes.
create or replace function public.reference_purchase_history(
  p_reference text,
  result_limit integer default 500
)
returns table(
  order_line_id bigint,
  order_id bigint,
  order_reference text,
  order_year integer,
  order_number integer,
  order_subnumber text,
  order_date date,
  supplier_id bigint,
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
as $body$
  select ol.id, o.id, o.order_reference, o.order_year, o.order_number,
         o.order_subnumber, o.order_date, o.supplier_id, s.name, p.name,
         ol.quantity, ol.supplier_reference, ol.description_original, ol.pvp,
         ol.discount_raw, ol.net_unit_price, ol.total_price,
         ol.price_validation_status, o.source_filename
  from public.order_lines ol
  join public.orders o on o.id = ol.order_id
  left join public.suppliers s on s.id = o.supplier_id
  left join public.projects p on p.id = o.project_id
  where private.has_app_access()
    and length(btrim(coalesce(p_reference, ''))) between 3 and 64
    and ol.supplier_reference is not null
    and lower(regexp_replace(ol.supplier_reference, '[[:space:]]+', '', 'g'))
        = lower(regexp_replace(btrim(p_reference), '[[:space:]]+', '', 'g'))
    and ol.line_kind not in ('environmental_fee', 'freight', 'service')
  order by o.order_date desc nulls last, o.id desc, ol.line_number desc
  limit greatest(1, least(coalesce(result_limit,500),500));
$body$;

revoke all on function public.reference_purchase_history(text,integer) from public, anon;
grant execute on function public.reference_purchase_history(text,integer) to authenticated;
