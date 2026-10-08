from __future__ import annotations

import os
from functools import lru_cache
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Connection, Engine


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL no está configurada. "
            "Ejemplo: postgresql+psycopg://usuario:password@host:5432/prosoel"
        )

    return create_engine(
        database_url,
        pool_pre_ping=True,
        future=True,
    )


def get_connection() -> Iterator[Connection]:
    with get_engine().connect() as connection:
        yield connection
