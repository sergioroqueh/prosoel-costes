-- PROSOEL / Seguimiento multisede: inventario privado de Drive. NUNCA guarda credenciales.
-- Ningún archivo nuevo se importa automáticamente solo por aparecer en este catálogo.
create table if not exists public.tracking_drive_folders (
  folder_id text primary key,
  parent_id text not null,
  folder_label text not null,
  classification text not null check(classification in ('candidate','excluded','archive')),
  classification_reason text not null,
  last_seen_at timestamptz not null default now()
);
create table if not exists public.tracking_drive_catalog (
  file_id text primary key,
  folder_id text not null references public.tracking_drive_folders(folder_id) on delete restrict,
  source_title text not null,
  source_mime text not null,
  drive_modified_at timestamptz,
  status text not null check(status in ('candidate','approved','review','excluded')),
  reason text not null default '',
  last_seen_at timestamptz not null default now(),
  last_imported_at timestamptz,
  last_imported_modified_at timestamptz,
  import_error text,
  automatic_import_enabled boolean not null default false,
  constraint cannot_autoimport_without_approval check(automatic_import_enabled=false or status='approved')
);
create index if not exists tracking_catalog_folder on public.tracking_drive_catalog(folder_id,status);
create table if not exists public.tracking_sync_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  state text not null check(state in ('discovery','running','success','partial','error','skipped')),
  message text,
  scanned_files integer not null default 0,
  updated_files integer not null default 0,
  unchanged_files integer not null default 0,
  rejected_files integer not null default 0
);
create table if not exists public.tracking_sync_settings (
  id integer primary key check (id=1),
  requested_interval_minutes integer not null default 60 check (requested_interval_minutes>=30 and requested_interval_minutes<=1440),
  automatic_sync_enabled boolean not null default false,
  auth_setup text not null default 'pending' check(auth_setup in ('pending','configured','validated')),
  updated_at timestamptz not null default now()
);
insert into public.tracking_sync_settings(id,requested_interval_minutes,automatic_sync_enabled,auth_setup)
values (1,60,false,'pending') on conflict(id) do nothing;

alter table public.tracking_drive_folders enable row level security;
alter table public.tracking_drive_catalog enable row level security;
alter table public.tracking_sync_runs enable row level security;
alter table public.tracking_sync_settings enable row level security;
revoke all on public.tracking_drive_folders,public.tracking_drive_catalog,public.tracking_sync_runs,public.tracking_sync_settings from public,anon,authenticated;
grant select on public.tracking_drive_folders,public.tracking_drive_catalog,public.tracking_sync_runs,public.tracking_sync_settings to authenticated;
create policy "solo Sergio consulta inventario carpetas" on public.tracking_drive_folders for select to authenticated
 using ((select auth.uid()) is not null and lower(coalesce((select auth.jwt())->>'email',''))='compras@prosoel.es' and (select private.has_app_access()));
create policy "solo Sergio consulta fuentes Drive" on public.tracking_drive_catalog for select to authenticated
 using ((select auth.uid()) is not null and lower(coalesce((select auth.jwt())->>'email',''))='compras@prosoel.es' and (select private.has_app_access()));
create policy "solo Sergio consulta log sincronizacion" on public.tracking_sync_runs for select to authenticated
 using ((select auth.uid()) is not null and lower(coalesce((select auth.jwt())->>'email',''))='compras@prosoel.es' and (select private.has_app_access()));
create policy "solo Sergio consulta configuracion sync" on public.tracking_sync_settings for select to authenticated
 using ((select auth.uid()) is not null and lower(coalesce((select auth.jwt())->>'email',''))='compras@prosoel.es' and (select private.has_app_access()));

comment on table public.tracking_drive_catalog is 'Candidatos a origen de pedidos. No implica autorizacion ni importacion; automatic_import_enabled=false hasta validacion.';
comment on table public.tracking_sync_settings is 'Sincronizacion cada 60 minutos deseada, NO ACTIVA hasta autorizacion Google independiente de la conexion ChatGPT.';
