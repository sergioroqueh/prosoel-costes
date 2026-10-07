from __future__ import annotations

from datetime import date
from decimal import Decimal
from pydantic import BaseModel, Field


class OrderLine(BaseModel):
    quantity: Decimal
    supplier_reference: str | None = None
    description_original: str
    pvp: Decimal | None = None
    discount_raw: str | None = None
    net_unit_price: Decimal
    total_price: Decimal


class ParsedOrder(BaseModel):
    source_filename: str
    source_sha256: str
    order_reference: str | None = None
    order_date: date | None = None
    responsible: str | None = None
    supplier: str | None = None
    supplier_contact: str | None = None
    project: str | None = None
    project_address: str | None = None
    project_contact: str | None = None
    declared_total: Decimal | None = None
    lines: list[OrderLine] = Field(default_factory=list)
