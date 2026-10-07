from datetime import datetime
from pathlib import Path

from openpyxl import Workbook

from importer.excel_reader import read_order


def test_reads_prosoel_template(tmp_path: Path) -> None:
    path = tmp_path / "pedido.xlsx"
    wb = Workbook()
    ws = wb.active
    ws.title = "HOJA PEDIDO"
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

    headers = ["UDS.", "REFERENCIA", "MATERIAL", "PVP", "DTO.", "PRECIO NETO", "PRECIO TOTAL"]
    for col, value in enumerate(headers, 1):
        ws.cell(17, col).value = value

    values = [2, "ABC", "MATERIAL DEMO", 12, "10%", 10, 20]
    for col, value in enumerate(values, 1):
        ws.cell(18, col).value = value

    wb.save(path)

    order = read_order(path)

    assert order.order_reference == "26/03"
    assert order.supplier == "GRUPO RIAS"
    assert order.project == "OBRA DEMO"
    assert len(order.lines) == 1
    assert order.lines[0].supplier_reference == "ABC"
    assert order.lines[0].source_row == 18
