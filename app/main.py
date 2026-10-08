from __future__ import annotations

from datetime import date
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.engine import Connection

from .db import get_connection
from .repository import (
    get_historical_price_history,
    get_material_detail,
    get_material_price_history,
    get_order_counter,
    search_catalog,
)


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(
    title="PROSOEL Costes",
    version="0.2.0",
    description="Buscador interno de materiales, referencias y precios históricos.",
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/search")
def search(
    q: str = Query(..., min_length=2, max_length=160),
    limit: int = Query(30, ge=1, le=100),
    connection: Connection = Depends(get_connection),
) -> dict:
    return {
        "query": q,
        "results": search_catalog(connection, q, limit=limit),
    }


@app.get("/api/materials/{material_id}")
def material_detail(
    material_id: int,
    connection: Connection = Depends(get_connection),
) -> dict:
    material = get_material_detail(connection, material_id)
    if material is None:
        raise HTTPException(status_code=404, detail="Material no encontrado")
    return material


@app.get("/api/materials/{material_id}/prices")
def material_prices(
    material_id: int,
    limit: int = Query(200, ge=1, le=1000),
    connection: Connection = Depends(get_connection),
) -> dict:
    return {
        "material_id": material_id,
        "rows": get_material_price_history(connection, material_id, limit=limit),
    }


@app.get("/api/historical/prices")
def historical_prices(
    description: str = Query(..., min_length=2, max_length=500),
    reference: str | None = Query(None, max_length=160),
    limit: int = Query(200, ge=1, le=1000),
    connection: Connection = Depends(get_connection),
) -> dict:
    return {
        "reference": reference,
        "description": description,
        "rows": get_historical_price_history(
            connection,
            reference=reference,
            description=description,
            limit=limit,
        ),
    }


@app.get("/api/orders/counter")
def order_counter(
    year: int | None = Query(None, ge=2000, le=2100),
    connection: Connection = Depends(get_connection),
) -> dict:
    return get_order_counter(connection, year or date.today().year)
