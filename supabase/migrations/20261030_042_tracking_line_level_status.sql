-- Seguimiento: distinguir cada material recibido de la cabecera de su pedido.
-- En Excel, FINALIZADO SI puede ser celda combinada en M cubriendo varias líneas;
-- solo esas líneas verdes + SI se consideran recibidas. Las demás siguen abiertas.
alter table public.tracking_lines
  add column if not exists source_green boolean not null default false,
  add column if not exists source_si boolean not null default false,
  add column if not exists drive_line_finalized boolean not null default false;
comment on column public.tracking_lines.source_green is 'Celda de material verde en origen XLSX (relleno registrado)';
comment on column public.tracking_lines.source_si is 'SI de FINALIZADO en la fila o celda combinada que la incluye';
comment on column public.tracking_lines.drive_line_finalized is 'Confirmado recibido solo cuando la celda es verde Y FINALIZADO SI cubre esta linea';
comment on column public.tracking_orders.drive_finalized is 'Pedido cerrado en Drive solamente si TODAS sus lineas estan finalizadas. No es un OR de algun SI.';
