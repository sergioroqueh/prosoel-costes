from __future__ import annotations

import re
import unicodedata

DASH_VARIANTS = {
    "‐",  # hyphen
    "‑",  # non-breaking hyphen
    "‒",  # figure dash
    "–",  # en dash
    "—",  # em dash
    "−",  # minus sign
}


def fold_text(value: str) -> str:
    value = value.replace("\n", " ").strip().upper()
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"\s+", " ", value)
    return value


def compact_text(value: str) -> str:
    return re.sub(r"[^A-Z0-9,./+-]", "", fold_text(value))


def normalize_reference_typography(value: str) -> str:
    """Normaliza solo diferencias tipográficas seguras de una referencia.

    No intenta corregir dígitos, prefijos, ceros iniciales ni códigos de
    fabricante. El valor histórico original debe conservarse por separado.
    """
    normalized = value.strip().upper()
    for dash in DASH_VARIANTS:
        normalized = normalized.replace(dash, "-")
    normalized = re.sub(r"\s+", "", normalized)
    return normalized
