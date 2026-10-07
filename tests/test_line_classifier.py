from decimal import Decimal

from importer.line_classifier import classify_order_line
from importer.models import OrderLine


def line(description: str, reference: str | None = None) -> OrderLine:
    return OrderLine(
        source_row=18,
        quantity=Decimal("1"),
        supplier_reference=reference,
        description_original=description,
    )


def test_raee_is_excluded_from_material_normalization() -> None:
    result = classify_order_line(line("ECOTASA RAEE", "RAEE"))

    assert result.kind == "environmental_fee"
    assert result.exclude_from_material_normalization
    assert result.confidence >= 0.99


def test_freight_is_excluded_from_material_normalization() -> None:
    result = classify_order_line(line("Gastos transporte Nacional", "PORTES"))

    assert result.kind == "freight"
    assert result.exclude_from_material_normalization


def test_explicit_project_is_service() -> None:
    result = classify_order_line(
        line("Proyecto Eléctrico BT para garaje sito en Calle Demo", "PROYC")
    )

    assert result.kind == "service"
    assert result.exclude_from_material_normalization


def test_commissioning_is_service() -> None:
    result = classify_order_line(
        line("PUESTA EN MARCHA, ACTUALIZACION, CONFIGURACION Y USUARIOS")
    )

    assert result.kind == "service"
    assert result.exclude_from_material_normalization


def test_repair_is_only_candidate() -> None:
    result = classify_order_line(line("REPARACION DE TUBERIA CONTRA INCENDIOS 3''"))

    assert result.kind == "service_candidate"
    assert not result.exclude_from_material_normalization


def test_physical_material_stays_unknown() -> None:
    result = classify_order_line(
        line("Magnetotérmico TX3 6kA-C P + N 16A", "403586")
    )

    assert result.kind == "unknown"
    assert not result.exclude_from_material_normalization
