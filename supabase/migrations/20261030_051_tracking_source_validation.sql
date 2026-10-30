alter table public.tracking_drive_catalog
add column if not exists validation_status text not null default 'unscanned'
check (validation_status in ('unscanned','compatible','incompatible','permission_missing','error')),
add column if not exists validation_at timestamptz,
add column if not exists validation_stats jsonb not null default '{}'::jsonb,
add column if not exists validation_error text;