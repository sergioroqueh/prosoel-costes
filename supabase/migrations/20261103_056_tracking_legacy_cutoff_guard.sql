-- Defense in depth: never import a pre-July order into a legacy-priority source,
-- even if future application code accidentally supplies an older record.
create or replace function public.tracking_guard_legacy_priority()
returns trigger language plpgsql security invoker set search_path='' as $$
declare min_date date;
begin
 select priority_from into min_date from public.tracking_drive_catalog
 where file_id=new.source_id;
 if min_date is not null and new.order_date < min_date then
   raise exception 'legacy_order_before_priority_cutoff' using errcode='23514';
 end if;
 return new;
end $$;
drop trigger if exists tracking_orders_legacy_priority on public.tracking_orders;
create trigger tracking_orders_legacy_priority
before insert or update of source_id,order_date on public.tracking_orders
for each row execute function public.tracking_guard_legacy_priority();
