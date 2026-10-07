from normalizer.text import normalize_reference_typography


def test_unicode_hyphen_normalizes_to_ascii() -> None:
    assert normalize_reference_typography("82914‐33") == "82914-33"


def test_reference_whitespace_is_ignored_for_matching() -> None:
    assert normalize_reference_typography(" 52050003 - 035 ") == "52050003-035"


def test_case_is_normalized_for_matching_only() -> None:
    assert normalize_reference_typography("6827k") == "6827K"


def test_digits_are_never_repaired() -> None:
    assert normalize_reference_typography("4033033") == "4033033"
