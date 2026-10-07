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
    review_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_reference TEXT,
    order_date DATE,
    supplier_id BIGINT REFERENCES suppliers(id),
    project_id BIGINT REFERENCES projects(id),
    responsible TEXT,
    supplier_contact TEXT,
    supplier_email TEXT,
    project_contact TEXT,
    declared_total NUMERIC(14, 4),
    source_filename TEXT NOT NULL,
    source_sha256 CHAR(64) NOT NULL UNIQUE,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    imported_by TEXT,
    validation_status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE order_lines (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    line_number INTEGER NOT NULL,
    source_row INTEGER NOT NULL,
    material_id BIGINT REFERENCES materials(id),
    quantity NUMERIC(14, 4) NOT NULL,
    supplier_reference TEXT,
    description_original TEXT NOT NULL,
    pvp NUMERIC(14, 6),
    discount_raw TEXT,
    net_unit_price NUMERIC(14, 6),
    total_price NUMERIC(14, 4),
    UNIQUE(order_id, line_number)
);

CREATE INDEX idx_order_lines_supplier_reference
    ON order_lines(supplier_reference);

CREATE INDEX idx_order_lines_material
    ON order_lines(material_id);

CREATE INDEX idx_orders_order_date
    ON orders(order_date);
