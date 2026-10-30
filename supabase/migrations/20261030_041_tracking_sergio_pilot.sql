-- Seguimiento de pedidos (piloto restringido): fuente externa de Drive, solo lectura; cierres locales reversibles.
-- La app usa compras@prosoel.es para el perfil Sergio. Israel NO tiene acceso por RLS.
create table if not exists public.tracking_sources (
  id text primary key,
  display_name text not null,
  drive_url text not null,
  modified_at_source timestamptz,
  synced_at timestamptz not null default now(),
  sync_mode text not null default 'snapshot' check (sync_mode in ('snapshot','scheduled'))
);
create table if not exists public.tracking_orders (
  id bigint generated always as identity primary key,
  source_id text not null references public.tracking_sources(id) on delete restrict,
  source_row integer not null check(source_row > 0),
  order_reference text not null,
  order_date date not null,
  supplier text not null default '',
  responsible text not null default '',
  delivery_location text not null default '',
  drive_finalized boolean not null default false,
  reception_date date,
  unique(source_id,source_row)
);
create index if not exists tracking_orders_by_date on public.tracking_orders(order_date desc);
create table if not exists public.tracking_lines (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.tracking_orders(id) on delete cascade,
  source_row integer not null check(source_row > 0),
  reference text not null default '',
  description text not null default '',
  requested_qty numeric(14,3) check(requested_qty >= 0),
  albaran text not null default '',
  observations text not null default '',
  unique(order_id,source_row)
);
create index if not exists tracking_lines_by_order on public.tracking_lines(order_id);
-- Event sourcing: no actualiza el documento de Drive ni borra decisiones anteriores.
create table if not exists public.tracking_decisions (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.tracking_orders(id) on delete restrict,
  decision text not null check(decision in ('closed','reopened')),
  reason text not null check(length(btrim(reason)) between 4 and 500),
  actor_uid uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists tracking_decisions_latest on public.tracking_decisions(order_id,created_at desc,id desc);

alter table public.tracking_sources enable row level security;
alter table public.tracking_orders enable row level security;
alter table public.tracking_lines enable row level security;
alter table public.tracking_decisions enable row level security;

revoke all on public.tracking_sources,public.tracking_orders,public.tracking_lines,public.tracking_decisions from public,anon,authenticated;
grant select on public.tracking_sources,public.tracking_orders,public.tracking_lines,public.tracking_decisions to authenticated;
grant insert on public.tracking_decisions to authenticated;
grant usage,select on sequence public.tracking_decisions_id_seq to authenticated;

-- Comprobar identidad autenticada + autorización de aplicación. Nunca basarse en user_metadata.
create policy "Solo Sergio lee fuentes seguimiento" on public.tracking_sources for select to authenticated
 using ((select auth.uid()) is not null
 and lower(coalesce((select auth.jwt())->>'email','')) = 'compras@prosoel.es'
 and (select private.has_app_access()));
create policy "Solo Sergio lee pedidos seguimiento" on public.tracking_orders for select to authenticated
 using ((select auth.uid()) is not null
 and lower(coalesce((select auth.jwt())->>'email','')) = 'compras@prosoel.es'
 and (select private.has_app_access()));
create policy "Solo Sergio lee lineas seguimiento" on public.tracking_lines for select to authenticated
 using ((select auth.uid()) is not null
 and lower(coalesce((select auth.jwt())->>'email','')) = 'compras@prosoel.es'
 and (select private.has_app_access()));
create policy "Solo Sergio lee decisiones seguimiento" on public.tracking_decisions for select to authenticated
 using ((select auth.uid()) is not null
 and lower(coalesce((select auth.jwt())->>'email','')) = 'compras@prosoel.es'
 and (select private.has_app_access()));
create policy "Solo Sergio registra cierres reversibles" on public.tracking_decisions for insert to authenticated
 with check ((select auth.uid()) is not null
 and actor_uid=(select auth.uid())
 and lower(coalesce((select auth.jwt())->>'email','')) = 'compras@prosoel.es'
 and (select private.has_app_access()));

comment on table public.tracking_orders is 'Fuente actual de seguimiento: Excel por obra de Google Drive. FINALIZADO SI prevalece.';
comment on table public.tracking_decisions is 'Bitacora inmutable de cierres/reaperturas del piloto. No modifica Drive.';
