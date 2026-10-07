from decimal import Decimal

from .models import ParsedOrder

CENT = Decimal("0.01")


def has_incomplete_prices(order: ParsedOrder) -> bool:
    return any(line.total_price is None for line in order.lines)


def calculated_total(order: ParsedOrder) -> Decimal | None:
    if has_incomplete_prices(order):
        return None
    return sum(
        (line.total_price for line in order.lines if line.total_price is not None),
        start=Decimal("0"),
    ).quantize(CENT)


def total_matches(order: ParsedOrder, tolerance: Decimal = CENT) -> bool:
    if order.declared_total is None:
        return False

    total = calculated_total(order)
    if total is None:
        return False

    return abs(total - order.declared_total.quantize(CENT)) <= tolerance
