from __future__ import annotations

import hashlib
import re
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from openpyxl import load_workbook

from .models import OrderLine, ParsedOrder


class UnsupportedOrderTemplate(ValueError):
    pass


REQUIRED_SHEET = "HOJA PEDIDO"
OPTIONAL_SHEETS = {"OBRAS", "MATERIALES"}
ORDER_YEAR_RE = re.compile(r"([0-9]{2})[ ]*/")


def sha256_file(path: str | Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _decimal(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    if isinstance(value, str):
        value = value.strip().replace(",", ".")
        if not value:
            return None
    try:
        return Decimal(str(value))
    except Exception:
        return None


def _date(value: Any) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value).date()
        except ValueError:
            return None
    return None


def _find_header_row(ws) -> int:
    """Localiza la tabla sin asumir el nombre de la unidad de la columna A.

    En el histórico aparecen UDS., METRO, METROS y otras unidades. La identidad
    de la tabla se determina por las columnas técnicas B:G.
    """
    expected = ("REFERENCIA", "MATERIAL", "PVP", "DTO.", "PRECIO NETO", "PRECIO TOTAL")

    for row in range(1, min(ws.max_row, 100) + 1):
        current = tuple(_text(ws.cell(row, col).value) or "" for col in range(2, 8))
        if tuple(value.upper() for value in current) == expected:
            return row

    raise UnsupportedOrderTemplate("No se encontró la cabecera de líneas REFERENCIA..PRECIO TOTAL")


def _value_for_label(ws, *needles: str) -> Any:
    needles_upper = tuple(n.upper() for n in needles)
    for row in range(1, min(ws.max_row, 80) + 1):
        label = _text(ws.cell(row, 1).value)
        if not label:
            continue
        upper = label.upper()
        if any(needle in upper for needle in needles_upper):
            return ws.cell(row, 3).value
    return None


def _order_reference(ws) -> str | None:
    label = _text(ws["A11"].value) or ""
    number = _text(ws["C11"].value)
    match = ORDER_YEAR_RE.search(label)
    if not number:
        return None
    if match:
        return f"{match.group(1)}/{number}"
    return number


def read_order(path: str | Path) -> ParsedOrder:
    """Extrae un pedido PROSOEL manteniendo sus valores históricos.

    Solo HOJA PEDIDO es obligatoria. OBRAS y MATERIALES son auxiliares de la
    plantilla y algunos pedidos históricos ya no las conservan.

    El libro se abre con data_only=True para recuperar los valores cacheados de
    fórmulas como totales o búsquedas. Las líneas todavía no valoradas también
    se conservan y quedan marcadas mediante warnings.
    """
    path = Path(path)
    workbook = load_workbook(path, data_only=True, read_only=True)

    if REQUIRED_SHEET not in workbook.sheetnames:
        raise UnsupportedOrderTemplate(
            f"Plantilla no reconocida. Hojas encontradas: {workbook.sheetnames}"
        )

    ws = workbook[REQUIRED_SHEET]
    header_row = _find_header_row(ws)

    lines: list[OrderLine] = []
    warnings: list[str] = []

    missing_optional = sorted(OPTIONAL_SHEETS.difference(set(workbook.sheetnames)))
    if missing_optional:
        warnings.append(
            "Hojas auxiliares ausentes: " + ", ".join(missing_optional)
        )

    for row in range(header_row + 1, ws.max_row + 1):
        quantity = _decimal(ws.cell(row, 1).value)
        description = _text(ws.cell(row, 3).value)

        if quantity is None or description is None:
            continue

        line = OrderLine(
            source_row=row,
            quantity=quantity,
            supplier_reference=_text(ws.cell(row, 2).value),
            description_original=description,
            pvp=_decimal(ws.cell(row, 4).value),
            discount_raw=_text(ws.cell(row, 5).value),
            net_unit_price=_decimal(ws.cell(row, 6).value),
            total_price=_decimal(ws.cell(row, 7).value),
        )
        if line.total_price is None:
            warnings.append(f"Fila {row}: material sin precio total")
        lines.append(line)

    order_date = _date(_value_for_label(ws, "FECHA:"))
    order_reference = _order_reference(ws)

    if order_reference and order_date:
        ref_year = order_reference.split("/", 1)[0]
        if ref_year.isdigit() and int(ref_year) != order_date.year % 100:
            warnings.append(
                f"Año de referencia {ref_year} no coincide con fecha interna {order_date.isoformat()}"
            )

    return ParsedOrder(
        source_filename=path.name,
        source_sha256=sha256_file(path),
        order_reference=order_reference,
        order_date=order_date,
        responsible=_text(_value_for_label(ws, "RESPONSABLE OFICINA")),
        supplier=_text(_value_for_label(ws, "ALMACÉN:")),
        supplier_contact=_text(_value_for_label(ws, "CONTACTO:")),
        supplier_email=_text(_value_for_label(ws, "MAIL CONTACTO:")),
        project=_text(_value_for_label(ws, "REFERENCIA AUX OBRA")),
        project_address=_text(_value_for_label(ws, "DIRECCIÓN MATERIAL")),
        project_contact=_text(_value_for_label(ws, "PERSONA CONTACTO")),
        declared_total=_decimal(_value_for_label(ws, "IMPORTE PEDIDO")),
        warnings=warnings,
        lines=lines,
    )
