from __future__ import annotations

from collections.abc import Callable

from .cables import normalize_h07z1k
from .models import NormalizationCandidate

Rule = Callable[[str, str | None], NormalizationCandidate | None]

RULES: tuple[Rule, ...] = (
    normalize_h07z1k,
)


def propose_material(description: str, supplier_reference: str | None = None) -> NormalizationCandidate | None:
    for rule in RULES:
        candidate = rule(description, supplier_reference)
        if candidate is not None:
            return candidate
    return None


def requires_human_review(candidate: NormalizationCandidate, threshold: float = 0.95) -> bool:
    return candidate.confidence < threshold
