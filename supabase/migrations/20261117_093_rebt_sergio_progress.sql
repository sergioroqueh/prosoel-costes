-- Progreso personal Aprende REBT; no modifica compras ni pedidos.
create table if not exists public.rebt_lesson_progress (
  user_id uuid not null default auth.uid(),
  lesson_id text not null check (length(lesson_id) between 3 and 120),
  completed_at timestamptz,
  favorite boolean not null default false,
  last_answered_correct boolean,
  updated_at timestamptz not null default now(),
  primary key(user_id,lesson_id)
);
alter table public.rebt_lesson_progress enable row level security;
revoke all on public.rebt_lesson_progress from public,anon,authenticated;
create or replace function private.rebt_is_sergio()
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid() is not null
   and lower(coalesce(auth.jwt()->>'email',''))='compras@prosoel.es'
   and exists(select 1 from public.app_users a
     where lower(a.email)='compras@prosoel.es' and a.active and a.role='admin');
$$;
revoke all on function private.rebt_is_sergio() from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.rebt_is_sergio() to authenticated;
drop policy if exists rebt_read on public.rebt_lesson_progress;
create policy rebt_read on public.rebt_lesson_progress for select to authenticated
 using (user_id=auth.uid() and (select private.rebt_is_sergio()));
drop policy if exists rebt_insert on public.rebt_lesson_progress;
create policy rebt_insert on public.rebt_lesson_progress for insert to authenticated
 with check(user_id=auth.uid() and (select private.rebt_is_sergio()));
drop policy if exists rebt_update on public.rebt_lesson_progress;
create policy rebt_update on public.rebt_lesson_progress for update to authenticated
 using(user_id=auth.uid() and (select private.rebt_is_sergio()))
 with check(user_id=auth.uid() and (select private.rebt_is_sergio()));
grant select,insert,update on public.rebt_lesson_progress to authenticated;
