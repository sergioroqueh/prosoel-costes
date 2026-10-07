from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

from .models import NormalizationCandidate
from .text import fold_text

H07Z1_RE = re.compile(r"H07Z1[- ]?K")
SECTION_RE = re.compile(
    r"(?<![0-9])(?P<section>[0-9]+(?:[.,][0-9]+)?)\s*(?:MM2|MM²|MM)(?![A-Z])"
)

COLOR_PATTERNS = (
    ("AMARILLO/VERDE", re.compile(r"AMARILLO\s*[/ -]?\s*VERDE|VERDE\s*[/ -]?\s*AMARILLO")),
    ("AZUL", re.compile(r"\bAZUL\b")),
    ("NEGRO", re.compile(r"\bNEGRO\b")),
    ("GRIS", re.compile(r"\bGRIS\b")),
    ("MARRÓN", re.compile(r"\bMARRON\b")),
    ("ROJO", re.compile(r"\bROJO\b")),
    ("BLANCO", re.compile(r"\bBLANCO\b")),
)


def _section(text: str) -> str | None:
    match = SECTION_RE.search(text)
    if not match:
        match = re.search(r"H07Z1[- ]?K\s*(?P<section>[0-9]+(?:[.,][0-9]+)?)", text)
    if not match:
        return None

    raw = match.group("section").replace(",", ".")
    try:
        value = Decimal(raw).normalize()
    except InvalidOperation:
        return None

    return format(value, "f").replace(".", ",")


def _color(text: str) -> str | None:
    for color, pattern in COLOR_PATTERNS:
        if pattern.search(text):
            return color
    return None


def normalize_h07z1k(
    description: str,
    supplier_reference: str | None = None,
) -> NormalizationCandidate | None:
    source = f"{description} {supplier_reference or ''}"
    text = fold_text(source)

    if not H07Z1_RE.search(text):
        return None

    section = _section(text)
    color = _color(text)

    reasons = ["familia H07Z1-K detectada"]
    confidence = 0.72

    if section:
        reasons.append(f"sección {section} mm² detectada")
        confidence += 0.14
    if color:
        reasons.append(f"color {color} detectado")
        confidence += 0.12

    attributes = {
        "designation": "H07Z1-K",
        "conductors": 1,
        "section_mm2": section,
        "color": color,
        "halogen_free": True,
        "rated_voltage": "450/750 V",
    }

    key_parts = ["CABLE", "H07Z1-K", "1X", section or "?", color or "?"]
    name = f"H07Z1-K 1x{section or '?'} mm²"
    if color:
        name += f" {color.lower()}"

    return NormalizationCandidate(
        rule_id="cable.h07z1k.v1",
        category="CABLEADO",
        subcategory="UNIPOLAR LIBRE DE HALÓGENOS",
        family="H07Z1-K",
        canonical_key="|".join(key_parts),
        canonical_name=name,
        base_unit="m",
        attributes=attributes,
        confidence=min(confidence, 0.99),
        reasons=reasons,
    )
