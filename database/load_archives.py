from __future__ import annotations

import argparse
import json
import tempfile
import zipfile
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path

from sqlalchemy import text

from app.db import get_engine
from importer.commercial_variant import commercial_variant_key
from importer.excel_reader import UnsupportedOrderTemplate, read_order
from importer.line_classifier import classify_order_line
from importer.order_identity import resolve_order_identity
from importer.validators import has_incomplete_prices, total_matches


CENT = Decimal("0.01")


@dataclass
class ImportStats:
    files_seen: int = 0
    imported: int = 0
    skipped_duplicate: int = 0
    failed: int = 0
    lines_imported: int = 0


def _archive_year(path: Path) -> int | None:
    for token in path.stem.split():
        if token.isdigit() and len(token) == 4:
            return int(token)
    if path.stem.isdigit() and len(path.stem) == 4:
        return int(path.stem)
    return None


def _worksheet_identity(order_reference: str | None) -> tuple[str | None, str | None]:
    if not order_reference:
        return None, None
    if "/" not in order_reference:
        return None, order_reference
    year, number = order_reference.split("/", 1)
    return year + "/", number


def _validation_status(order) -> str:
    if has_incomplete_prices(order):
        return "incomplete_prices"
    if total_matches(order):
        return "valid"
    return "total_mismatch"


def _line_price_status(line) -> tuple[str, dict]:
    if line.net_unit_price is None or line.total_price is None:
        return "incomplete", {}

    calculated = (line.quantity * line.net_unit_price).quantize(CENT)
    observed = line.total_price.quantize(CENT)
    difference = abs(calculated - observed)

    return (
        "valid" if difference <= CENT else "mismatch",
        {
            "calculated_total": str(calculated),
            "observed_total": str(observed),
            "difference": str(difference),
        },
    )


def _get_or_create_supplier(connection, name: str | None) -> int:
    supplier_name = (name or "SIN PROVEEDOR").strip()
    row = connection.execute(
        text(
            """
            INSERT INTO suppliers(name)
            VALUES (:name)
            ON CONFLICT(name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            """
        ),
        {"name": supplier_name},
    ).first()
    return int(row.id)


def _get_or_create_project(connection, name: str | None, address: str | None) -> int | None:
    if not name:
        return None

    row = connection.execute(
        text(
            """
            SELECT id
            FROM projects
            WHERE name = :name
            ORDER BY id
            LIMIT 1
            """
        ),
        {"name": name},
    ).first()
    if row:
        if address:
            connection.execute(
                text(
                    """
                    UPDATE projects
                    SET address = COALESCE(address, :address)
                    WHERE id = :id
                    """
                ),
                {"id": row.id, "address": address},
            )
        return int(row.id)

    created = connection.execute(
        text(
            """
            INSERT INTO projects(name, address)
            VALUES (:name, :address)
            RETURNING id
            """
        ),
        {"name": name, "address": address},
    ).first()
    return int(created.id)


def _get_or_create_commercial_item(connection, supplier_id: int, line) -> int:
    variant_key = commercial_variant_key(
        line.supplier_reference,
        line.description_original,
    )
    row = connection.execute(
        text(
            """
            INSERT INTO commercial_items(
                supplier_id,
                supplier_reference,
                commercial_variant_key,
                preferred_description,
                match_status
            )
            VALUES (
                :supplier_id,
                :supplier_reference,
                :variant_key,
                :description,
                'pending'
            )
            ON CONFLICT(supplier_id, commercial_variant_key)
            DO UPDATE SET
                supplier_reference = COALESCE(
                    commercial_items.supplier_reference,
                    EXCLUDED.supplier_reference
                ),
                preferred_description = EXCLUDED.preferred_description,
                updated_at = NOW()
            RETURNING id
            """
        ),
        {
            "supplier_id": supplier_id,
            "supplier_reference": line.supplier_reference,
            "variant_key": variant_key,
            "description": line.description_original,
        },
    ).first()
    return int(row.id)


