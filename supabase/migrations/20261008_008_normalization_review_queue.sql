-- PROSOEL Costes F7 / V7 - cola de REVISIÓN, sin normalización automática.
-- Misma referencia de compra NO es prueba de identidad técnica.
-- Los precios originales y las relaciones material_id permanecen intactos.

create table if not exists public.normalization_review_groups (
    reference_key text primary key,
    observed_reference text not null,
    sample_description text not null,
    supplier_count integer not null check (supplier_count >= 1),
    purchase_count integer not null check (purchase_count >= 1),
    line_count integer not null check (line_count >= 1),
    description_count integer not null check (description_count >= 1),
    distinct_wattages integer not null default 0,
    latest_order_date date,
    priority_score integer not null default 0,
    risk_level text not null default 'review'
        check (risk_level in ('technical_conflict','variant_descriptions','cross_supplier')),
    review_status text not null default 'pending'
        check (review_status in ('pending','needs_evidence','distinct_products','ready_for_mapping')),
    review_note text,
    reviewed_at timestamptz,
    reviewed_by text,
    created_at timestamptz not null default now(),
    refreshed_at timestamptz not null default now()
);

alter table public.normalization_review_groups enable row level security;
drop policy if exists normalization_review_read on public.normalization_review_groups;
create policy normalization_review_read
on public.normalization_review_groups
for select to authenticated
using ((select private.has_app_access()));

revoke all on public.normalization_review_groups from public, anon, authenticated;
grant select on public.normalization_review_groups to authenticated;

create index if not exists normalization_review_groups_priority_idx
on public.normalization_review_groups(review_status, priority_score desc, reference_key);

-- Inventario deduplicado por código observado, únicamente propuestas de revisión.
-- No se crean materiales canónicos ni se aprueba ninguna equivalencia.
with grouped as (
    select
      upper(regexp_replace(btrim(ol.supplier_reference),'[[:space:]]+','','g')) as reference_key,
      min(ol.supplier_reference) as observed_reference,
      max(ol.description_original) as sample_description,
      count(distinct o.supplier_id)::integer as supplier_count,
      count(distinct ol.order_id)::integer as purchase_count,
      count(*)::integer as line_count,
      count(distinct regexp_replace(upper(ol.description_original),'[[:space:]]+',' ','g'))::integer as description_count,
      count(distinct (regexp_match(lower(ol.description_original),'([0-9]+)[[:space:]]*w([^[:alpha:]]|$)'))[1])::integer as distinct_wattages,
      max(o.order_date) as latest_order_date
    from public.order_lines ol
    join public.orders o on o.id = ol.order_id
    where ol.supplier_reference is not null
      and length(btrim(ol.supplier_reference)) between 3 and 64
      and ol.line_kind not in ('environmental_fee','freight','service')
    group by 1
)
insert into public.normalization_review_groups
(reference_key,observed_reference,sample_description,supplier_count,purchase_count,line_count,
 description_count,distinct_wattages,latest_order_date,priority_score,risk_level)
select reference_key,observed_reference,sample_description,supplier_count,purchase_count,line_count,
       description_count,distinct_wattages,latest_order_date,
       (case when distinct_wattages>1 then 100000 else 0 end
          + least(supplier_count,10)*1000
          + least(purchase_count,100)*10
          + least(description_count,100))::integer,
       (case when distinct_wattages>1 then 'technical_conflict'
             when description_count>1 then 'variant_descriptions'
             else 'cross_supplier' end)
from grouped
where supplier_count>1 or (description_count>1 and line_count>=2)
on conflict(reference_key) do update set
 observed_reference=excluded.observed_reference,
 sample_description=excluded.sample_description,
 supplier_count=excluded.supplier_count,
 purchase_count=excluded.purchase_count,
 line_count=excluded.line_count,
 description_count=excluded.description_count,
 distinct_wattages=excluded.distinct_wattages,
 latest_order_date=excluded.latest_order_date,
 priority_score=excluded.priority_score,
 risk_level=excluded.risk_level,
 refreshed_at=now();

create or replace function public.normalization_review_queue(
 p_query text default null,
 p_risk text default null,
 result_limit integer default 30,
 p_offset integer default 0
)
returns table (
 reference_key text,
 observed_reference text,
 sample_description text,
 supplier_count integer,
 purchase_count integer,
 line_count integer,
 description_count integer,
 distinct_wattages integer,
 latest_order_date date,
 priority_score integer,
 risk_level text,
 review_status text,
 total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $body$
  select g.reference_key,g.observed_reference,g.sample_description,
         g.supplier_count,g.purchase_count,g.line_count,g.description_count,g.distinct_wattages,
         g.latest_order_date,g.priority_score,g.risk_level,g.review_status,
         count(*) over() as total_count
  from public.normalization_review_groups g
  where private.has_app_access()
    and (nullif(btrim(p_query),'') is null
      or g.reference_key ilike '%' || btrim(p_query) || '%'
      or g.sample_description ilike '%' || btrim(p_query) || '%')
    and (nullif(p_risk,'') is null or g.risk_level=p_risk)
  order by g.priority_score desc, g.purchase_count desc, g.reference_key asc
  limit greatest(1,least(coalesce(result_limit,30),50))
  offset greatest(0,least(coalesce(p_offset,0),10000));
$body$;

revoke all on function public.normalization_review_queue(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.normalization_review_queue(text,text,integer,integer) to authenticated;

comment on table public.normalization_review_groups is
 'Propuestas no vinculantes para revisión manual. No une productos ni altera precios históricos.';
