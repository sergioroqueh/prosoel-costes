from decimal import Decimal

from importer.models import OrderLine
from importer.quality import assess_price_line


def _line(quantity: str, net: str | None, total: str | None) -> OrderLine:
    return OrderLine(
        source_row=18,
        quantity=Decimal(quantity),
        description_original="Material",
        net_unit_price=Decimal(net) if net is not None else None,
        total_price=Decimal(total) if total is not None else None,
    )


def test_normal_line_is_price_reference_candidate() -> None:
    assessment = assess_price_line(_line("1000", "0.196", "196"))

    assert assessment.status == "valid"
    assert assessment.usable_as_price_reference


def test_incomplete_line_requires_review() -> None:
    assessment = assess_price_line(_line("10", None, None))

    assert assessment.status == "incomplete"
    assert not assessment.usable_as_price_reference


def test_pack_or_price_basis_mismatch_is_not_auto_corrected() -> None:
    assessment = assess_price_line(_line("500", "2.89", "14.45"))

    assert assessment.status == "arithmetic_mismatch"
    assert assessment.expected_total == Decimal("1445.00")
    assert not assessment.usable_as_price_reference


def test_zero_price_is_not_used_as_reference() -> None:
    assessment = assess_price_line(_line("10", "0", "0"))

    assert assessment.status == "zero_or_nonpositive"
    assert not assessment.usable_as_price_reference
