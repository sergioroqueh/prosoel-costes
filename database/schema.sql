-- Esquema lógico inicial. PostgreSQL será el objetivo de producción.

CREATE TABLE suppliers (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE materials (
    id BIGSERIAL PRIMARY KEY,
    canonical_name TEXT NOT NULL,
    category TEXT,
    subcategory TEXT,
    family TEXT,
    manufacturer TEXT,
    manufacturer_reference TEXT,
    base_unit TEXT,
    canonical_key TEXT UNIQUE,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    review_status TEXT NOT NULL DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE commercial_items (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT NOT NULL REFERENCES suppliers(id),
    supplier_reference TEXT,
    manufacturer TEXT,
    manufacturer_reference TEXT,
    preferred_description TEXT,
    material_id BIGINT REFERENCES materials(id),
    match_status TEXT NOT NULL DEFAULT 'pending',
    match_confidence NUMERIC(5, 4),
    match_rule TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(supplier_id, supplier_reference)
);

CREATE TABLE material_match_proposals (
    id BIGSERIAL PRIMARY KEY,
    commercial_item_id BIGINT NOT NULL REFERENCES commercial_items(id) ON DELETE CASCADE,
    proposed_material_id BIGINT REFERENCES materials(id),
    proposed_canonical_key TEXT,
    proposed_canonical_name TEXT,
    proposed_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence NUMERIC(5, 4),
    rule_id TEXT,
    reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    review_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_reference TEXT,
    order_year INTEGER,
    order_number INTEGER,
    order_subnumber TEXT,
    order_identity_source TEXT,
    order_identity_status TEXT NOT NULL DEFAULT 'pending',
    order_date DATE,
    supplier_id BIGINT REFERENCES suppliers(id),
    project_id BIGINT REFERENCES projects(id),
    responsible TEXT,
    supplier_contact TEXT,
    supplier_email TEXT,
    project_contact TEXT,
    declared_total NUMERIC(14, 4),
    unit_header TEXT,
    template_variant TEXT,
    internal_order_reference TEXT,
    source_filename TEXT NOT NULL,
    source_sha256 CHAR(64) NOT NULL UNIQUE,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    imported_by TEXT,
    validation_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE order_sequence_exceptions (
    id BIGSERIAL PRIMARY KEY,
    order_year INTEGER NOT NULL,
    order_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    note TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(order_year, order_number)
);

CREATE TABLE order_lines (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    line_number INTEGER NOT NULL,
    source_row INTEGER NOT NULL,
    material_id BIGINT REFERENCES materials(id),
    commercial_item_id BIGINT REFERENCES commercial_items(id),
    quantity NUMERIC(14, 4) NOT NULL,
    supplier_reference TEXT,
    description_original TEXT NOT NULL,
    pvp NUMERIC(14, 6),
    discount_raw TEXT,
    discount_components_raw JSONB NOT NULL DEFAULT '[]'::jsonb,
    net_unit_price NUMERIC(14, 6),
    total_price NUMERIC(14, 4),
    price_validation_status TEXT NOT NULL DEFAULT 'pending',
    price_validation_detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE(order_id, line_number)
);

CREATE INDEX idx_order_lines_supplier_reference
    ON order_lines(supplier_reference);

CREATE INDEX idx_order_lines_material
    ON order_lines(material_id);

CREATE INDEX idx_orders_order_date
    ON orders(order_date);

CREATE INDEX idx_orders_sequence
    ON orders(order_year, order_number);

CREATE INDEX idx_commercial_items_material
    ON commercial_items(material_id);

CREATE INDEX idx_match_proposals_status
    ON material_match_proposals(status);


CREATE INDEX idx_order_sequence_exceptions
    ON order_sequence_exceptions(order_year, status);


CREATE TABLE review_issues (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
    order_line_id BIGINT REFERENCES order_lines(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    review_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_issues_queue
    ON review_issues(status, issue_type);


CREATE TABLE material_reference_relations (
    id BIGSERIAL PRIMARY KEY,
    material_id BIGINT REFERENCES materials(id),
    manufacturer TEXT,
    reference_from TEXT NOT NULL,
    reference_to TEXT,
    relation_type TEXT NOT NULL,
    -- Examples: canonical, legacy_of, supplier_alias_of, typo_of,
    -- equivalent_variant, distinct_product, pending_review
    confidence NUMERIC(5, 4),
    status TEXT NOT NULL DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    review_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE external_reference_evidence (
    id BIGSERIAL PRIMARY KEY,
    relation_id BIGINT REFERENCES material_reference_relations(id) ON DELETE CASCADE,
    source_url TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'web',
    source_authority TEXT,
    evidence_summary TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_material_reference_relations_lookup
    ON material_reference_relations(manufacturer, reference_from, status);

CREATE INDEX idx_external_reference_evidence_relation
    ON external_reference_evidence(relation_id);
