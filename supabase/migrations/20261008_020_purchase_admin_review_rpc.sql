
create or replace function private.apply_purchase_line_review(
 p_line_id bigint,p_action text,p_reference text,p_description text,
 p_reason text,p_expected_revision integer)
returns jsonb language plpgsql volatile security definer set search_path=''
as $fn$
declare
 actor text:=lower(coalesce(auth.jwt()->>'email',''));
 permitted boolean;
 original record;previous record;
 old_rev integer;next_rev integer;
 ref_new text;description_new text;
 excluded_new boolean;
 previous_state jsonb;next_state jsonb;
 previous_ref text;current_ref text;
begin
 select exists(select 1 from public.app_users u
   where u.active and u.role='admin' and lower(u.email)=actor) into permitted;
 if not coalesce(permitted,false) or auth.uid() is null then
  raise exception 'Solo el administrador puede revisar compras' using errcode='42501';
 end if;
 if coalesce(p_action,'') not in ('correct','exclude','restore') then
  raise exception 'Acción no admitida';
 end if;
 if length(btrim(coalesce(p_reason,''))) not between 20 and 2000 then
  raise exception 'Explica el motivo (20 a 2000 caracteres)';
 end if;
 select l.id,l.order_id,l.supplier_reference,l.description_original,
        l.line_kind into original
 from public.order_lines l where l.id=p_line_id for update of l;
 if not found then raise exception 'Línea no encontrada'; end if;
 if original.line_kind in ('environmental_fee','freight','service') then
  raise exception 'Revisa RAEE, portes y servicios por separado de la normalización técnica';
 end if;

 select corrected_reference,corrected_description,excluded,revision into previous
 from public.purchase_line_overrides where order_line_id=p_line_id for update;
 old_rev:=coalesce(previous.revision,0);
 if old_rev<>coalesce(p_expected_revision,-1) then
  raise exception 'Otra sesión ha cambiado esta línea. Recarga antes de confirmar.';
 end if;
 previous_ref:=coalesce(previous.corrected_reference,original.supplier_reference);
 previous_state:=jsonb_build_object(
  'revision',old_rev,'corrected_reference',previous.corrected_reference,
  'corrected_description',previous.corrected_description,'excluded',coalesce(previous.excluded,false));
 if p_action='correct' then
  ref_new:=nullif(btrim(coalesce(p_reference,'')),'');
  description_new:=nullif(btrim(coalesce(p_description,'')),'');
  if length(coalesce(ref_new,''))>120 or length(coalesce(description_new,''))>1000 then
    raise exception 'Referencia o descripción demasiado larga';
  end if;
  if ref_new is not null and length(ref_new)<3 then
    raise exception 'La referencia corregida debe tener al menos 3 caracteres';
  end if;
  if ref_new is not distinct from original.supplier_reference then ref_new:=null; end if;
  if description_new is not distinct from original.description_original then description_new:=null; end if;
  if ref_new is null and description_new is null then
    raise exception 'La corrección no cambia ninguna característica. Para revertir elige Restaurar.';
  end if;
  excluded_new:=false;
 elsif p_action='exclude' then
  ref_new:=previous.corrected_reference;
  description_new:=previous.corrected_description;
  excluded_new:=true;
 else
  ref_new:=null;description_new:=null;excluded_new:=false;
 end if;
 next_rev:=old_rev+1;
 next_state:=jsonb_build_object(
  'revision',next_rev,'corrected_reference',ref_new,'corrected_description',description_new,'excluded',excluded_new);
 if previous_state-'revision'=next_state-'revision' then
  raise exception 'No hay cambios que registrar';
 end if;
 insert into public.purchase_line_overrides
 (order_line_id,corrected_reference,corrected_description,excluded,reason,revision,reviewed_by,reviewed_at)
 values(p_line_id,ref_new,description_new,excluded_new,btrim(p_reason),next_rev,actor,now())
 on conflict(order_line_id) do update set
 corrected_reference=excluded.corrected_reference,
 corrected_description=excluded.corrected_description,
 excluded=excluded.excluded,reason=excluded.reason,
 revision=excluded.revision,reviewed_by=excluded.reviewed_by,reviewed_at=now();

 insert into public.purchase_review_events
 (target_type,target_id,previous_value,next_value,reason,actor)
 values('line',p_line_id,previous_state,next_state,btrim(p_reason),actor);
 current_ref:=coalesce(ref_new,original.supplier_reference);
 perform private.reconcile_review_reference(previous_ref);
 if upper(regexp_replace(btrim(coalesce(previous_ref,'')),'[[:space:]]+','','g'))
    is distinct from upper(regexp_replace(btrim(coalesce(current_ref,'')),'[[:space:]]+','','g')) then
   perform private.reconcile_review_reference(current_ref);
 end if;
 return jsonb_build_object('result','saved','line_id',p_line_id,'revision',next_rev,
   'excluded',excluded_new,'effective_reference',current_ref);
