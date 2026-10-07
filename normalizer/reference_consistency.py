from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass


@dataclass(frozen=True)
class ReferenceConsistencyIssue:
    issue_type: str
    expected: str
    observed: str
    confidence: float
    reason: str


def _fold(value: str | None) -> str:
    if not value:
        return ""
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.upper().replace("–", "-").replace("—", "-").replace("‐", "-")
    return re.sub(r"\s+", " ", value).strip()


def _decimal_token(value: str) -> str:
    return value.replace(".", ",")


def _description_color_tokens(description: str) -> set[str]:
    text = _fold(description)
    colors: set[str] = set()
    if "AMARILLO VERDE" in text or "AM-VD" in text or "A/V" in text:
        colors.add("AMARILLO VERDE")
    for token in ("AZUL", "NEGRO", "GRIS", "MARRON"):
        if token in text:
            colors.add(token)
    return colors


_H07_COLOR_BY_SUFFIX = {
    "AZR": "AZUL",
    "AZ": "AZUL",
    "NGR": "NEGRO",
    "NR": "NEGRO",
    "GR": "GRIS",
    "GRI": "GRIS",
    "MR": "MARRON",
    "MAR": "MARRON",
    "AVR": "AMARILLO VERDE",
    "AV": "AMARILLO VERDE",
}


def check_reference_description(
    reference: str | None,
    description: str | None,
) -> list[ReferenceConsistencyIssue]:
    """Detect explicit contradictions without correcting historical data.

    Only reference families whose code visibly encodes a technical attribute are
    checked. The function returns issues; it never changes a reference or a
    description.
    """
    ref = _fold(reference).replace(" ", "")
    desc = _fold(description)
    issues: list[ReferenceConsistencyIssue] = []

    h07 = re.fullmatch(r"H07Z1K(\d+(?:[,.]\d+)?)([A-Z]+)", ref)
    if h07:
        expected_section = _decimal_token(h07.group(1))
        suffix = h07.group(2)

        section = re.search(
            r"H07Z1[- ]?K[^0-9]{0,20}(?:1X)?\s*(\d+(?:[,.]\d+)?)",
            desc,
        )
        if section is None:
            section = re.search(r"\b(\d+(?:[,.]\d+)?)\s*MM(?:2|²)?\b", desc)

        if section is not None:
            observed_section = _decimal_token(section.group(1))
            if observed_section != expected_section:
                issues.append(
                    ReferenceConsistencyIssue(
                        issue_type="section_mismatch",
                        expected=expected_section,
                        observed=observed_section,
                        confidence=0.99,
                        reason="La sección codificada en la referencia H07Z1-K contradice la descripción.",
                    )
                )

        expected_color = _H07_COLOR_BY_SUFFIX.get(suffix)
        observed_colors = _description_color_tokens(desc)
        if expected_color and len(observed_colors) > 1:
            issues.append(
                ReferenceConsistencyIssue(
                    issue_type="multiple_colors_in_description",
                    expected=expected_color,
                    observed=" / ".join(sorted(observed_colors)),
                    confidence=0.98,
                    reason="La descripción contiene varios colores incompatibles para una única referencia.",
                )
            )
        elif expected_color and observed_colors and expected_color not in observed_colors:
            issues.append(
                ReferenceConsistencyIssue(
                    issue_type="color_mismatch",
                    expected=expected_color,
                    observed=next(iter(observed_colors)),
                    confidence=0.98,
                    reason="El color codificado en la referencia contradice la descripción.",
                )
            )

        return issues

    rz1 = re.fullmatch(r"RZ1K(\d+)X(\d+(?:[,.]\d+)?)R?", ref)
    if rz1:
        expected_conductors = int(rz1.group(1))
        expected_section = _decimal_token(rz1.group(2))
        match = re.search(r"\b(\d+)\s*[XG]\s*(\d+(?:[,.]\d+)?)\b", desc)
        if match:
            observed_conductors = int(match.group(1))
            observed_section = _decimal_token(match.group(2))
            if observed_conductors != expected_conductors:
                issues.append(
                    ReferenceConsistencyIssue(
                        issue_type="conductors_mismatch",
                        expected=str(expected_conductors),
                        observed=str(observed_conductors),
                        confidence=0.99,
                        reason="El número de conductores codificado en la referencia RZ1-K contradice la descripción.",
                    )
                )
            if observed_section != expected_section:
                issues.append(
                    ReferenceConsistencyIssue(
                        issue_type="section_mismatch",
                        expected=expected_section,
                        observed=observed_section,
                        confidence=0.99,
                        reason="La sección codificada en la referencia RZ1-K contradice la descripción.",
                    )
                )
        return issues

    aiscan_cr = re.fullmatch(r"CR(\d+)", ref)
    if aiscan_cr:
        expected_diameter = aiscan_cr.group(1)
        match = re.search(r"(?:DIAMETRO|D\.)\s*(\d+)\b", desc)
        if match and match.group(1) != expected_diameter:
            issues.append(
                ReferenceConsistencyIssue(
                    issue_type="diameter_mismatch",
                    expected=expected_diameter,
                    observed=match.group(1),
                    confidence=0.995,
                    reason="El diámetro codificado en la referencia AISCAN-CR contradice la descripción.",
                )
            )

    return issues
