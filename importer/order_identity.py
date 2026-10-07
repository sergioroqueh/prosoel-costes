from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

FILENAME_ORDER_RE = re.compile(
    r"(?i)\\bPedido\\b\\s*-?\\s*(?P<number>[0-9]+)"
    r"(?:\\s*(?:\\.|-)\\s*(?P<subnumber>[0-9]+))?"
)

WORKSHEET_YEAR_RE = re.compile(r"(?P<year>[0-9]{2})\\s*/")


@dataclass(frozen=True)
class OrderIdentity:
    year: int | None
    number: int | None
    subnumber: str | None
    source: str
    status: str


def parse_filename_identity(filename: str, fallback_year: int | None = None) -> OrderIdentity:
    """Extrae la numeración visible del nombre de fichero.

    Admite variantes históricas como:
    - Pedido -774- ...
    - Pedido 181 ...
    - Pedido -298.1- ...
    - Pedido -210-26 ...

    El sufijo no altera el contador principal del año.
    """
    match = FILENAME_ORDER_RE.search(Path(filename).name)
    if not match:
        return OrderIdentity(fallback_year, None, None, "filename", "unresolved")

    return OrderIdentity(
        year=fallback_year,
        number=int(match.group("number")),
        subnumber=match.group("subnumber"),
        source="filename",
        status="candidate",
    )


def resolve_order_identity(
    filename: str,
    archive_year: int | None,
    worksheet_label: str | None,
    worksheet_number: str | int | None,
) -> OrderIdentity:
    """Resuelve identidad sin ocultar conflictos entre fichero y hoja.

    Para la carga histórica el nombre de archivo se usa como candidato principal
    porque se han detectado plantillas copiadas con referencias internas antiguas.
    Un conflicto queda marcado para revisión humana.
    """
    file_id = parse_filename_identity(filename, archive_year)

    sheet_year = None
    if worksheet_label:
        match = WORKSHEET_YEAR_RE.search(str(worksheet_label))
        if match:
            sheet_year = 2000 + int(match.group("year"))

    sheet_number = None
    if worksheet_number is not None:
        match = re.search(r"[0-9]+", str(worksheet_number))
        if match:
            sheet_number = int(match.group(0))

    if file_id.number is None and sheet_number is not None:
        return OrderIdentity(
            year=sheet_year or archive_year,
            number=sheet_number,
            subnumber=None,
            source="worksheet",
            status="candidate",
        )

    if file_id.number is None:
        return file_id

    conflict = False
    if sheet_number is not None and sheet_number != file_id.number:
        conflict = True
    if sheet_year is not None and archive_year is not None and sheet_year != archive_year:
        conflict = True

    return OrderIdentity(
        year=archive_year or sheet_year,
        number=file_id.number,
        subnumber=file_id.subnumber,
        source="filename",
        status="conflict" if conflict else "verified_candidate",
    )
