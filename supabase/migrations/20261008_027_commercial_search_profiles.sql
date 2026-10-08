-- PROSOEL V14: descripciones ampliadas por artículo comercial, SIN fusionar productos.
create table if not exists public.commercial_item_search_profiles (
  commercial_item_id bigint primary key references public.commercial_items(id) on delete restrict,
  descriptive_name text not null check(length(btrim(descriptive_name)) between 12 and 500),
  search_terms text[] not null default '{}'::text[],
  source_url text,
  evidence_note text not null default '',
  status text not null default 'draft' check(status in ('draft','approved')),
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(cardinality(search_terms)<=25)
);
alter table public.commercial_item_search_profiles enable row level security;
revoke all on public.commercial_item_search_profiles from public,anon,authenticated;
grant select on public.commercial_item_search_profiles to authenticated;
create policy "Authorized employees can read descriptive search profiles"
 on public.commercial_item_search_profiles for select to authenticated
 using ((select private.has_app_access()));

create table if not exists public.commercial_item_search_profile_events (
 id bigint generated always as identity primary key,
 commercial_item_id bigint not null references public.commercial_items(id) on delete restrict,
 before_value jsonb not null,
 after_value jsonb not null,
 reason text not null,
 actor text not null,
 created_at timestamptz not null default now()
);
alter table public.commercial_item_search_profile_events enable row level security;
revoke all on public.commercial_item_search_profile_events from public,anon,authenticated;
grant select on public.commercial_item_search_profile_events to authenticated;
create policy "Authorized employees can read descriptive profile audit"
 on public.commercial_item_search_profile_events for select to authenticated
 using ((select private.has_app_access()));
comment on table public.commercial_item_search_profiles is
 'Búsqueda enriquecida por item comercial: la fuente y la identidad técnica permanecen intactas. approved solo aprueba texto de búsqueda, no equivalencias.';

-- Perfil semántico basado en documentación del fabricante Pinazo,
-- vinculado a UNA descripción comercial observada en el histórico, no a un código global.
with source_item as (
 select ci.id
 from public.commercial_items ci
 join public.suppliers s on s.id=ci.supplier_id
 where upper(s.name)='GRUPO JARAMA'
   and ci.supplier_reference='PNZ-CIT 250 IB s/Fus PLET TRAF+CONEX INT'
   and ci.preferred_description like 'PNZ-CIT 250 IB s/Fus PLET TRAF+CONEX INT. (DER)%'
   and exists (select 1 from public.order_lines l where l.commercial_item_id=ci.id)
)
insert into public.commercial_item_search_profiles
 (commercial_item_id,descriptive_name,search_terms,source_url,evidence_note,status,reviewed_by,reviewed_at)
select id,
 'Equipo de medida indirecta trifásica PNZ-CIT 250 IB sin fusibles, con pletinas para transformadores, interruptor a la derecha y módulo 3631 PST',
 array[
  'equipo de medida indirecta','medida indirecta trifásica',
  'medida indirecta hasta 198 kW','transformadores de intensidad hasta 300 A',
  'PNZ-CIT 250 IB','equipo medida transformadores intensidad','Pinazo'
 ]::text[],
 'https://pinazo.com/410531i250sfpt---302018---pnz-cit-250-ib-sfus-plet.-trafos',
 'Descripción orientativa de búsqueda. Familia PNZ-CIT confirmada por fabricante (198 kW, TI hasta 300 A). La configuración combinada con módulo 3631 PST procede solo del pedido y NO está validada como referencia comercial completa.',
 'approved',
 'prosoel-search-profile-v14',now()
from source_item
on conflict(commercial_item_id) do nothing;
