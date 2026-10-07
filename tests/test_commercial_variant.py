from importer.commercial_variant import commercial_variant_key


def test_same_reference_and_typographic_description_share_key() -> None:
    first = commercial_variant_key(
        "82914‐33",
        "Marco 1 elemento aluminio mate\nSimon 82",
    )
    second = commercial_variant_key(
        "82914-33",
        "Marco 1 elemento aluminio mate Simon 82",
    )

    assert first == second


def test_reused_supplier_reference_can_create_distinct_variants() -> None:
    first = commercial_variant_key("P1", "CANALETA 16X96 CANAL 31 UNEX")
    second = commercial_variant_key("P1", "PICA ACERO COBRE 1500MM")

    assert first != second


def test_missing_reference_still_has_stable_variant_key() -> None:
    assert commercial_variant_key(None, "RAEE") == commercial_variant_key(None, "RAEE")
