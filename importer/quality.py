from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from .models import OrderLine

ABSOLUTE_TOLERANCE = Decimal("0.02")
RELATIVE_TOLERANCE = Decimal("0.00001")


@dataclass(frozen=True)
class PriceLineAssessment:
    status: str
    expected_total: Decimal | None
    difference: Decimal | None
    usable_as_price_reference: bool


def assess_price_line(line: OrderLine) -> PriceLineAssessment:
    """Valida una línea sin inventar factores de envase o unidades.

    Si cantidad x precio neto no coincide con el total, la línea pasa a revisión
    humana. No se corrige automáticamente aunque parezca precio por 100, caja,
    bobina u otra unidad comercial.
    """
    if line.net_unit_price is None or line.total_price is None:
        return PriceLineAssessment("incomplete", None, None, False)

    if line.quantity <= 0 or line.net_unit_price <= 0 or line.total_price <= 0:
        return PriceLineAssessment("zero_or_nonpositive", None, None, False)

    expected = line.quantity * line.net_unit_price
    difference = abs(expected - line.total_price)
    tolerance = max(
        ABSOLUTE_TOLERANCE,
        abs(line.total_price) * RELATIVE_TOLERANCE,
    )

    if difference > tolerance:
        return PriceLineAssessment(
            "arithmetic_mismatch",
            expected,
            difference,
            False,
        )

    return PriceLineAssessment("valid", expected, difference, True)
