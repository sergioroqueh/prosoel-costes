from __future__ import annotations

import re
import unicodedata


def fold_text(value: str) -> str:
    value = value.replace("\n", " ").strip().upper()
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = re.sub(r"\s+", " ", value)
    return value


def compact_text(value: str) -> str:
    return re.sub(r"[^A-Z0-9,./+-]", "", fold_text(value))
