from normalizer.reference_consistency import check_reference_description


def types(reference: str, description: str) -> set[str]:
    return {issue.issue_type for issue in check_reference_description(reference, description)}


def test_detects_h07_section_conflict() -> None:
    result = check_reference_description(
        "H07Z1K1,5AZR",
        "CABLE H07Z1-K ZEROH FLEX 1X2,5 AZUL",
    )

    assert len(result) == 1
    assert result[0].issue_type == "section_mismatch"
    assert result[0].expected == "1,5"
    assert result[0].observed == "2,5"


def test_detects_h07_multiple_colors() -> None:
    result = check_reference_description(
        "H07Z1K6NGR",
        "MTS.CABLE FLEXIBLE L.H. H07Z1K 6 MM AZUL ROLLO NEGRO ROLLO",
    )

    assert "multiple_colors_in_description" in {item.issue_type for item in result}


def test_detects_rz1_conductor_conflict() -> None:
    result = check_reference_description(
        "RZ1K4X1,5R",
        "MTS.MANGUERA L.HALOGENO RZ1-K 5G1,5 ROLLO",
    )

    assert "conductors_mismatch" in {item.issue_type for item in result}


def test_detects_aiscan_diameter_conflict() -> None:
    result = check_reference_description(
        "CR20",
        "Tubo Aiscan-CR corrugado doble capa diámetro 25 negro",
    )

    assert len(result) == 1
    assert result[0].issue_type == "diameter_mismatch"


def test_matching_reference_and_description_are_clean() -> None:
    assert not check_reference_description(
        "H07Z1K2,5NGR",
        "MTS.CABLE FLEXIBLE L.H. H07Z1K 2,5 MM NEGRO ROLLO",
    )
    assert not check_reference_description(
        "CR25",
        "Tubo Aiscan-CR corrugado doble capa diámetro 25 negro",
    )


def test_accepts_rz1_hyphen_g_reference() -> None:
    assert not check_reference_description(
        "RZ1-K3G4",
        "CABLE RZ1-K 0,6/1KV 3G4",
    )


def test_detects_rz1_hyphen_g_conflict() -> None:
    result = check_reference_description(
        "RZ1-K3G4",
        "CABLE RZ1-K 0,6/1KV 5G4",
    )

    assert "conductors_mismatch" in {item.issue_type for item in result}
