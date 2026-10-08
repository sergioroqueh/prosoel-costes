
create or replace function private.apply_purchase_lines_bulk(
 p_line_ids bigint[],p_expected_revisions integer[],
 p_reference text,p_description text,p_reason text)
returns jsonb language plpgsql volatile security definer set search_path=''
as $fn$
declare
 actor text:=lower(coalesce(auth.jwt()->>'email',''));
 permitted boolean;
 item_count integer;
 matched integer;
 source_variants integer;
 i integer;
begin
 select exists(select 1 from public.app_users u where u.active and u.role='admin'
   and lower(u.email)=actor) into permitted;
 if not coalesce(permitted,false) or auth.uid() is null then
  raise exception 'Solo un administrador puede corregir grupos' using errcode='42501';
 end if;
 item_count:=coalesce(array_length(p_line_ids,1),0);
 if item_count<2 or item_count>30 or
    coalesce(array_length(p_expected_revisions,1),0)<>item_count then
  raise exception 'Selecciona de 2 a 30 líneas y aporta su revisión esperada';
 end if;
 if length(btrim(coalesce(p_reason,''))) not between 30 and 2000 then
  raise exception 'La corrección conjunta exige una justificación de 30 a 2000 caracteres';
 end if;
 select count(*), count(distinct (l.supplier_reference,l.description_original))
 into matched,source_variants
 from public.order_lines l where l.id=any(p_line_ids);
 if matched<>item_count or source_variants<>1 then
   raise exception 'Solo se pueden corregir conjuntamente líneas distintas con idéntica referencia y descripción de origen';
 end if;
 for i in 1..item_count loop
  perform private.apply_purchase_line_review(
   p_line_ids[i],'correct',p_reference,p_description,p_reason,p_expected_revisions[i]);
 end loop;
 return jsonb_build_object('result','saved','lines_edited',item_count,
   'originals_preserved',true,'audit_events',item_count);
end;
$fn$;
revoke all on function private.apply_purchase_lines_bulk(bigint[],integer[],text,text,text) from public,anon,authenticated;
grant execute on function private.apply_purchase_lines_bulk(bigint[],integer[],text,text,text) to authenticated;
create or replace function public.review_purchase_lines_bulk(
 p_line_ids bigint[],p_expected_revisions integer[],
 p_reference text,p_description text,p_reason text)
returns jsonb language sql volatile security invoker set search_path=''
as $fn$ select private.apply_purchase_lines_bulk(
 p_line_ids,p_expected_revisions,p_reference,p_description,p_reason); $fn$;
revoke all on function public.review_purchase_lines_bulk(bigint[],integer[],text,text,text) from public,anon;
grant execute on function public.review_purchase_lines_bulk(bigint[],integer[],text,text,text) to authenticated;