end;
$fn$;

create or replace function private.apply_purchase_order_review(
 p_order_id bigint,p_exclude boolean,p_reason text,p_expected_revision integer)
returns jsonb language plpgsql volatile security definer set search_path=''
as $fn$
declare
 actor text:=lower(coalesce(auth.jwt()->>'email',''));
 permitted boolean;
 old record;old_rev integer;new_rev integer;
 key text;
begin
 select exists(select 1 from public.app_users u
   where u.active and u.role='admin' and lower(u.email)=actor) into permitted;
 if not coalesce(permitted,false) or auth.uid() is null then
  raise exception 'Solo el administrador puede revisar pedidos' using errcode='42501';
 end if;
 if p_exclude is null then raise exception 'Indica si deseas excluir o restaurar'; end if;
 if length(btrim(coalesce(p_reason,''))) not between 25 and 2000 then
  raise exception 'Justifica la exclusión o restauración (25 a 2000 caracteres)';
 end if;
 perform 1 from public.orders where id=p_order_id for update;
 if not found then raise exception 'Pedido no encontrado'; end if;
 select excluded,revision into old from public.purchase_order_overrides
   where order_id=p_order_id for update;
 old_rev:=coalesce(old.revision,0);
 if old_rev<>coalesce(p_expected_revision,-1) then
  raise exception 'Otra sesión ha modificado el pedido. Recarga antes de guardar.';
 end if;
 if coalesce(old.excluded,false)=p_exclude then
  raise exception 'El pedido ya se encuentra en ese estado';
 end if;
 new_rev:=old_rev+1;
 insert into public.purchase_order_overrides
 (order_id,excluded,reason,revision,reviewed_by,reviewed_at)
 values(p_order_id,p_exclude,btrim(p_reason),new_rev,actor,now())
 on conflict(order_id) do update set
   excluded=excluded.excluded,reason=excluded.reason,
   revision=excluded.revision,reviewed_by=excluded.reviewed_by,reviewed_at=now();
 insert into public.purchase_review_events
 (target_type,target_id,previous_value,next_value,reason,actor)
 values('order',p_order_id,
   jsonb_build_object('excluded',coalesce(old.excluded,false),'revision',old_rev),
   jsonb_build_object('excluded',p_exclude,'revision',new_rev),
   btrim(p_reason),actor);
 for key in
  select distinct coalesce(x.corrected_reference,l.supplier_reference)
   from public.order_lines l
   left join public.purchase_line_overrides x on x.order_line_id=l.id
   where l.order_id=p_order_id and l.supplier_reference is not null
 loop
   perform private.reconcile_review_reference(key);
 end loop;
 return jsonb_build_object('result','saved','order_id',p_order_id,
  'excluded',p_exclude,'revision',new_rev);
end;
$fn$;

revoke all on function private.apply_purchase_line_review(bigint,text,text,text,text,integer) from public,anon,authenticated;
revoke all on function private.apply_purchase_order_review(bigint,boolean,text,integer) from public,anon,authenticated;
grant execute on function private.apply_purchase_line_review(bigint,text,text,text,text,integer) to authenticated;
grant execute on function private.apply_purchase_order_review(bigint,boolean,text,integer) to authenticated;

create or replace function public.review_purchase_line(
 p_line_id bigint,p_action text,p_reference text,p_description text,p_reason text,p_expected_revision integer)
returns jsonb language sql volatile security invoker set search_path=''
as $fn$ select private.apply_purchase_line_review(
 p_line_id,p_action,p_reference,p_description,p_reason,p_expected_revision); $fn$;

create or replace function public.review_purchase_order(
 p_order_id bigint,p_exclude boolean,p_reason text,p_expected_revision integer)
returns jsonb language sql volatile security invoker set search_path=''
as $fn$ select private.apply_purchase_order_review(
 p_order_id,p_exclude,p_reason,p_expected_revision); $fn$;

revoke all on function public.review_purchase_line(bigint,text,text,text,text,integer) from public,anon;
revoke all on function public.review_purchase_order(bigint,boolean,text,integer) from public,anon;
grant execute on function public.review_purchase_line(bigint,text,text,text,text,integer) to authenticated;
grant execute on function public.review_purchase_order(bigint,boolean,text,integer) to authenticated;
