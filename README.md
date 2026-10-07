# PROSOEL Costes

Base interna para convertir pedidos Excel de PROSOEL en una base histórica de compras y precios, normalizar materiales y, más adelante, construir presupuestos a partir de costes reales.

## Objetivo v0.1

La primera fase se centra exclusivamente en la ingesta fiable de pedidos:

```
Excel de pedido
  -> lectura
  -> validación
  -> normalización mínima
  -> persistencia estructurada
```

Los Excel originales **no se almacenan en la aplicación ni en este repositorio**. Solo se guardan los datos necesarios y metadatos de trazabilidad (nombre del archivo, hash SHA-256, fecha de importación, etc.).

## Principios

- El dato histórico de una compra no se sobrescribe.
- Un material normalizado puede agrupar múltiples referencias/descripciones históricas.
- Toda cifra debe ser trazable hasta el pedido y la línea de origen.
- Las importaciones deben ser idempotentes: el mismo archivo no puede cargarse dos veces.
- Si el total extraído no cuadra con el importe del pedido, la importación debe quedar rechazada o pendiente de revisión.
- Los pedidos reales y cualquier dato sensible quedan fuera de Git.

## Estructura inicial

```
app/          API/web en fases posteriores
importer/     lectura, parseo y validación de Excel
database/     modelos y esquema de persistencia
tests/        pruebas automatizadas
docs/         decisiones y documentación técnica
```

## Estado

**v0.1 — bootstrap**

Siguiente hito: implementar el lector de la plantilla real de pedidos y validarlo contra una muestra heterogénea 2024-2026.