def _insert_order(connection, parsed, archive_year: int | None) -> tuple[int | None, bool]:
    duplicate = connection.execute(
        text("SELECT id FROM orders WHERE source_sha256 = :sha256"),
        {"sha256": parsed.source_sha256},
    ).first()
    if duplicate:
        return int(duplicate.id), False

    supplier_id = _get_or_create_supplier(connection, parsed.supplier)
    project_id = _get_or_create_project(
        connection,
        parsed.project,
        parsed.project_address,
    )

    worksheet_label, worksheet_number = _worksheet_identity(parsed.order_reference)
    identity = resolve_order_identity(
        parsed.source_filename,
        archive_year,
        worksheet_label,
        worksheet_number,
    )

    inserted = connection.execute(
        text(
            """
            INSERT INTO orders(
                order_reference,
                order_year,
                order_number,
                order_subnumber,
                order_identity_source,
                order_identity_status,
                order_date,
                supplier_id,
                project_id,
                responsible,
                supplier_contact,
                supplier_email,
                project_contact,
                declared_total,
                unit_header,
                template_variant,
                internal_order_reference,
                source_filename,
                source_sha256,
                validation_status
            )
            VALUES (
                :order_reference,
                :order_year,
                :order_number,
                :order_subnumber,
                :identity_source,
                :identity_status,
                :order_date,
                :supplier_id,
                :project_id,
                :responsible,
                :supplier_contact,
                :supplier_email,
                :project_contact,
                :declared_total,
                :unit_header,
                :template_variant,
                :internal_order_reference,
                :source_filename,
                :source_sha256,
                :validation_status
            )
            RETURNING id
            """
        ),
        {
            "order_reference": parsed.order_reference,
            "order_year": identity.year,
            "order_number": identity.number,
            "order_subnumber": identity.subnumber,
            "identity_source": identity.source,
            "identity_status": identity.status,
            "order_date": parsed.order_date,
            "supplier_id": supplier_id,
            "project_id": project_id,
            "responsible": parsed.responsible,
            "supplier_contact": parsed.supplier_contact,
            "supplier_email": parsed.supplier_email,
            "project_contact": parsed.project_contact,
            "declared_total": parsed.declared_total,
            "unit_header": parsed.unit_header,
            "template_variant": parsed.template_variant,
            "internal_order_reference": parsed.order_reference,
            "source_filename": parsed.source_filename,
            "source_sha256": parsed.source_sha256,
            "validation_status": _validation_status(parsed),
        },
    ).first()

    order_id = int(inserted.id)

    for line_number, line in enumerate(parsed.lines, start=1):
        classification = classify_order_line(line)
        commercial_item_id = _get_or_create_commercial_item(
            connection,
            supplier_id,
            line,
        )
        price_status, price_detail = _line_price_status(line)

        connection.execute(
            text(
                """
                INSERT INTO order_lines(
                    order_id,
                    line_number,
                    source_row,
                    commercial_item_id,
                    quantity,
                    supplier_reference,
                    description_original,
                    pvp,
                    discount_raw,
                    discount_components_raw,
                    net_unit_price,
                    total_price,
                    price_validation_status,
                    price_validation_detail,
                    line_kind,
                    line_kind_confidence,
                    line_kind_reasons,
                    line_kind_review_status
                )
                VALUES (
                    :order_id,
                    :line_number,
                    :source_row,
                    :commercial_item_id,
                    :quantity,
                    :supplier_reference,
                    :description_original,
                    :pvp,
                    :discount_raw,
                    CAST(:discount_components_raw AS jsonb),
                    :net_unit_price,
                    :total_price,
                    :price_validation_status,
                    CAST(:price_validation_detail AS jsonb),
                    :line_kind,
                    :line_kind_confidence,
                    CAST(:line_kind_reasons AS jsonb),
                    :line_kind_review_status
                )
                """
            ),
            {
                "order_id": order_id,
                "line_number": line_number,
                "source_row": line.source_row,
                "commercial_item_id": commercial_item_id,
                "quantity": line.quantity,
                "supplier_reference": line.supplier_reference,
                "description_original": line.description_original,
                "pvp": line.pvp,
                "discount_raw": line.discount_raw,
                "discount_components_raw": json.dumps(line.discount_components_raw),
                "net_unit_price": line.net_unit_price,
                "total_price": line.total_price,
                "price_validation_status": price_status,
                "price_validation_detail": json.dumps(price_detail),
                "line_kind": classification.kind,
                "line_kind_confidence": classification.confidence,
                "line_kind_reasons": json.dumps(classification.reasons),
                "line_kind_review_status": (
                    "auto"
                    if classification.exclude_from_material_normalization
                    else "pending"
                ),
            },
        )

    return order_id, True


def import_archive(path: Path) -> ImportStats:
    stats = ImportStats()
    archive_year = _archive_year(path)

    with zipfile.ZipFile(path) as archive:
        xlsx_names = [
            name
            for name in archive.namelist()
            if name.lower().endswith(".xlsx") and not name.startswith("__MACOSX/")
        ]

        for member_name in xlsx_names:
            stats.files_seen += 1
            with tempfile.NamedTemporaryFile(suffix=".xlsx") as temp:
                temp.write(archive.read(member_name))
                temp.flush()

                try:
                    parsed = read_order(temp.name)
                    parsed.source_filename = Path(member_name).name
                except (UnsupportedOrderTemplate, OSError, ValueError) as exc:
                    stats.failed += 1
                    print(f"ERROR {member_name}: {exc}")
                    continue

                with get_engine().begin() as connection:
                    _, imported = _insert_order(connection, parsed, archive_year)

                if imported:
                    stats.imported += 1
                    stats.lines_imported += len(parsed.lines)
                    print(f"OK {member_name}: {len(parsed.lines)} líneas")
                else:
                    stats.skipped_duplicate += 1
                    print(f"SKIP duplicado {member_name}")

    return stats


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Carga archivos ZIP históricos de pedidos PROSOEL en PostgreSQL."
    )
    parser.add_argument("archives", nargs="+", type=Path)
    args = parser.parse_args()

    total = ImportStats()
    for archive in args.archives:
        stats = import_archive(archive)
        total.files_seen += stats.files_seen
        total.imported += stats.imported
        total.skipped_duplicate += stats.skipped_duplicate
        total.failed += stats.failed
        total.lines_imported += stats.lines_imported

    print("---")
    print(f"Ficheros vistos: {total.files_seen}")
    print(f"Importados: {total.imported}")
    print(f"Duplicados omitidos: {total.skipped_duplicate}")
    print(f"Fallidos: {total.failed}")
    print(f"Líneas importadas: {total.lines_imported}")


if __name__ == "__main__":
    main()
