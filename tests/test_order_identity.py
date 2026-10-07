from importer.order_identity import parse_filename_identity, resolve_order_identity


def test_standard_order_number() -> None:
    identity = parse_filename_identity(
        "Pedido -774- HERMAFER BOADILLA (rack) 07-10-26 CABLECEL.xlsx",
        2026,
    )
    assert identity.number == 774
    assert identity.subnumber is None


def test_order_without_hyphen() -> None:
    identity = parse_filename_identity(
        "Pedido 181 BAYON Y AZA VALDEMORO (cajas) 02-03-26 RIAS.xlsx",
        2026,
    )
    assert identity.number == 181


def test_decimal_revision_keeps_primary_counter() -> None:
    identity = parse_filename_identity(
        "Pedido -298.1- HERMAFER ATLANTIDA VALDEMORO.xlsx",
        2024,
    )
    assert identity.number == 298
    assert identity.subnumber == "1"


def test_special_suborder_keeps_primary_counter() -> None:
    identity = parse_filename_identity(
        "Pedido -210-26 BAYON Y AZA VALDEMORO (cb) 17-07-26 RIAS.xlsx",
        2026,
    )
    assert identity.number == 210
    assert identity.subnumber == "26"


def test_stale_worksheet_reference_is_flagged() -> None:
    identity = resolve_order_identity(
        filename="Pedido -03- GOMENDIO MARIA ZAYAS.xlsx",
        archive_year=2025,
        worksheet_label="REFERENCIA PEDIDO: 24/",
        worksheet_number="1075",
    )
    assert identity.number == 3
    assert identity.status == "conflict"
