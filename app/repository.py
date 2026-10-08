from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection


def _row_dict(row: Any) -> dict[str, Any]:
    data = dict(row._mapping)
    for key, value in tuple(data.items()):
        if isinstance(value, Decimal):
            data[key] = float(value)
        elif isinstance(value, date):
            data[key] = value.isoformat()
    return data


def search_catalog(connection: Connection, query: str, limit: int = 30) -> list[dict[str, Any]]:
    query = query.strip()
    if not query:
        return []

    sql = text(
        """
        WITH material_hits AS (
            SELECT
                m.id,
                m.canonical_name,
                m.manufacturer,
                m.manufacturer_reference,
                m.review_status,
                GREATEST(
                    similarity(LOWER(COALESCE(m.canonical_name, '')), LOWER(:query)),
                    similarity(LOWER(COALESCE(m.manufacturer_reference, '')), LOWER(:query)),
                    similarity(LOWER(COALESCE(m.manufacturer, '')), LOWER(:query)),
                    COALESCE(MAX(similarity(LOWER(COALESCE(ci.preferred_description, '')), LOWER(:query))), 0),
                    COALESCE(MAX(similarity(LOWER(COALESCE(ci.supplier_reference, '')), LOWER(:query))), 0)
                ) AS score
            FROM materials m
            LEFT JOIN commercial_items ci ON ci.material_id = m.id
            WHERE
                LOWER(COALESCE(m.canonical_name, '')) % LOWER(:query)
                OR LOWER(COALESCE(m.manufacturer_reference, '')) % LOWER(:query)
                OR LOWER(COALESCE(m.manufacturer, '')) % LOWER(:query)
                OR LOWER(COALESCE(m.manufacturer_reference, '')) = LOWER(:query)
                OR LOWER(COALESCE(ci.preferred_description, '')) % LOWER(:query)
                OR LOWER(COALESCE(ci.supplier_reference, '')) % LOWER(:query)
                OR LOWER(COALESCE(ci.supplier_reference, '')) = LOWER(:query)
            GROUP BY m.id
        )
        SELECT
            h.id,
            h.canonical_name AS title,
            h.manufacturer,
            h.manufacturer_reference AS reference,
            h.review_status AS status,
            h.score,
            COUNT(DISTINCT ol.order_id) AS purchase_count,
            COUNT(ol.id) AS line_count,
            MAX(o.order_date) AS last_order_date,
            (
                SELECT ol2.net_unit_price
                FROM order_lines ol2
                JOIN orders o2 ON o2.id = ol2.order_id
                WHERE
                    ol2.material_id = h.id
                    AND ol2.net_unit_price IS NOT NULL
                    AND ol2.net_unit_price > 0
                    AND ol2.line_kind NOT IN ('environmental_fee', 'freight', 'service')
                ORDER BY o2.order_date DESC NULLS LAST, o2.id DESC, ol2.line_number DESC
                LIMIT 1
            ) AS last_net_price,
            (
                SELECT s2.name
                FROM order_lines ol2
                JOIN orders o2 ON o2.id = ol2.order_id
                LEFT JOIN suppliers s2 ON s2.id = o2.supplier_id
                WHERE
                    ol2.material_id = h.id
                    AND ol2.net_unit_price IS NOT NULL
                    AND ol2.net_unit_price > 0
                    AND ol2.line_kind NOT IN ('environmental_fee', 'freight', 'service')
                ORDER BY o2.order_date DESC NULLS LAST, o2.id DESC, ol2.line_number DESC
                LIMIT 1
            ) AS last_supplier
        FROM material_hits h
        LEFT JOIN order_lines ol
            ON ol.material_id = h.id
            AND ol.line_kind NOT IN ('environmental_fee', 'freight', 'service')
        LEFT JOIN orders o ON o.id = ol.order_id
        GROUP BY
            h.id, h.canonical_name, h.manufacturer, h.manufacturer_reference,
            h.review_status, h.score
        ORDER BY
            h.score DESC,
            COUNT(DISTINCT ol.order_id) DESC,
            h.canonical_name
        LIMIT :limit
        """
    )

    historical_sql = text(
        """
        SELECT
            ol.description_original AS title,
            ol.supplier_reference AS reference,
            GREATEST(
                similarity(LOWER(ol.description_original), LOWER(:query)),
                similarity(LOWER(COALESCE(ol.supplier_reference, '')), LOWER(:query))
            ) AS score,
            COUNT(DISTINCT ol.order_id) AS purchase_count,
            COUNT(*) AS line_count,
            MAX(o.order_date) AS last_order_date,
            (
                ARRAY_AGG(
                    ol.net_unit_price
                    ORDER BY o.order_date DESC NULLS LAST, o.id DESC, ol.line_number DESC
                ) FILTER (WHERE ol.net_unit_price > 0)
            )[1] AS last_net_price,
            (
                ARRAY_AGG(
                    s.name
                    ORDER BY o.order_date DESC NULLS LAST, o.id DESC, ol.line_number DESC
                ) FILTER (WHERE ol.net_unit_price > 0)
            )[1] AS last_supplier
        FROM order_lines ol
        JOIN orders o ON o.id = ol.order_id
        LEFT JOIN suppliers s ON s.id = o.supplier_id
        WHERE
            ol.material_id IS NULL
            AND ol.line_kind NOT IN ('environmental_fee', 'freight', 'service')
            AND (
                LOWER(ol.description_original) % LOWER(:query)
                OR LOWER(COALESCE(ol.supplier_reference, '')) % LOWER(:query)
                OR LOWER(COALESCE(ol.supplier_reference, '')) = LOWER(:query)
                OR LOWER(ol.description_original) LIKE '%%' || LOWER(:query) || '%%'
            )
        GROUP BY ol.supplier_reference, ol.description_original
        ORDER BY
            score DESC,
            COUNT(DISTINCT ol.order_id) DESC,
            MAX(o.order_date) DESC NULLS LAST
        LIMIT :historical_limit
        """
    )

    resolved = [_row_dict(row) for row in connection.execute(sql, {"query": query, "limit": limit})]
    for row in resolved:
        row["kind"] = "material"

    pending = [
        _row_dict(row)
        for row in connection.execute(
            historical_sql,
            {"query": query, "historical_limit": max(8, limit // 2)},
        )
    ]
    for row in pending:
        row["kind"] = "historical"
        row["id"] = None
        row["manufacturer"] = None
        row["status"] = "pending"

    merged = resolved + pending
    merged.sort(
        key=lambda row: (
            row.get("score") or 0,
            row.get("purchase_count") or 0,
            1 if row.get("kind") == "material" else 0,
        ),
        reverse=True,
    )
    return merged[:limit]


def get_material_detail(connection: Connection, material_id: int) -> dict[str, Any] | None:
    sql = text(
        """
        SELECT
            m.id,
            m.canonical_name,
            m.category,
            m.subcategory,
            m.family,
            m.manufacturer,
            m.manufacturer_reference,
            m.base_unit,
            m.attributes,
            m.review_status,
            COUNT(DISTINCT ol.order_id) AS purchase_count,
            COUNT(ol.id) AS line_count,
            COALESCE(SUM(ol.quantity), 0) AS total_quantity,
            MIN(ol.net_unit_price) FILTER (WHERE ol.net_unit_price > 0) AS min_net_price,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY ol.net_unit_price)
                FILTER (WHERE ol.net_unit_price > 0) AS median_net_price,
            MAX(ol.net_unit_price) FILTER (WHERE ol.net_unit_price > 0) AS max_net_price,
            MAX(o.order_date) AS last_order_date
        FROM materials m
        LEFT JOIN order_lines ol
            ON ol.material_id = m.id
            AND ol.line_kind NOT IN ('environmental_fee', 'freight', 'service')
        LEFT JOIN orders o ON o.id = ol.order_id
        WHERE m.id = :material_id
        GROUP BY m.id
        """
    )
    row = connection.execute(sql, {"material_id": material_id}).first()
    if row is None:
        return None
    result = _row_dict(row)

    variants_sql = text(
        """
        SELECT DISTINCT
            ci.supplier_reference,
            ci.manufacturer,
            ci.manufacturer_reference,
            ci.preferred_description,
            s.name AS supplier,
            ci.match_status,
            ci.match_confidence
        FROM commercial_items ci
        JOIN suppliers s ON s.id = ci.supplier_id
        WHERE ci.material_id = :material_id
        ORDER BY s.name, ci.supplier_reference NULLS LAST
        """
    )
    result["commercial_variants"] = [
        _row_dict(item)
        for item in connection.execute(variants_sql, {"material_id": material_id})
    ]
    return result


def get_material_price_history(
    connection: Connection,
    material_id: int,
    limit: int = 200,
) -> list[dict[str, Any]]:
    sql = text(
        """
        SELECT
            ol.id AS order_line_id,
            o.id AS order_id,
            o.order_reference,
            o.order_year,
            o.order_number,
            o.order_subnumber,
            o.order_date,
            s.name AS supplier,
            p.name AS project,
            ol.quantity,
            ol.supplier_reference,
            ol.description_original,
            ol.pvp,
            ol.discount_raw,
            ol.net_unit_price,
            ol.total_price,
            ol.price_validation_status,
            o.source_filename
        FROM order_lines ol
        JOIN orders o ON o.id = ol.order_id
        LEFT JOIN suppliers s ON s.id = o.supplier_id
        LEFT JOIN projects p ON p.id = o.project_id
        WHERE
            ol.material_id = :material_id
            AND ol.line_kind NOT IN ('environmental_fee', 'freight', 'service')
        ORDER BY o.order_date DESC NULLS LAST, o.id DESC, ol.line_number DESC
        LIMIT :limit
        """
    )
    return [
        _row_dict(row)
        for row in connection.execute(sql, {"material_id": material_id, "limit": limit})
    ]


def get_order_counter(connection: Connection, year: int) -> dict[str, Any]:
    row = connection.execute(
        text(
            """
            SELECT
                MAX(order_number) FILTER (
                    WHERE order_identity_status <> 'conflict'
                ) AS last_registered,
                COUNT(*) FILTER (
                    WHERE order_identity_status = 'conflict'
                ) AS identity_conflicts
            FROM orders
            WHERE order_year = :year
            """
        ),
        {"year": year},
    ).first()

    data = _row_dict(row) if row else {"last_registered": None, "identity_conflicts": 0}
    last_registered = data.get("last_registered")
    data["year"] = year
    data["next_expected"] = last_registered + 1 if last_registered is not None else None

    gap_row = connection.execute(
        text(
            """
            SELECT COUNT(*) AS pending_gaps
            FROM order_sequence_exceptions
            WHERE order_year = :year AND status = 'pending'
            """
        ),
        {"year": year},
    ).first()
    data["pending_gaps"] = int(gap_row._mapping["pending_gaps"]) if gap_row else 0
    return data


def get_historical_price_history(
    connection: Connection,
    *,
    reference: str | None,
    description: str,
    limit: int = 200,
) -> list[dict[str, Any]]:
    sql = text(
        """
        SELECT
            ol.id AS order_line_id,
            o.id AS order_id,
            o.order_reference,
            o.order_year,
            o.order_number,
            o.order_subnumber,
            o.order_date,
            s.name AS supplier,
            p.name AS project,
            ol.quantity,
            ol.supplier_reference,
            ol.description_original,
            ol.pvp,
            ol.discount_raw,
            ol.net_unit_price,
            ol.total_price,
            ol.price_validation_status,
            ol.line_kind,
            o.source_filename
        FROM order_lines ol
        JOIN orders o ON o.id = ol.order_id
        LEFT JOIN suppliers s ON s.id = o.supplier_id
        LEFT JOIN projects p ON p.id = o.project_id
        WHERE
            ol.material_id IS NULL
            AND ol.line_kind NOT IN ('environmental_fee', 'freight', 'service')
            AND (
                (:reference IS NOT NULL AND ol.supplier_reference = :reference)
                OR ol.description_original = :description
            )
        ORDER BY o.order_date DESC NULLS LAST, o.id DESC, ol.line_number DESC
        LIMIT :limit
        """
    )
    return [
        _row_dict(row)
        for row in connection.execute(
            sql,
            {
                "reference": reference,
                "description": description,
                "limit": limit,
            },
        )
    ]
