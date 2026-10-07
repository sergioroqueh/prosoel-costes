from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal

from .text import fold_text, normalize_reference_typography

H07_REF_RE = re.compile(r"H07Z1K(?P<section>\d+(?:,\d+)?)")
H07_DESC_RE = re.compile(r"H07Z1[- ]?K[^0-9]*(?:1X)?(?P<section>\d+(?:[.,]\d+)?)")

RZ1_REF_RE = re.compile(
    r"RZ1K(?P<cores>\d+)X(?P<section>\d+(?:,\d+)?)"
)
RZ1_DESC_RE = re.compile(
    r"RZ1[- ]?K.*?(?P<cores>\d+)\s*[XG]\s*(?P<section>\d+(?:[.,]\d+)?)"
)


@dataclass(frozen=True)
class ConsistencyIssue:
    issue_type: str
    severity: str
    message: str
    reference_value: str | None
    description_value: str | None


def _number(value: str) -> Decimal:
    return Decimal(value.replace(",", "."))


def check_reference_description_consistency(
    supplier_reference: str | None,
    description: str,
) -> list[ConsistencyIssue]:
    """Detecta contradicciones técnicas sin corregir el histórico.

    Estas reglas solo se aplican a referencias cuyo propio texto codifica
    parámetros técnicos de forma explícita. El resultado siempre es una
    incidencia para revisión humana, nunca una normalización automática.
    """
    if not supplier_reference:
        return []

    reference = normalize_reference_typography(supplier_reference)
    desc = fold_text(description)
    issues: list[ConsistencyIssue] = []

    ref_match = H07_REF_RE.search(reference)
    desc_match = H07_DESC_RE.search(desc)
    if ref_match and desc_match:
        ref_section = _number(ref_match.group("section"))
        desc_section = _number(desc_match.group("section"))
        if ref_section != desc_section:
            issues.append(
                ConsistencyIssue(
                    issue_type="encoded_section_mismatch",
                    severity="high",
                    message=(
                        f"La referencia codifica H07Z1-K {ref_section} mm² "
                        f"pero la descripción indica {desc_section} mm²."
                    ),
                    reference_value=str(ref_section),
                    description_value=str(desc_section),
                )
            )

    ref_match = RZ1_REF_RE.search(reference)
    desc_match = RZ1_DESC_RE.search(desc)
    if ref_match and desc_match:
        ref_cores = int(ref_match.group("cores"))
        desc_cores = int(desc_match.group("cores"))
        ref_section = _number(ref_match.group("section"))
        desc_section = _number(desc_match.group("section"))

        if ref_cores != desc_cores:
            issues.append(
                ConsistencyIssue(
                    issue_type="encoded_conductor_count_mismatch",
                    severity="high",
                    message=(
                        f"La referencia codifica {ref_cores} conductores "
                        f"pero la descripción indica {desc_cores}."
                    ),
                    reference_value=str(ref_cores),
                    description_value=str(desc_cores),
                )
            )

        if ref_section != desc_section:
            issues.append(
                ConsistencyIssue(
                    issue_type="encoded_section_mismatch",
                    severity="high",
                    message=(
                        f"La referencia codifica sección {ref_section} mm² "
                        f"pero la descripción indica {desc_section} mm²."
                    ),
                    reference_value=str(ref_section),
                    description_value=str(desc_section),
                )
            )

    return issues
