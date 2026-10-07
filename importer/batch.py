from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

from .excel_reader import UnsupportedOrderTemplate, read_order
from .validators import calculated_total, total_matches


@dataclass
class BatchResult:
    files_seen: int = 0
    parsed: int = 0
    failed: int = 0
    lines: int = 0
    valid_totals: int = 0
    warnings: int = 0


def scan_directory(directory: str | Path) -> BatchResult:
    root = Path(directory)
    result = BatchResult()

    for path in sorted(root.rglob("*.xlsx")):
        result.files_seen += 1
        try:
            order = read_order(path)
        except (UnsupportedOrderTemplate, OSError, ValueError) as exc:
            result.failed += 1
            print(f"[ERROR] {path.name}: {exc}")
            continue

        result.parsed += 1
        result.lines += len(order.lines)
        result.warnings += len(order.warnings)

        if total_matches(order):
            result.valid_totals += 1
            status = "OK"
        else:
            status = "REVISAR"

        total = calculated_total(order)
        print(
            f"[{status}] {order.order_reference or '-'} | "
            f"{order.supplier or '-'} | {len(order.lines)} líneas | "
            f"declarado={order.declared_total} calculado={total}"
        )

        for warning in order.warnings:
            print(f"  - {warning}")

    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Escanea pedidos Excel de PROSOEL")
    parser.add_argument("directory", help="Carpeta con pedidos .xlsx")
    args = parser.parse_args()

    result = scan_directory(args.directory)

    print("\nRESUMEN")
    print(f"Archivos encontrados: {result.files_seen}")
    print(f"Procesados: {result.parsed}")
    print(f"Fallidos: {result.failed}")
    print(f"Líneas extraídas: {result.lines}")
    print(f"Totales validados: {result.valid_totals}")
    print(f"Warnings: {result.warnings}")


if __name__ == "__main__":
    main()
