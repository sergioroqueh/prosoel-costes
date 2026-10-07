from __future__ import annotations

from collections.abc import Callable

from .cables import normalize_h07z1k
from .models import NormalizationCandidate

Rule = Callable[[str, str | None], NormalizationCandidate | None]

RULES: tuple[Rule, ...] = (
    normalize_h07z1k,
)


def propose_material(
    description: str,
    supplier_reference: str | None = None,
) -> NormalizationCandidate | None:
    """Genera una propuesta técnica, nunca una decisión definitiva.

    La salida sirve para ayudar a revisión humana. Ninguna regla nueva debe
    asignar automáticamente un material canónico solo por similitud textual.
    """
    for rule in RULES:
        candidate = rule(description, supplier_reference)
        if candidate is not None:
            return candidate
    return None


def suggested_review_state(candidate: NormalizationCandidate) -> str:
    """Clasifica la propuesta para revisión sin autoaprobarla.

    high_confidence sigue requiriendo validación humana mientras la familia no
    esté suficientemente consolidada con histórico real.
    """
    if candidate.confidence >= 0.95:
        return "high_confidence"
    if candidate.confidence >= 0.80:
        return "review"
    return "low_confidence"
