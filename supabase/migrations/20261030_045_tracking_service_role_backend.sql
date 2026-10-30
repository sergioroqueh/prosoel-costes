grant select,insert,update on public.tracking_orders,public.tracking_lines to service_role;
grant select,update on public.tracking_sources,public.tracking_drive_catalog to service_role;
grant select on public.tracking_sync_settings to service_role;
grant select,insert on public.tracking_sync_events to service_role;
grant select,insert,update on public.tracking_sync_runs to service_role;
grant usage,select on sequence public.tracking_orders_id_seq,public.tracking_lines_id_seq,
 public.tracking_sync_events_id_seq,public.tracking_sync_runs_id_seq to service_role;