-- Capa documental 2026: sin cambios en pedidos, líneas ni precios históricos.
-- No se almacenan PDFs en el repositorio ni en Supabase: se referencia su ID de Drive.
-- Los usuarios de la aplicación solo pueden leer vínculos verificados.
create table if not exists public.order_offer_documents (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders(id) on delete restrict,
  drive_file_id text not null check (drive_file_id ~ '^[A-Za-z0-9_-]{10,128}$'),
  filename text not null check (length(trim(filename)) > 0),
  offer_reference text,
  review_status text not null default 'pending'
    check (review_status in ('pending','verified','rejected')),
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id,drive_file_id)
);
create index if not exists idx_order_offer_documents_order
  on public.order_offer_documents(order_id)
  where review_status='verified';

-- Control de alcance: solamente pedidos cuyo año de origen es 2026.
create or replace function private.ensure_2026_offer_order()
returns trigger language plpgsql set search_path=''
as $$
begin
  if not exists (
    select 1 from public.orders o
    where o.id = new.order_id and o.order_year = 2026
  ) then
    raise exception 'Oferta documental: solo se admiten pedidos de 2026';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_2026_offer_order on public.order_offer_documents;
create trigger trg_2026_offer_order
before insert or update of order_id on public.order_offer_documents
for each row execute function private.ensure_2026_offer_order();
revoke all on function private.ensure_2026_offer_order() from public,anon,authenticated;

alter table public.order_offer_documents enable row level security;
revoke all on table public.order_offer_documents from anon,authenticated;
grant select on table public.order_offer_documents to authenticated;

create policy order_offer_documents_read
  on public.order_offer_documents for select to authenticated
  using ((select private.has_app_access()) and review_status='verified');

comment on table public.order_offer_documents is
  'Ofertas comerciales de proveedores verificadas para pedidos 2026. Excluye albaranes, facturas y documentos no comprobados.';
