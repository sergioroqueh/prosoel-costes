-- Ignacio recibe exactamente el mismo acceso operativo que Israel.
-- No habilita normalización, importación administrativa ni altas de obras.
do $verify$
begin
  if not exists (
    select 1 from auth.users
    where lower(email)='ivivanco@prosoel.es' and email_confirmed_at is not null
  ) then
    raise exception 'ignacio_auth_account_not_verified';
  end if;
end $verify$;

insert into public.app_users(email,display_name,role,active)
values ('ivivanco@prosoel.es','Ignacio','user',true)
on conflict(email) do update
  set display_name=excluded.display_name,
      role='user',
      active=true;

create or replace function private.can_access_tracking()
returns boolean language sql stable security definer set search_path=''
as $function$
  select (select auth.uid()) is not null
     and lower(coalesce((select auth.jwt())->>'email','')) in
       ('compras@prosoel.es','israel@prosoel.es','ivivanco@prosoel.es')
     and exists (
       select 1 from public.app_users u
       where lower(u.email)=lower(coalesce((select auth.jwt())->>'email',''))
         and u.active
     )
$function$;
revoke all on function private.can_access_tracking() from public,anon,authenticated;
grant execute on function private.can_access_tracking() to authenticated;
comment on function private.can_access_tracking() is
 'Acceso explícito al seguimiento para Sergio, Israel e Ignacio con cuenta activa.';
