
create or replace function public.purchase_reference_review_history(p_reference text, result_limit integer default 500)
returns table (
 order_line_id bigint,order_id bigint,order_reference text,order_year integer,
 order_number integer,order_subnumber text,order_date date,supplier_id bigint,
 supplier text,project text,quantity numeric,supplier_reference text,
 description_original text,pvp numeric,discount_raw text,net_unit_price numeric,
 total_price numeric,price_validation_status text,source_filename text,
 supplier_reference_source text,description_source text,
 corrected_reference text,corrected_description text,
 line_excluded boolean,order_excluded boolean,usable_for_prices boolean,
 line_review_revision integer,order_review_revision integer,
 line_review_reason text,order_review_reason text,
 line_reviewed_by text,order_reviewed_by text,
 belongs_to_effective_reference boolean
)
language sql stable security invoker set search_path='public'
as $fn$
 select l.id,o.id,o.order_reference,o.order_year,o.order_number,o.order_subnumber,
  o.order_date,o.supplier_id,s.name,p.name,l.quantity,
  l.supplier_reference,l.description_original,l.pvp,l.discount_raw,
  l.net_unit_price,l.total_price,l.price_validation_status,o.source_filename,
  l.supplier_reference_source,l.description_source,
  l.corrected_reference,l.corrected_description,
  l.line_excluded,l.order_excluded,l.usable_for_prices,
  l.line_review_revision,l.order_review_revision,
  l.line_review_reason,l.order_review_reason,
  l.line_reviewed_by,l.order_reviewed_by,
  l.usable_for_prices
   and lower(regexp_replace(coalesce(l.supplier_reference,''),'[[:space:]]+','','g'))
    =lower(regexp_replace(btrim(p_reference),'[[:space:]]+','','g'))
 from public.order_lines_effective l
 join public.orders o on o.id=l.order_id
 left join public.suppliers s on s.id=o.supplier_id
 left join public.projects p on p.id=o.project_id
 where private.has_app_access()
  and length(btrim(coalesce(p_reference,''))) between 3 and 64
  and l.line_kind not in ('environmental_fee','freight','service')
  and (
   lower(regexp_replace(coalesce(l.supplier_reference,''),'[[:space:]]+','','g'))
     = lower(regexp_replace(btrim(p_reference),'[[:space:]]+','','g'))
   or lower(regexp_replace(coalesce(l.supplier_reference_source,''),'[[:space:]]+','','g'))
     = lower(regexp_replace(btrim(p_reference),'[[:space:]]+','','g'))
  )
 order by o.order_date desc nulls last,o.id desc,l.line_number desc
 limit greatest(1,least(coalesce(result_limit,500),500));
$fn$;
revoke all on function public.purchase_reference_review_history(text,integer) from public,anon;
grant execute on function public.purchase_reference_review_history(text,integer) to authenticated;
