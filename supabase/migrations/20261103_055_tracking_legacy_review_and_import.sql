-- Pedidos históricos: líneas ambiguas quedan aisladas de las reclamaciones.
-- Los usuarios autenticados solo pueden LEER sus incidencias si son Sergio.
create table if not exists public.tracking_legacy_review (
  id bigint generated always as identity primary key,
  source_id text not null references public.tracking_drive_catalog(file_id),
  source_row integer not null check (source_row>=3),
  source_sheet text not null,
  order_reference text,
  order_date date,
  raw_date text,
  reason text not null,
  lines_json jsonb not null default '[]'::jsonb,
  issues_json jsonb not null default '[]'::jsonb,
  review_status text not null default 'pending' check (review_status in ('pending','resolved','dismissed')),
  source_modified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_id,source_sheet,source_row)
);
create index if not exists tracking_legacy_review_status
  on public.tracking_legacy_review(review_status,source_id,order_date);
alter table public.tracking_legacy_review enable row level security;
revoke all on public.tracking_legacy_review from public,anon,authenticated;
grant select on public.tracking_legacy_review to authenticated;
create policy "solo Sergio consulta pedidos históricos ambiguos"
 on public.tracking_legacy_review for select to authenticated
 using ((select auth.uid()) is not null
  and lower(coalesce((select auth.jwt())->>'email',''))='compras@prosoel.es'
  and (select private.has_app_access()));
grant select,insert on public.tracking_legacy_review to service_role;
grant usage,select on sequence public.tracking_legacy_review_id_seq to service_role;

-- Wrap the existing initial snapshot import so accepted and quarantined material
-- are committed atomically; no partial successful import is possible.
create or replace function public.tracking_import_legacy_recent(
 p_source_id text,p_orders jsonb,p_reviews jsonb,
 p_modified_at timestamptz,p_md5 text,p_cutoff date default date '2026-07-01'
) returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare
  f public.tracking_drive_catalog%rowtype;
  o jsonb; issue jsonb;
  result jsonb;
  expected_reviews int;
  inserted_reviews int:=0;
  seen_rows integer[]:='{}';
  row_num int;
begin
  if current_user<>'service_role' then
    raise exception 'service_role_required' using errcode='42501';
  end if;
  if p_cutoff<>date '2026-07-01' then raise exception 'unsupported_cutoff';end if;
  if p_orders is null or jsonb_typeof(p_orders)<>'array'
     or jsonb_array_length(p_orders)<1
     or p_reviews is null or jsonb_typeof(p_reviews)<>'array'
     or jsonb_array_length(p_reviews)>250 then
    raise exception 'invalid_legacy_snapshot';
  end if;
  select * into f from public.tracking_drive_catalog
    where file_id=p_source_id for update;
  if not found or f.status<>'candidate'
    or f.validation_status<>'compatible'
    or f.priority_from<>p_cutoff
    or f.historical_review_policy<>'defer_before_priority'
    or f.automatic_import_enabled then
    raise exception 'legacy_source_not_approved_for_import';
  end if;
  expected_reviews:=coalesce((f.validation_stats->>'review_records')::int,-1);
  if expected_reviews<>jsonb_array_length(p_reviews) then
    raise exception 'legacy_reviews_count_mismatch';
  end if;
  if coalesce((f.validation_stats->>'recent_orders')::int,0)
     <>jsonb_array_length(p_orders)+
       coalesce((f.validation_stats->>'quarantined_orders')::int,0) then
    raise exception 'legacy_recent_orders_mismatch';
  end if;
  for o in select value from pg_catalog.jsonb_array_elements(p_orders) as x(value) loop
    if (o->>'order_date')::date < p_cutoff
       or (o->>'order_date') is null then
      raise exception 'order_before_cutoff';
    end if;
  end loop;
  for issue in select value from pg_catalog.jsonb_array_elements(p_reviews) as x(value) loop
    row_num:=(issue->>'source_row')::integer;
    if row_num<3 or row_num=any(seen_rows)
       or nullif(issue->>'reason','') is null
       or nullif(issue->>'source_sheet','') is null then
      raise exception 'invalid_legacy_review_entry';
    end if;
    seen_rows:=pg_catalog.array_append(seen_rows,row_num);
    if issue->>'order_date' is not null and
       (issue->>'order_date')::date < p_cutoff then
      raise exception 'review_before_cutoff';
    end if;
  end loop;
  -- Invoker-only routine imports ONLY verified complete orders, no cron enabled.
  result:=public.tracking_initial_import(p_source_id,p_orders,p_modified_at,p_md5);
  for issue in select value from pg_catalog.jsonb_array_elements(p_reviews) as x(value) loop
    insert into public.tracking_legacy_review(
      source_id,source_row,source_sheet,order_reference,order_date,raw_date,
      reason,lines_json,issues_json,source_modified_at
    ) values (
      p_source_id,(issue->>'source_row')::integer,
      issue->>'source_sheet',issue->>'order_reference',
      nullif(issue->>'order_date','')::date,
      issue->>'raw_date',issue->>'reason',
      coalesce(issue->'lines','[]'::jsonb),
      coalesce(issue->'issues','[]'::jsonb),p_modified_at
    );
    inserted_reviews:=inserted_reviews+1;
  end loop;
  return result||jsonb_build_object(
    'review_records',inserted_reviews,
    'cutoff',p_cutoff,'automatic_sync',false);
end $$;
revoke all on function public.tracking_import_legacy_recent(text,jsonb,jsonb,timestamptz,text,date) from public,anon,authenticated;
grant execute on function public.tracking_import_legacy_recent(text,jsonb,jsonb,timestamptz,text,date) to service_role;
