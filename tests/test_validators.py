from decimal import Decimal

from importer.models import OrderLine, ParsedOrder
from importer.validators import calculated_total, total_matches


def test_total_matches_declared_total() -> None:
    order = ParsedOrder(
        source_filename="pedido.xlsx",
        source_sha256="a" * 64,
        declared_total=Decimal("30.00"),
        lines=[
            OrderLine(
                quantity=Decimal("1"),
                description_original="Material A",
                net_unit_price=Decimal("10"),
                total_price=Decimal("10"),
            ),
            OrderLine(
                quantity=Decimal("2"),
                description_original="Material B",
                net_unit_price=Decimal("10"),
                total_price=Decimal("20"),
            ),
        ],
    )

    assert calculated_total(order) == Decimal("30.00")
    assert total_matches(order)
