from decimal import Decimal

from .models import ParsedOrder

CENT = Decimal("0.01")


def calculated_total(order: ParsedOrder) -> Decimal:
    return sum((line.total_price for line in order.lines), start=Decimal("0")).quantize(CENT)


def total_matches(order: ParsedOrder, tolerance: Decimal = CENT) -> bool:
    if order.declared_total is None:
        return False
    return abs(calculated_total(order) - order.declared_total.quantize(CENT)) <= tolerance
