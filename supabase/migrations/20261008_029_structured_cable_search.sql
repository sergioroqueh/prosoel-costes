-- V14: búsqueda guiada de cables por características escritas en cada línea.
-- No une referencias, no infiere el número de conductores cuando no consta.
create or replace function public.search_cables_filtered(
  p_type text default null,
  p_cores integer default null,
  p_section numeric default null,
  p_pe text default null,
  p_color text default null,
  p_supplier_id bigint default null,
  p_year integer default null,
  p_sort text default 'recent',
  result_limit integer default 30,
  p_offset integer default 0
)
returns table (
  kind text,material_id bigint,title text,reference text,manufacturer text,
  status text,purchase_count bigint,line_count bigint,last_order_date date,
  last_net_price numeric,last_supplier text,score real,total_count bigint,
  descriptive_name text,descriptive_source_url text
)
language sql stable
set search_path='public','extensions'
as $body$
with eligible as (
 select ol.order_id,ol.supplier_reference,ol.description_original,ol.net_unit_price,
   o.id as oid,o.order_date,ol.line_number,s.name as supplier,
   sp.descriptive_name,sp.source_url as descriptive_source_url,
   upper(coalesce(ol.description_original,'') || ' ' || coalesce(ol.supplier_reference,'')) as txt
 from public.order_lines_effective ol
 join public.orders o on o.id=ol.order_id
 left join public.suppliers s on s.id=o.supplier_id
 left join public.commercial_item_search_profiles sp
   on sp.commercial_item_id=ol.commercial_item_id and sp.status='approved'
 where private.has_app_access()
  and ol.usable_for_prices
  and ol.material_id is null
  and ol.line_kind not in ('environmental_fee','freight','service')
  and (p_supplier_id is null or o.supplier_id=p_supplier_id)
  and (p_year is null or o.order_year=p_year)
  and (ol.description_original ~* 'CABLE|MANGUERA|CONDUCTOR|RZ1|H07Z1|RV[- ]?K'
       or ol.supplier_reference ~* 'RZ1|H07Z1|RV[- ]?K')
),
parsed as (
 select e.*,
  regexp_match(e.txt,'(^|[^A-Z0-9])([1-9])[[:space:]]*([GX])[[:space:]]*([0-9]{1,3}([,.][0-9]+)?)') as multi,
  regexp_match(e.txt,'([0-9]{1,3}([,.][0-9]+)?)[[:space:]]*MM([^[:alpha:]]|$)') as bare,
  case
   when e.txt ~ 'H07Z1[ -]?K' then 'H07Z1-K'
   when e.txt ~ 'RZ1[ -]?K' then 'RZ1-K'
   when e.txt ~ 'RV[ -]?K' then 'RV-K'
   else 'OTROS'
  end as cable_type
 from eligible e
),
specs as (
 select p.*,
   coalesce(
     (p.multi)[2]::integer,
     case when p.cable_type='H07Z1-K' and (p.bare)[1] is not null then 1 end
   ) as cores,
   case
     when (p.multi)[4] is not null then replace((p.multi)[4],',','.')::numeric
     when p.cable_type='H07Z1-K' and (p.bare)[1] is not null
          then replace((p.bare)[1],',','.')::numeric
   end as section_mm2,
   (p.multi)[3] as cable_pe
 from parsed p
),
hits as (
 select *
 from specs x
 where (nullif(btrim(coalesce(p_type,'')),'') is null or x.cable_type=upper(btrim(p_type)))
   and (p_cores is null or x.cores=p_cores)
   and (p_section is null or x.section_mm2=p_section)
   and (nullif(btrim(coalesce(p_pe,'')),'') is null or x.cable_pe=upper(btrim(p_pe)))
   and (
     nullif(btrim(coalesce(p_color,'')),'') is null
     or (
      case lower(btrim(p_color))
       when 'azul' then x.txt ~ 'AZUL'
       when 'negro' then x.txt ~ 'NEGRO'
       when 'gris' then x.txt ~ 'GRIS'
       when 'marron' then x.txt ~ 'MARR[OÓ]N'
       when 'amarillo_verde' then x.txt ~ 'AMARILLO[ /-]+VERDE|AM-VD'
       else false end
     )
   )
),
grp as (
 select
   'historical'::text kind,null::bigint material_id,
   h.description_original title,h.supplier_reference reference,
   null::text manufacturer,'pending'::text status,
   count(distinct h.order_id) purchase_count,count(*) line_count,
   max(h.order_date) last_order_date,
   (array_agg(h.net_unit_price order by h.order_date desc nulls last,h.oid desc,h.line_number desc)
      filter (where h.net_unit_price>0))[1] last_net_price,
   (array_agg(h.supplier order by h.order_date desc nulls last,h.oid desc,h.line_number desc)
      filter (where h.net_unit_price>0))[1] last_supplier,
   0::real score,max(h.descriptive_name) descriptive_name,
   max(h.descriptive_source_url) descriptive_source_url
 from hits h group by h.supplier_reference,h.description_original
)
select g.kind,g.material_id,g.title,g.reference,g.manufacturer,g.status,
 g.purchase_count,g.line_count,g.last_order_date,g.last_net_price,g.last_supplier,
 g.score,count(*) over() as total_count,g.descriptive_name,g.descriptive_source_url
from grp g
order by
 case when p_sort='price_asc' then g.last_net_price end asc nulls last,
 case when p_sort='price_desc' then g.last_net_price end desc nulls last,
 case when p_sort='frequent' then g.purchase_count end desc nulls last,
 case when p_sort='recent' or p_sort not in ('price_asc','price_desc','frequent')
              then g.last_order_date end desc nulls last,
 g.purchase_count desc,g.title asc,g.reference asc
limit greatest(1,least(coalesce(result_limit,30),50))
offset greatest(0,least(coalesce(p_offset,0),10000));
$body$;
revoke all on function public.search_cables_filtered(text,integer,numeric,text,text,bigint,integer,text,integer,integer) from public,anon;
grant execute on function public.search_cables_filtered(text,integer,numeric,text,text,bigint,integer,text,integer,integer) to authenticated;
revoke all on function public.search_costs_enriched(text,integer,bigint,integer,text,integer) from public,anon;
grant execute on function public.search_costs_enriched(text,integer,bigint,integer,text,integer) to authenticated;
