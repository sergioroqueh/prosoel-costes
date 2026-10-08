-- PROSOEL Costes - bootstrap Supabase
-- Base central para 2 usuarios internos. El navegador solo tendrá lectura.
-- Las escrituras iniciales se hacen por conexión PostgreSQL directa/importador.

create schema if not exists extensions;
create schema if not exists private;

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Usuarios autorizados de la aplicación
-- ---------------------------------------------------------------------------

create table if not exists public.app_users (
    email text primary key,
    display_name text,
    role text not null default 'user',
    active boolean not null default true,
    created_at timestamptz not null default now()
);

create or replace function private.has_app_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.app_users u
        where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          and u.active
    );
$$;

revoke all on function private.has_app_access() from public;
revoke all on function private.has_app_access() from anon;
grant usage on schema private to authenticated;
grant execute on function private.has_app_access() to authenticated;

-- ---------------------------------------------------------------------------
-- Core histórico / catálogo
-- ---------------------------------------------------------------------------

create table if not exists public.suppliers (
    id bigserial primary key,
    name text not null unique,
    created_at timestamptz not null default now()
);

create table if not exists public.projects (
    id bigserial primary key,
    name text not null,
    address text,
    created_at timestamptz not null default now()
);

create table if not exists public.materials (
    id bigserial primary key,
    canonical_name text not null,
    category text,
    subcategory text,
    family text,
    manufacturer text,
    manufacturer_reference text,
    base_unit text,
    canonical_key text unique,
    attributes jsonb not null default '{}'::jsonb,
    review_status text not null default 'pending',
    reviewed_at timestamptz,
    reviewed_by text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.commercial_items (
    id bigserial primary key,
    supplier_id bigint not null references public.suppliers(id),
    supplier_reference text,
    commercial_variant_key text not null,
    manufacturer text,
    manufacturer_reference text,
    preferred_description text,
    material_id bigint references public.materials(id),
    match_status text not null default 'pending',
    match_confidence numeric(5,4),
    match_rule text,
    reviewed_at timestamptz,
    reviewed_by text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(supplier_id, commercial_variant_key)
);

create table if not exists public.material_match_proposals (
    id bigserial primary key,
    commercial_item_id bigint not null references public.commercial_items(id) on delete cascade,
    proposed_material_id bigint references public.materials(id),
    proposed_canonical_key text,
    proposed_canonical_name text,
    proposed_attributes jsonb not null default '{}'::jsonb,
    confidence numeric(5,4),
    rule_id text,
    reasons jsonb not null default '[]'::jsonb,
    status text not null default 'pending',
    reviewed_at timestamptz,
    reviewed_by text,
    review_note text,
    created_at timestamptz not null default now()
);

create table if not exists public.orders (
    id bigserial primary key,
    order_reference text,
    order_year integer,
    order_number integer,
    order_subnumber text,
    order_identity_source text,
    order_identity_status text not null default 'pending',
    order_date date,
    supplier_id bigint references public.suppliers(id),
    project_id bigint references public.projects(id),
    responsible text,
    supplier_contact text,
    supplier_email text,
    project_contact text,
    declared_total numeric(14,4),
    unit_header text,
    template_variant text,
    internal_order_reference text,
    source_filename text not null,
    source_sha256 char(64) not null unique,
    imported_at timestamptz not null default now(),
    imported_by text,
    validation_status text not null default 'pending'
);

create table if not exists public.order_sequence_exceptions (
    id bigserial primary key,
    order_year integer not null,
    order_number integer not null,
    status text not null default 'pending',
    note text,
    reviewed_at timestamptz,
    reviewed_by text,
    created_at timestamptz not null default now(),
    unique(order_year, order_number)
);

create table if not exists public.order_lines (
    id bigserial primary key,
    order_id bigint not null references public.orders(id) on delete restrict,
    line_number integer not null,
    source_row integer not null,
    material_id bigint references public.materials(id),
    commercial_item_id bigint references public.commercial_items(id),
    quantity numeric(14,4) not null,
    supplier_reference text,
    description_original text not null,
    pvp numeric(14,6),
    discount_raw text,
    discount_components_raw jsonb not null default '[]'::jsonb,
    net_unit_price numeric(14,6),
    total_price numeric(14,4),
    price_validation_status text not null default 'pending',
    price_validation_detail jsonb not null default '{}'::jsonb,
    line_kind text not null default 'unknown',
    line_kind_confidence numeric(5,4),
    line_kind_reasons jsonb not null default '[]'::jsonb,
    line_kind_review_status text not null default 'pending',
    unique(order_id, line_number)
);

create table if not exists public.review_issues (
    id bigserial primary key,
    order_id bigint references public.orders(id) on delete cascade,
    order_line_id bigint references public.order_lines(id) on delete cascade,
    issue_type text not null,
    severity text not null,
    detail jsonb not null default '{}'::jsonb,
    status text not null default 'pending',
    reviewed_at timestamptz,
    reviewed_by text,
    review_note text,
    created_at timestamptz not null default now()
);

create table if not exists public.material_reference_relations (
    id bigserial primary key,
    material_id bigint references public.materials(id),
    manufacturer text,
    reference_from text not null,
    reference_to text,
    relation_type text not null,
    confidence numeric(5,4),
    status text not null default 'pending',
    reviewed_at timestamptz,
    reviewed_by text,
    review_note text,
    created_at timestamptz not null default now()
);

create table if not exists public.external_reference_evidence (
    id bigserial primary key,
    relation_id bigint references public.material_reference_relations(id) on delete cascade,
    source_url text not null,
    source_type text not null default 'web',
    source_authority text,
    evidence_summary text,
    checked_at timestamptz not null default now()
);

create table if not exists public.reference_resolutions (
    id bigserial primary key,
    observed_reference text not null,
    manufacturer text,
    canonical_reference text,
    relation_type text not null,
    technical_scope text,
    confidence numeric(5,4),
    status text not null default 'pending',
    rationale text,
    reviewed_at timestamptz,
    reviewed_by text,
    created_at timestamptz not null default now(),
    unique(observed_reference, manufacturer, canonical_reference, relation_type)
);

create table if not exists public.reference_resolution_evidence (
    id bigserial primary key,
    resolution_id bigint not null references public.reference_resolutions(id) on delete cascade,
    source_url text not null,
    source_kind text not null default 'public_web',
    source_title text,
    checked_at timestamptz not null default now(),
    note text
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

create index if not exists idx_order_lines_supplier_reference
    on public.order_lines(supplier_reference);
create index if not exists idx_order_lines_material
    on public.order_lines(material_id);
create index if not exists idx_orders_order_date
    on public.orders(order_date);
create index if not exists idx_orders_sequence
    on public.orders(order_year, order_number);
create index if not exists idx_commercial_items_material
    on public.commercial_items(material_id);
create index if not exists idx_commercial_items_supplier_reference
    on public.commercial_items(supplier_id, supplier_reference);
create index if not exists idx_review_issues_queue
    on public.review_issues(status, issue_type);
create index if not exists idx_order_lines_line_kind
    on public.order_lines(line_kind, line_kind_review_status);

create index if not exists idx_materials_canonical_name_trgm
    on public.materials using gin (lower(canonical_name) extensions.gin_trgm_ops);
create index if not exists idx_materials_manufacturer_reference_trgm
    on public.materials using gin (lower(manufacturer_reference) extensions.gin_trgm_ops);
create index if not exists idx_commercial_items_description_trgm
    on public.commercial_items using gin (lower(preferred_description) extensions.gin_trgm_ops);
create index if not exists idx_order_lines_description_trgm
    on public.order_lines using gin (lower(description_original) extensions.gin_trgm_ops);
create index if not exists idx_order_lines_supplier_reference_trgm
    on public.order_lines using gin (lower(supplier_reference) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- RLS: solo usuarios allowlisted; navegador en modo lectura
-- ---------------------------------------------------------------------------

alter table public.app_users enable row level security;
alter table public.suppliers enable row level security;
alter table public.projects enable row level security;
alter table public.materials enable row level security;
alter table public.commercial_items enable row level security;
alter table public.material_match_proposals enable row level security;
alter table public.orders enable row level security;
alter table public.order_sequence_exceptions enable row level security;
alter table public.order_lines enable row level security;
alter table public.review_issues enable row level security;
alter table public.material_reference_relations enable row level security;
alter table public.external_reference_evidence enable row level security;
alter table public.reference_resolutions enable row level security;
alter table public.reference_resolution_evidence enable row level security;

drop policy if exists app_users_self on public.app_users;
create policy app_users_self
on public.app_users
for select
to authenticated
using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and active
);

do $$
declare
    t text;
begin
    foreach t in array array[
        'suppliers',
        'projects',
        'materials',
        'commercial_items',
        'material_match_proposals',
        'orders',
        'order_sequence_exceptions',
        'order_lines',
        'review_issues',
        'material_reference_relations',
        'external_reference_evidence',
        'reference_resolutions',
        'reference_resolution_evidence'
    ]
    loop
        execute format('drop policy if exists prosoel_read on public.%I', t);
        execute format(
            'create policy prosoel_read on public.%I for select to authenticated using ((select private.has_app_access()))',
            t
        );
    end loop;
end
$$;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select on public.app_users to authenticated;
grant select on
    public.suppliers,
    public.projects,
    public.materials,
    public.commercial_items,
    public.material_match_proposals,
    public.orders,
    public.order_sequence_exceptions,
    public.order_lines,
    public.review_issues,
    public.material_reference_relations,
    public.external_reference_evidence,
    public.reference_resolutions,
    public.reference_resolution_evidence
to authenticated;

-- ---------------------------------------------------------------------------
-- RPC de búsqueda y trazabilidad
-- ---------------------------------------------------------------------------

create or replace function public.search_costs(
    search_query text,
    result_limit integer default 30
)
returns table(
    kind text,
    material_id bigint,
    title text,
    reference text,
    manufacturer text,
    status text,
    purchase_count bigint,
    line_count bigint,
    last_order_date date,
    last_net_price numeric,
    last_supplier text,
    score real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
    with material_hits as (
        select
            m.id,
            m.canonical_name,
            m.manufacturer,
            m.manufacturer_reference,
            m.review_status,
            greatest(
                extensions.similarity(lower(coalesce(m.canonical_name, '')), lower(search_query)),
                extensions.similarity(lower(coalesce(m.manufacturer_reference, '')), lower(search_query)),
                extensions.similarity(lower(coalesce(m.manufacturer, '')), lower(search_query)),
                coalesce(max(extensions.similarity(
                    lower(coalesce(ci.preferred_description, '')),
                    lower(search_query)
                )), 0)
            )::real as score
        from public.materials m
        left join public.commercial_items ci on ci.material_id = m.id
        where private.has_app_access()
          and (
            lower(coalesce(m.canonical_name, '')) like '%' || lower(search_query) || '%'
            or lower(coalesce(m.manufacturer_reference, '')) like '%' || lower(search_query) || '%'
            or lower(coalesce(m.manufacturer, '')) like '%' || lower(search_query) || '%'
            or lower(coalesce(ci.preferred_description, '')) like '%' || lower(search_query) || '%'
            or extensions.similarity(lower(coalesce(m.canonical_name, '')), lower(search_query)) >= 0.18
            or extensions.similarity(lower(coalesce(ci.preferred_description, '')), lower(search_query)) >= 0.18
        )
        group by m.id
    ),
    resolved as (
        select
            'material'::text as kind,
            h.id as material_id,
            h.canonical_name as title,
            h.manufacturer_reference as reference,
            h.manufacturer,
            h.review_status as status,
            count(distinct ol.order_id) as purchase_count,
            count(ol.id) as line_count,
            max(o.order_date) as last_order_date,
            (
                select ol2.net_unit_price
                from public.order_lines ol2
                join public.orders o2 on o2.id = ol2.order_id
                where ol2.material_id = h.id
                  and ol2.net_unit_price > 0
                  and ol2.line_kind not in ('environmental_fee', 'freight', 'service')
                order by o2.order_date desc nulls last, o2.id desc, ol2.line_number desc
                limit 1
            ) as last_net_price,
            (
                select s2.name
                from public.order_lines ol2
                join public.orders o2 on o2.id = ol2.order_id
                left join public.suppliers s2 on s2.id = o2.supplier_id
                where ol2.material_id = h.id
                  and ol2.net_unit_price > 0
                  and ol2.line_kind not in ('environmental_fee', 'freight', 'service')
                order by o2.order_date desc nulls last, o2.id desc, ol2.line_number desc
                limit 1
            ) as last_supplier,
            h.score
        from material_hits h
        left join public.order_lines ol
          on ol.material_id = h.id
         and ol.line_kind not in ('environmental_fee', 'freight', 'service')
        left join public.orders o on o.id = ol.order_id
        group by
            h.id, h.canonical_name, h.manufacturer_reference, h.manufacturer,
            h.review_status, h.score
    ),
    pending as (
        select
            'historical'::text as kind,
            null::bigint as material_id,
            ol.description_original as title,
            ol.supplier_reference as reference,
            null::text as manufacturer,
            'pending'::text as status,
            count(distinct ol.order_id) as purchase_count,
            count(*) as line_count,
            max(o.order_date) as last_order_date,
            (
                array_agg(
                    ol.net_unit_price
                    order by o.order_date desc nulls last, o.id desc, ol.line_number desc
                ) filter (where ol.net_unit_price > 0)
            )[1] as last_net_price,
            (
                array_agg(
                    s.name
                    order by o.order_date desc nulls last, o.id desc, ol.line_number desc
                ) filter (where ol.net_unit_price > 0)
            )[1] as last_supplier,
            greatest(
                extensions.similarity(lower(ol.description_original), lower(search_query)),
                extensions.similarity(lower(coalesce(ol.supplier_reference, '')), lower(search_query))
            )::real as score
        from public.order_lines ol
        join public.orders o on o.id = ol.order_id
        left join public.suppliers s on s.id = o.supplier_id
        where private.has_app_access()
          and ol.material_id is null
          and ol.line_kind not in ('environmental_fee', 'freight', 'service')
          and (
            lower(ol.description_original) like '%' || lower(search_query) || '%'
            or lower(coalesce(ol.supplier_reference, '')) = lower(search_query)
            or extensions.similarity(lower(ol.description_original), lower(search_query)) >= 0.18
            or extensions.similarity(lower(coalesce(ol.supplier_reference, '')), lower(search_query)) >= 0.25
          )
        group by ol.supplier_reference, ol.description_original
    )
    select *
    from (
        select * from resolved
        union all
        select * from pending
    ) all_hits
    order by score desc, purchase_count desc, kind asc
    limit greatest(1, least(result_limit, 100));
$$;

create or replace function public.material_price_history(
    p_material_id bigint,
    result_limit integer default 200
)
returns table(
    order_line_id bigint,
    order_id bigint,
    order_reference text,
    order_year integer,
    order_number integer,
    order_subnumber text,
    order_date date,
    supplier text,
    project text,
    quantity numeric,
    supplier_reference text,
    description_original text,
    pvp numeric,
    discount_raw text,
    net_unit_price numeric,
    total_price numeric,
    price_validation_status text,
    source_filename text
)
language sql
stable
security invoker
set search_path = public
as $$
    select
        ol.id,
        o.id,
        o.order_reference,
        o.order_year,
        o.order_number,
        o.order_subnumber,
        o.order_date,
        s.name,
        p.name,
        ol.quantity,
        ol.supplier_reference,
        ol.description_original,
        ol.pvp,
        ol.discount_raw,
        ol.net_unit_price,
        ol.total_price,
        ol.price_validation_status,
        o.source_filename
    from public.order_lines ol
    join public.orders o on o.id = ol.order_id
    left join public.suppliers s on s.id = o.supplier_id
    left join public.projects p on p.id = o.project_id
    where private.has_app_access()
      and ol.material_id = p_material_id
      and ol.line_kind not in ('environmental_fee', 'freight', 'service')
    order by o.order_date desc nulls last, o.id desc, ol.line_number desc
    limit greatest(1, least(result_limit, 1000));
$$;

create or replace function public.order_counter(p_year integer)
returns table(
    year integer,
    last_registered integer,
    next_expected integer,
    pending_gaps bigint,
    identity_conflicts bigint
)
language sql
stable
security invoker
set search_path = public
as $$
    with summary as (
        select
            max(order_number) filter (where order_identity_status <> 'conflict') as last_registered,
            count(*) filter (where order_identity_status = 'conflict') as identity_conflicts
        from public.orders
        where private.has_app_access()
          and order_year = p_year
    ),
    gaps as (
        select count(*) as pending_gaps
        from public.order_sequence_exceptions
        where private.has_app_access()
          and order_year = p_year
          and status = 'pending'
    )
    select
        p_year,
        summary.last_registered,
        case when summary.last_registered is null then null else summary.last_registered + 1 end,
        gaps.pending_gaps,
        summary.identity_conflicts
    from summary cross join gaps;
$$;

revoke execute on function public.search_costs(text, integer) from public, anon;
revoke execute on function public.material_price_history(bigint, integer) from public, anon;
revoke execute on function public.order_counter(integer) from public, anon;

grant execute on function public.search_costs(text, integer) to authenticated;
grant execute on function public.material_price_history(bigint, integer) to authenticated;
grant execute on function public.order_counter(integer) to authenticated;
