from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class NormalizationCandidate(BaseModel):
    rule_id: str
    category: str
    subcategory: str | None = None
    family: str
    canonical_key: str
    canonical_name: str
    base_unit: str | None = None
    attributes: dict[str, Any] = Field(default_factory=dict)
    confidence: float
    reasons: list[str] = Field(default_factory=list)
