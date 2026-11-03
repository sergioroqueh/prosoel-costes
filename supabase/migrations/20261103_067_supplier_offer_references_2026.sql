-- Referencias de ofertas comerciales extraídas de pedidos XLSX (exclusivamente 2026).
-- Independiente de los PDF, precios históricos y el campo legacy supplier_offer_reference.
-- No se modifican pedidos ni líneas. El número de oferta es 1:N por pedido.

create table if not exists public.order_supplier_offer_references (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete restrict,
  offer_reference text not null check (length(trim(offer_reference)) between 3 and 64),
  source_filename text not null,
  source_sha256 char(64) not null,
  source_cell text not null default 'D4' check (source_cell='D4'),
  source_observations text not null default '',
  link_method text not null default 'sha256' check (link_method in ('sha256','number_unique','number_filename')),
  created_at timestamptz not null default now(),
  unique(order_id, offer_reference)
);

create index if not exists idx_supplier_offer_references_order
 on public.order_supplier_offer_references(order_id);

-- Esta tabla es independiente de la futura capa de PDF. Valida 2026 por sí misma.
create or replace function private.ensure_2026_supplier_ref_order()
returns trigger language plpgsql set search_path = '' as $check$
begin
  if not exists (select 1 from public.orders o where o.id=new.order_id and o.order_year=2026) then
    raise exception 'Las ofertas solo se vinculan a pedidos de 2026';
  end if;
  return new;
end
$check$;
revoke all on function private.ensure_2026_supplier_ref_order() from public,anon,authenticated;
drop trigger if exists trg_2026_offer_ref_order on public.order_supplier_offer_references;
create trigger trg_2026_offer_ref_order
  before insert or update of order_id on public.order_supplier_offer_references
  for each row execute function private.ensure_2026_supplier_ref_order();

alter table public.order_supplier_offer_references enable row level security;
revoke all on public.order_supplier_offer_references from anon, authenticated;
-- Solo se exponen a los usuarios los códigos. Las observaciones completas de
-- obra quedan reservadas a la auditoría administrativa en la base de datos.
grant select(id,order_id,offer_reference) on public.order_supplier_offer_references to authenticated;

create policy order_supplier_offer_references_read
 on public.order_supplier_offer_references for select to authenticated
 using ((select private.has_app_access()));

-- RPC administrativa idempotente, usada tanto por la alta nueva como por un lote histórico.
-- Solo vincula documentos si coinciden a la vez SHA-256, nombre original y año 2026.
-- No permite búsquedas por número de pedido que pudieran confundir subpedidos.
create or replace function public.record_2026_supplier_offer_references(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $body$
declare
  item jsonb;
  ref_item jsonb;
  v_sha text;
  v_filename text;
  v_reference text;
  v_source text;
  v_cell text;
  v_order_id bigint;
  v_match_count integer;
  v_inserted integer:=0;
  v_existing integer:=0;
  v_skipped integer:=0;
  v_unmatched integer:=0;
  v_entries integer:=0;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.app_users u
    where lower(u.email)=lower(coalesce((select auth.jwt())->>'email',''))
      and u.active and u.role='admin'
  ) then
    raise exception 'No autorizado para importar referencias de ofertas'
      using errcode='42501';
  end if;

  if p_items is null or jsonb_typeof(p_items)<>'array'
     or jsonb_array_length(p_items) > 50 then
    raise exception 'Debe enviar una lista de hasta 50 Excel verificados';
  end if;

  for item in select value from jsonb_array_elements(p_items) loop
    v_sha:=lower(trim(item->>'source_sha256'));
    v_filename:=item->>'source_filename';
    if v_sha is null or v_sha !~ '^[a-f0-9]{64}$'
       or coalesce(length(v_filename),0) not between 1 and 350 then
      v_skipped:=v_skipped+1; continue;
    end if;
    if jsonb_typeof(item->'references')<>'array'
       or jsonb_array_length(item->'references')>16 then
      v_skipped:=v_skipped+1; continue;
    end if;

    select count(*),min(o.id) into v_match_count,v_order_id
    from public.orders o
    where o.order_year=2026 and btrim(o.source_sha256)=v_sha
      and o.source_filename=v_filename;

    if v_match_count<>1 then
      v_unmatched:=v_unmatched+1;
      continue;
    end if;

    for ref_item in select value from jsonb_array_elements(item->'references') loop
      v_reference:=trim(ref_item->>'reference');
      v_cell:=trim(ref_item->>'source_cell');
      v_source:=ref_item->>'source_text';
      if v_reference is null or length(v_reference) not between 3 and 64
         or v_reference !~ '^[A-Za-z0-9][A-Za-z0-9./ _-]{2,63}$'
         or length(regexp_replace(v_reference,'[^0-9]','','g'))<3
         or v_cell is distinct from 'D4'
         or coalesce(length(v_source),0) not between 5 and 2000
         or v_source !~* 'OFERTAS?'
         or strpos(
               lower(regexp_replace(v_source,'[[:space:]]','','g')),
               lower(regexp_replace(v_reference,'[[:space:]]','','g'))
             )=0 then
        v_skipped:=v_skipped+1;continue;
      end if;

      insert into public.order_supplier_offer_references
        (order_id,offer_reference,source_filename,source_sha256,source_cell,source_observations)
      values (v_order_id,v_reference,v_filename,v_sha,v_cell,v_source)
      on conflict (order_id,offer_reference) do nothing;
      if found then
        v_inserted:=v_inserted+1;
      else
        v_existing:=v_existing+1;
      end if;
    end loop;
    v_entries:=v_entries+1;
  end loop;
  return jsonb_build_object('files_matched',v_entries,'references_inserted',v_inserted,
    'references_existing',v_existing,'rejected_records',v_skipped,'unmatched_files',v_unmatched);
end
$body$;

revoke all on function public.record_2026_supplier_offer_references(jsonb)
  from public,anon,authenticated;
grant execute on function public.record_2026_supplier_offer_references(jsonb)
  to authenticated;

comment on table public.order_supplier_offer_references is
 'Números de oferta extraídos de Excel 2026: históricos por número único/archivo y nuevos por SHA+nombre. No incluye PDF ni modifica importes.';
