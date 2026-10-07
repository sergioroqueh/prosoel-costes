from __future__ import annotations

import hashlib

from normalizer.text import fold_text, normalize_reference_typography


def commercial_variant_key(
    supplier_reference: str | None,
    description: str,
) -> str:
    """Stable fingerprint for an observed supplier-side commercial variant.

    It deliberately does not claim technical identity. The purpose is to allow
    one supplier reference to coexist with several observed descriptions until
    human review decides whether they are aliases, variants or errors.
    """
    reference = (
        normalize_reference_typography(supplier_reference)
        if supplier_reference
        else "<NO_REFERENCE>"
    )
    normalized_description = fold_text(description)
    payload = f"{reference}\x1f{normalized_description}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
