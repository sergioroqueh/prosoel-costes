from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from .models import OrderLine


@dataclass(frozen=True)
class LineClassification:
    kind: str
    confidence: float
    reasons: tuple[str, ...]
    exclude_from_material_normalization: bool


def _fold(value: str | None) -> str:
    if not value:
        return ""
    value = unicodedata.normalize("NFKD", value)
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = value.upper().strip()
    value = re.sub(r"\s+", " ", value)
    return value


ENVIRONMENTAL_REFS = {"RAEE", "RAE", "ECOTASA", "TASA"}
FREIGHT_REFS = {
    "PORTES",
    "PORT.",
    "POR",
    "PP",
    "PORTES VENT.NAC",
    "PORTES VENT.NAC.",
}

ENVIRONMENTAL_PATTERNS = (
    r"\bECOTASA\b",
    r"\bRAEE\b",
    r"\bECOTASA RAE\b",
)

FREIGHT_PATTERNS = (
    r"^PORTES?\b",
    r"\bGASTOS? DE? TRANSPORTE\b",
    r"\bTRANSPORTE NACIONAL\b",
    r"\bENVIO SOLICITADO POR FABRICA\b",
)

EXPLICIT_SERVICE_PATTERNS = (
    r"^SERVICIO DE\b",
    r"^PROYECTO (ELECTRICO|PCI|TECNICO)\b",
    r"^PUESTA EN MARCHA\b",
    r"\bINSPECCION REGLAMENTARIA\b",
    r"^EVALUACION DE RIESGOS\b",
    r"\bREALIZACION DE EMPALMES\b",
    r"\bREALIZACION DE FUSIONES\b",
)

REVIEW_SERVICE_PATTERNS = (
    r"^REPARACION\b",
    r"^SANEADO DE\b",
    r"\bCONFIGURACION\b",
)


def classify_order_line(line: OrderLine) -> LineClassification:
    """Clasifica solo los casos suficientemente explícitos.

    El objetivo no es decidir qué es material. Es sacar de la cola técnica
    conceptos que claramente son portes, tasas o servicios. En caso de duda
    devuelve unknown para revisión o normalización posterior.
    """
    reference = _fold(line.supplier_reference)
    description = _fold(line.description_original)

    if reference in ENVIRONMENTAL_REFS or any(
        re.search(pattern, description) for pattern in ENVIRONMENTAL_PATTERNS
    ):
        return LineClassification(
            kind="environmental_fee",
            confidence=0.995,
            reasons=("Referencia o descripción explícita de RAEE/ecotasa",),
            exclude_from_material_normalization=True,
        )

    if reference in FREIGHT_REFS or any(
        re.search(pattern, description) for pattern in FREIGHT_PATTERNS
    ):
        return LineClassification(
            kind="freight",
            confidence=0.99,
            reasons=("Referencia o descripción explícita de portes/transporte",),
            exclude_from_material_normalization=True,
        )

    if any(re.search(pattern, description) for pattern in EXPLICIT_SERVICE_PATTERNS):
        return LineClassification(
            kind="service",
            confidence=0.97,
            reasons=("Descripción explícita de servicio profesional o ejecución",),
            exclude_from_material_normalization=True,
        )

    if any(re.search(pattern, description) for pattern in REVIEW_SERVICE_PATTERNS):
        return LineClassification(
            kind="service_candidate",
            confidence=0.80,
            reasons=("Descripción compatible con servicio, requiere revisión",),
            exclude_from_material_normalization=False,
        )

    return LineClassification(
        kind="unknown",
        confidence=0.0,
        reasons=(),
        exclude_from_material_normalization=False,
    )
