from decimal import Decimal

from importer.models import OrderLine, ParsedOrder
from importer.validators import calculated_total, has_incomplete_prices, total_matches


def _line(description: str, total: str | None) -> OrderLine:
    return OrderLine(
        source_row=18,
        quantity=Decimal("1"),
        description_original=description,
        net_unit_price=Decimal("10") if total is not None else None,
        total_price=Decimal(total) if total is not None else None,
    )


def test_total_matches_declared_total() -> None:
    order = ParsedOrder(
        source_filename="pedido.xlsx",
        source_sha256="a" * 64,
        declared_total=Decimal("30.00"),
        lines=[_line("Material A", "10"), _line("Material B", "20")],
    )

    assert calculated_total(order) == Decimal("30.00")
    assert total_matches(order)


def test_incomplete_line_does_not_validate_as_zero() -> None:
    order = ParsedOrder(
        source_filename="pedido.xlsx",
        source_sha256="b" * 64,
        declared_total=Decimal("0"),
        lines=[_line("Material pendiente", None)],
    )

    assert has_incomplete_prices(order)
    assert calculated_total(order) is None
    assert not total_matches(order)
