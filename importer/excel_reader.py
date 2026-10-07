from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
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
ORDER_YEAR_RE = re.compile(r"([0-9]{2})\s*/")


@dataclass(frozen=True)
class HeaderLayout:
    row: int
    unit_header: str | None
    pvp_col: int
    discount_cols: tuple[int, ...]
    net_col: int
    total_col: int
    variant: str


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
        for parser in (
            datetime.fromisoformat,
            lambda text: datetime.strptime(text, "%d/%m/%Y"),
            lambda text: datetime.strptime(text, "%d-%m-%Y"),
            lambda text: datetime.strptime(text, "%d/%m/%y"),
            lambda text: datetime.strptime(text, "%d-%m-%y"),
        ):
            try:
                return parser(value).date()
            except ValueError:
                continue
    return None


def _find_header_layout(ws) -> HeaderLayout:
    """Detecta variantes reales de la tabla de líneas.

    No se asume que la columna A se llame UDS.: en el histórico también aparecen
    METRO y METROS. La variante antigua de 2024 tiene dos columnas de descuento.
    """
    for row in range(1, min(ws.max_row, 100) + 1):
        values = {
            col: (_text(ws.cell(row, col).value) or "").upper()
            for col in range(1, 9)
        }

        if values[2] != "REFERENCIA" or values[3] != "MATERIAL":
            continue

        if (
            values[4] == "PVP"
            and "DTO" in values[5]
            and values[6] == "PRECIO NETO"
            and values[7] == "PRECIO TOTAL"
        ):
            return HeaderLayout(
                row=row,
                unit_header=_text(ws.cell(row, 1).value),
                pvp_col=4,
                discount_cols=(5,),
                net_col=6,
                total_col=7,
                variant="current",
            )

        if (
            values[4] == "PRECIO"
            and "DTO" in values[5]
            and "DTO" in values[6]
            and values[7] == "PRECIO NETO"
            and values[8] == "PRECIO TOTAL"
        ):
            return HeaderLayout(
                row=row,
                unit_header=_text(ws.cell(row, 1).value),
                pvp_col=4,
                discount_cols=(5, 6),
                net_col=7,
                total_col=8,
                variant="legacy_two_discount",
            )

    raise UnsupportedOrderTemplate("No se encontró una cabecera de líneas compatible")


def _label_entry(ws, *needles: str) -> tuple[str | None, Any, int | None]:
    needles_upper = tuple(needle.upper() for needle in needles)
    for row in range(1, min(ws.max_row, 80) + 1):
        label = _text(ws.cell(row, 1).value)
        if not label:
            continue
        upper = label.upper()
        if any(needle in upper for needle in needles_upper):
            return label, ws.cell(row, 3).value, row
    return None, None, None


def _value_for_label(ws, *needles: str) -> Any:
    return _label_entry(ws, *needles)[1]


def _order_reference(ws) -> str | None:
    label, value, _ = _label_entry(
        ws,
        "REFERENCIA PEDIDO",
        "Nº PEDIDO",
        "N° PEDIDO",
        "N. PEDIDO",
    )
    number = _text(value)
    if not number:
        return None

    match = ORDER_YEAR_RE.search(label or "")
    if match:
        return f"{match.group(1)}/{number}"
    return number


def read_order(path: str | Path) -> ParsedOrder:
    """Extrae un pedido PROSOEL conservando el dato histórico.

    Solo HOJA PEDIDO es obligatoria. El lector soporta la plantilla actual y la
    variante histórica localizada en la auditoría 2024-2026.
    """
    path = Path(path)
    workbook = load_workbook(path, data_only=True, read_only=True)

    if REQUIRED_SHEET not in workbook.sheetnames:
        raise UnsupportedOrderTemplate(
            f"Plantilla no reconocida. Hojas encontradas: {workbook.sheetnames}"
        )

    ws = workbook[REQUIRED_SHEET]
    layout = _find_header_layout(ws)

    lines: list[OrderLine] = []
    warnings: list[str] = []

    missing_optional = sorted(OPTIONAL_SHEETS.difference(set(workbook.sheetnames)))
    if missing_optional:
        warnings.append("Hojas auxiliares ausentes: " + ", ".join(missing_optional))

    for row in range(layout.row + 1, ws.max_row + 1):
        quantity = _decimal(ws.cell(row, 1).value)
        description = _text(ws.cell(row, 3).value)

        if quantity is None or description is None:
            continue

        discounts = [_text(ws.cell(row, col).value) for col in layout.discount_cols]
        discount_components = [value for value in discounts if value is not None]

        line = OrderLine(
            source_row=row,
            quantity=quantity,
            supplier_reference=_text(ws.cell(row, 2).value),
            description_original=description,
            pvp=_decimal(ws.cell(row, layout.pvp_col).value),
            discount_raw=" | ".join(discount_components) if discount_components else None,
            discount_components_raw=discount_components,
            net_unit_price=_decimal(ws.cell(row, layout.net_col).value),
            total_price=_decimal(ws.cell(row, layout.total_col).value),
        )

        if line.total_price is None or line.net_unit_price is None:
            warnings.append(f"Fila {row}: material con precio incompleto")

        lines.append(line)

    order_date = _date(_value_for_label(ws, "FECHA:"))
    order_reference = _order_reference(ws)

    if order_reference and order_date:
        ref_year = order_reference.split("/", 1)[0]
        if ref_year.isdigit() and int(ref_year) != order_date.year % 100:
            warnings.append(
                f"Año de referencia {ref_year} no coincide con fecha interna "
                f"{order_date.isoformat()}"
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
        project=_text(_value_for_label(ws, "REFERENCIA AUX OBRA", "REFERENCIA OBRA")),
        project_address=_text(_value_for_label(ws, "DIRECCIÓN MATERIAL")),
        project_contact=_text(_value_for_label(ws, "PERSONA CONTACTO")),
        declared_total=_decimal(_value_for_label(ws, "IMPORTE PEDIDO")),
        unit_header=layout.unit_header,
        template_variant=layout.variant,
        warnings=warnings,
        lines=lines,
    )
