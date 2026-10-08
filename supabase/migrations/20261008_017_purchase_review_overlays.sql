
create table if not exists public.purchase_line_overrides (
 order_line_id bigint primary key references public.order_lines(id) on delete restrict,
 corrected_reference text,
 corrected_description text,
 excluded boolean not null default false,
 reason text not null,
 revision integer not null default 1 check (revision > 0),
 reviewed_by text not null,
 reviewed_at timestamptz not null default now(),
 check (corrected_reference is null or length(btrim(corrected_reference)) between 1 and 120),
 check (corrected_description is null or length(btrim(corrected_description)) between 1 and 1000)
);
create table if not exists public.purchase_order_overrides (
 order_id bigint primary key references public.orders(id) on delete restrict,
 excluded boolean not null default false,
 reason text not null,
 revision integer not null default 1 check(revision > 0),
 reviewed_by text not null,
 reviewed_at timestamptz not null default now()
);
create table if not exists public.purchase_review_events (
 id bigint generated always as identity primary key,
 target_type text not null check(target_type in ('line','order')),
 target_id bigint not null,
 previous_value jsonb not null,
 next_value jsonb not null,
 reason text not null,
 actor text not null,
 occurred_at timestamptz not null default now()
);
create index if not exists purchase_review_events_target_idx
 on public.purchase_review_events(target_type,target_id,occurred_at desc,id desc);
alter table public.purchase_line_overrides enable row level security;
alter table public.purchase_order_overrides enable row level security;
alter table public.purchase_review_events enable row level security;
revoke all on public.purchase_line_overrides from public,anon,authenticated;
revoke all on public.purchase_order_overrides from public,anon,authenticated;
revoke all on public.purchase_review_events from public,anon,authenticated;
grant select on public.purchase_line_overrides to authenticated;
grant select on public.purchase_order_overrides to authenticated;
grant select on public.purchase_review_events to authenticated;
create policy purchase_line_override_read on public.purchase_line_overrides for select to authenticated using ((select private.has_app_access()));
create policy purchase_order_override_read on public.purchase_order_overrides for select to authenticated using ((select private.has_app_access()));
create policy purchase_review_events_read on public.purchase_review_events for select to authenticated using ((select private.has_app_access()));
alter table public.normalization_review_groups add column if not exists candidate_active boolean not null default true;

create or replace view public.order_lines_effective with (security_invoker = true) as
select
 l.id,l.order_id,l.line_number,l.source_row,l.material_id,l.commercial_item_id,l.quantity,
 coalesce(x.corrected_reference,l.supplier_reference) supplier_reference,
 coalesce(x.corrected_description,l.description_original) description_original,
 l.pvp,l.discount_raw,l.discount_components_raw,l.net_unit_price,l.total_price,
 l.price_validation_status,l.price_validation_detail,l.line_kind,
 l.line_kind_confidence,l.line_kind_reasons,l.line_kind_review_status,
 l.supplier_reference supplier_reference_source,
 l.description_original description_source,
 x.corrected_reference,x.corrected_description,
 coalesce(x.excluded,false) line_excluded,
 coalesce(z.excluded,false) order_excluded,
 not (coalesce(x.excluded,false) or coalesce(z.excluded,false)) usable_for_prices,
 coalesce(x.revision,0) line_review_revision,
 coalesce(z.revision,0) order_review_revision,
 x.reason line_review_reason,x.reviewed_at line_reviewed_at,x.reviewed_by line_reviewed_by,
 z.reason order_review_reason,z.reviewed_at order_reviewed_at,z.reviewed_by order_reviewed_by
from public.order_lines l
left join public.purchase_line_overrides x on x.order_line_id=l.id
left join public.purchase_order_overrides z on z.order_id=l.order_id;
revoke all on public.order_lines_effective from public,anon;
grant select on public.order_lines_effective to authenticated;
comment on view public.order_lines_effective is 'Corrected purchase values for prices, original values preserved.';
