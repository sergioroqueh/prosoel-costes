-- PROSOEL Costes V8 — revisión supervisada dentro de la aplicación.
-- Se registra una decisión SOBRE EL GRUPO OBSERVADO; jamás se unen
-- automáticamente commercial_items, materials ni order_lines.

create table if not exists public.normalization_review_events (
  id bigint generated always as identity primary key,
  reference_key text not null references public.normalization_review_groups(reference_key) on delete restrict,
  previous_status text not null,
  next_status text not null,
  previous_note text,
  next_note text,
  changed_by text not null,
  changed_at timestamptz not null default now()
);

create index if not exists normalization_review_events_key_time
  on public.normalization_review_events (reference_key,changed_at desc,id desc);

alter table public.normalization_review_events enable row level security;
drop policy if exists normalization_review_events_read on public.normalization_review_events;
create policy normalization_review_events_read
  on public.normalization_review_events for select to authenticated
  using ((select private.has_app_access()));
revoke all on public.normalization_review_events from public,anon,authenticated;
grant select on public.normalization_review_events to authenticated;

-- Únicamente la cuenta admin ya registrada puede grabar decisiones.
-- Ningún cliente web puede escribir reviewed_by/reviewed_at ni el histórico.
drop policy if exists normalization_review_admin_update on public.normalization_review_groups;
create policy normalization_review_admin_update
  on public.normalization_review_groups for update to authenticated
  using (
    (select private.has_app_access())
    and exists (
      select 1 from public.app_users a
      where lower(a.email)=lower(coalesce(auth.jwt()->>'email',''))
        and a.active and a.role='admin'
    )
  )
  with check (
    (select private.has_app_access())
    and exists (
      select 1 from public.app_users a
      where lower(a.email)=lower(coalesce(auth.jwt()->>'email',''))
        and a.active and a.role='admin'
    )
  );
grant update (review_status,review_note)
  on public.normalization_review_groups to authenticated;

create or replace function private.audit_normalization_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $body$
declare
  actor text := lower(coalesce(auth.jwt()->>'email',''));
  authorized boolean;
  reason text := btrim(coalesce(new.review_note,''));
begin
  if new.review_status is not distinct from old.review_status
     and new.review_note is not distinct from old.review_note then
     return new;
  end if;

  select exists (
    select 1 from public.app_users a
    where lower(a.email)=actor and a.active and a.role='admin'
  ) into authorized;
  if not authorized then
    raise exception 'No autorizado a registrar decisiones de normalización' using errcode='42501';
  end if;

  if length(reason)>2000 then
    raise exception 'La justificación no puede superar los 2000 caracteres';
  end if;
  if new.review_status='needs_evidence' and length(reason)<12 then
    raise exception 'Indica qué información falta (mínimo 12 caracteres)';
  end if;
  if new.review_status in ('distinct_products','ready_for_mapping') and length(reason)<25 then
    raise exception 'Justifica la decisión técnica (mínimo 25 caracteres)';
  end if;
  if new.review_status='ready_for_mapping' and old.distinct_wattages>1 then
    raise exception 'No se puede declarar listo para vincular: existen potencias técnicas diferentes';
  end if;

  new.review_note:=nullif(reason,'');
  new.reviewed_by:=actor;
  new.reviewed_at:=now();

  insert into public.normalization_review_events (
    reference_key,previous_status,next_status,previous_note,next_note,changed_by,changed_at
  ) values (
    old.reference_key,old.review_status,new.review_status,
    old.review_note,new.review_note,actor,new.reviewed_at
  );
  return new;
end;
$body$;

revoke all on function private.audit_normalization_review() from public,anon,authenticated;
drop trigger if exists normalization_review_audit on public.normalization_review_groups;
create trigger normalization_review_audit
  before update of review_status,review_note
  on public.normalization_review_groups
  for each row
  execute function private.audit_normalization_review();

comment on table public.normalization_review_events is
  'Bitácora no editable de decisiones supervisoras; no consolida materiales.';
