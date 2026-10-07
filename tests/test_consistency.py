from normalizer.consistency import check_reference_description_consistency


def test_h07_internal_reference_section_mismatch_is_flagged() -> None:
    issues = check_reference_description_consistency(
        "H07Z1K1,5NGR",
        "CABLE H07Z1-K ZEROH FLEX 1X2,5 NEGRO",
    )

    assert len(issues) == 1
    assert issues[0].issue_type == "encoded_section_mismatch"
    assert issues[0].severity == "high"


def test_h07_matching_reference_is_not_flagged() -> None:
    issues = check_reference_description_consistency(
        "H07Z1K1,5AZR",
        "MTS.CABLE FLEXIBLE L.H. H07Z1K 1,5 MM AZUL ROLLO",
    )

    assert issues == []


def test_rz1_conductor_count_mismatch_is_flagged() -> None:
    issues = check_reference_description_consistency(
        "RZ1K4X1,5R",
        "MTS.MANGUERA L.HALOGENO RZ1-K 5G1,5 ROLLO",
    )

    assert any(i.issue_type == "encoded_conductor_count_mismatch" for i in issues)


def test_rz1_matching_reference_is_not_flagged() -> None:
    issues = check_reference_description_consistency(
        "RZ1K3X2,5R",
        "MTS.MANGUERA L.HALOGENO RZ1-K 3X2,5 ROLLO",
    )

    assert issues == []
