from datetime import datetime
from pathlib import Path

from openpyxl import Workbook

from importer.excel_reader import read_order


def _build_order(path: Path, unit_header: str = "UDS.", include_aux_sheets: bool = True) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "HOJA PEDIDO"

    if include_aux_sheets:
        wb.create_sheet("OBRAS")
        wb.create_sheet("MATERIALES")

    ws["A4"] = "FECHA:"
    ws["C4"] = datetime(2026, 1, 7)
    ws["A5"] = "RESPONSABLE OFICINA"
    ws["C5"] = "ISRAEL"
    ws["A7"] = "ALMACÉN:"
    ws["C7"] = "GRUPO RIAS"
    ws["A11"] = "REFERENCIA PEDIDO: 26/"
    ws["C11"] = "03"
    ws["A12"] = "IMPORTE PEDIDO:"
    ws["C12"] = 20
    ws["A13"] = "REFERENCIA AUX OBRA:"
    ws["C13"] = "OBRA DEMO"

    headers = [
        unit_header,
        "REFERENCIA",
        "MATERIAL",
        "PVP",
        "DTO.",
        "PRECIO NETO",
        "PRECIO TOTAL",
    ]
    for col, value in enumerate(headers, 1):
        ws.cell(17, col).value = value

    values = [2, "ABC", "MATERIAL DEMO", 12, "10%", 10, 20]
    for col, value in enumerate(values, 1):
        ws.cell(18, col).value = value

    wb.save(path)


def test_reads_prosoel_template(tmp_path: Path) -> None:
    path = tmp_path / "pedido.xlsx"
    _build_order(path)

    order = read_order(path)

    assert order.order_reference == "26/03"
    assert order.supplier == "GRUPO RIAS"
    assert order.project == "OBRA DEMO"
    assert len(order.lines) == 1
    assert order.lines[0].supplier_reference == "ABC"
    assert order.lines[0].source_row == 18


def test_accepts_metros_as_unit_header(tmp_path: Path) -> None:
    path = tmp_path / "pedido_metros.xlsx"
    _build_order(path, unit_header="METROS")

    order = read_order(path)

    assert len(order.lines) == 1
    assert order.lines[0].quantity == 2


def test_auxiliary_sheets_are_optional(tmp_path: Path) -> None:
    path = tmp_path / "pedido_solo_hoja.xlsx"
    _build_order(path, include_aux_sheets=False)

    order = read_order(path)

    assert len(order.lines) == 1
    assert any("Hojas auxiliares ausentes" in warning for warning in order.warnings)
