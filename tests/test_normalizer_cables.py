from normalizer.service import propose_material, suggested_review_state


def test_rias_h07z1k_blue_15_is_normalized() -> None:
    candidate = propose_material(
        "MTS.CABLE FLEXIBLE L.H. H07Z1K 1,5 MM\nAZUL ROLLO",
        "H07Z1K1,5AZR",
    )

    assert candidate is not None
    assert candidate.canonical_key == "CABLE|H07Z1-K|1X|1,5|AZUL"
    assert candidate.canonical_name == "H07Z1-K 1x1,5 mm² azul"
    assert candidate.attributes["section_mm2"] == "1,5"
    assert candidate.attributes["color"] == "AZUL"
    assert suggested_review_state(candidate) == "high_confidence"


def test_same_technical_material_with_other_description_gets_same_key() -> None:
    first = propose_material(
        "MTS.CABLE FLEXIBLE L.H. H07Z1K 1,5 MM AZUL ROLLO",
        "H07Z1K1,5AZR",
    )
    second = propose_material(
        "Cable unipolar H07Z1-K 1x1,5 mm2 libre halogenos azul",
        "FAB-OTHER-123",
    )

    assert first is not None
    assert second is not None
    assert first.canonical_key == second.canonical_key


def test_different_color_is_not_same_material() -> None:
    blue = propose_material("H07Z1-K 1,5 mm2 azul")
    green_yellow = propose_material("H07Z1-K 1,5 mm2 amarillo verde")

    assert blue is not None
    assert green_yellow is not None
    assert blue.canonical_key != green_yellow.canonical_key


def test_h07v_k_is_not_mistaken_for_h07z1_k() -> None:
    assert propose_material("Cable H07V-K 1,5 mm2 azul") is None
