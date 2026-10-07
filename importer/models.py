from __future__ import annotations

from datetime import date
from decimal import Decimal
from pydantic import BaseModel, Field


class OrderLine(BaseModel):
    source_row: int
    quantity: Decimal
    supplier_reference: str | None = None
    description_original: str
    pvp: Decimal | None = None
    discount_raw: str | None = None
    discount_components_raw: list[str] = Field(default_factory=list)
    net_unit_price: Decimal | None = None
    total_price: Decimal | None = None


class ParsedOrder(BaseModel):
    source_filename: str
    source_sha256: str
    order_reference: str | None = None
    order_date: date | None = None
    responsible: str | None = None
    supplier: str | None = None
    supplier_contact: str | None = None
    supplier_email: str | None = None
    project: str | None = None
    project_address: str | None = None
    project_contact: str | None = None
    declared_total: Decimal | None = None
    unit_header: str | None = None
    template_variant: str | None = None
    warnings: list[str] = Field(default_factory=list)
    lines: list[OrderLine] = Field(default_factory=list)
