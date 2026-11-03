-- Prioridad de seguimiento de los cinco libros históricos con formato heterogéneo.
-- No se importan pedidos ni se modifica la sincronización existente.
alter table public.tracking_drive_catalog
  add column if not exists priority_from date,
  add column if not exists historical_review_policy text not null default 'standard'
    check (historical_review_policy in ('standard','defer_before_priority'));
update public.tracking_drive_catalog
set priority_from=date '2026-07-01',
    historical_review_policy='defer_before_priority'
where source_title in (
  'PEDIDOS CUBAS ELECNOR.xlsx',
  'PEDIDOS LYMA.xlsx',
  'PEDIDOS OBRAS MORALOBO-VARIOS.xlsx',
  'PEDIDOS TALLER.xlsx',
  'PEDIDOS VARIOS.xlsx'
)
and status='candidate' and automatic_import_enabled=false;
comment on column public.tracking_drive_catalog.priority_from is
 'Prioridad de revisión documental. NO significa importar ni reclamar automáticamente anteriores ni excluir historia.';
comment on column public.tracking_drive_catalog.historical_review_policy is
 'Para fuentes problemáticas, posponer reconstrucción anterior a priority_from sin borrar información.';
