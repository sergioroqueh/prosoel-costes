-- Token de cron aleatorio, guardado cifrado en Supabase Vault. NUNCA imprimirlo.
alter table public.tracking_drive_catalog add column if not exists last_imported_md5 text;

do $$
begin
  if not exists(select 1 from vault.secrets where name='prosoel_tracking_cron_token') then
    perform vault.create_secret(encode(gen_random_bytes(32),'hex'),
      'prosoel_tracking_cron_token','Credencial exclusiva del cron interno de seguimiento PROSOEL');
  end if;
end $$;

create or replace function public.tracking_verify_cron_token(p_token text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_token is not null and length(p_token)=64
    and exists(select 1 from vault.decrypted_secrets
      where name='prosoel_tracking_cron_token'
        and decrypted_secret=p_token);
$$;
revoke all on function public.tracking_verify_cron_token(text) from public,anon,authenticated;
grant execute on function public.tracking_verify_cron_token(text) to service_role;
comment on function public.tracking_verify_cron_token(text) is
  'Solo service_role: comprueba header cron sin revelar ni registrar el secreto.';

-- La función atómica almacena también el MD5 verificado de la última descarga,
-- actualizándose dentro de la misma transacción que los pedidos.
create or replace function public.tracking_set_import_md5(p_file_id text,p_md5 text)
returns void language plpgsql security invoker set search_path=''
as $$
begin
 if current_user <> 'service_role' then
   raise exception 'service_role_required' using errcode='42501';
 end if;
 if p_md5 is null or p_md5 !~ '^[a-fA-F0-9]{32}$' then
   raise exception 'invalid_md5';
 end if;
 update public.tracking_drive_catalog set last_imported_md5=lower(p_md5)
   where file_id=p_file_id and status='approved' and automatic_import_enabled;
 if not found then raise exception 'source_not_authorized'; end if;
end $$;
revoke all on function public.tracking_set_import_md5(text,text) from public,anon,authenticated;
grant execute on function public.tracking_set_import_md5(text,text) to service_role;
