# PROSOEL Costes — corrección supervisada AVANT 12 SAT, referencia 532202

Fecha: 2026-10-09.

## Solicitud
Unificar exactamente bajo la descripción:

`Central programable AVANT 12 SAT para terrestre/satélite, 32 filtros digitales`

Dos resultados de referencia comercial `532202`, ambos del proveedor **GRUPO JARAMA**, que corresponden a la misma central AVANT 12 SAT.

## Compras y precios sin modificar

| Pedido | Fecha | ID línea | Descripción original | Neto unitario |
|---|---|---:|---|---:|
| 26/766 | 2026-10-02 | 9112 | Central programable AVANT 12 SAT FM-4xV/U-FI 32 filtros | 245,705000 € |
| 25/693 | 2025-09-24 | 7080 | Central programable AVANT 12 SAT para terrestre/satélite, 32\nfiltros digitales | 289,458000 € |

Ambas tienen cantidad 1 y referencia efectiva/original `532202`, sin exclusiones ni overrides previos.

## Ejecución
- Simulación previa en una transacción con `ROLLBACK`: verificadas 2 líneas, 2 originales preservados, 2 importes intactos y 2 revisiones auditables.
- Aplicación definitiva en transacción única mediante `private.apply_purchase_line_review`, con comprobaciones previas de ID, referencia, proveedor, importe, cantidad, descripción fuente, revisión 0 y estado no excluido.
- Se actualizaron **solo las descripciones efectivas** por override; se conservan las descripciones originales en `public.order_lines`, así como pedidos, cantidades, referencia, descuento, proveedor y precios.
- Se guardaron **dos eventos de auditoría**, revisión 1 en ambas líneas. La cola de normalización queda reconciliada por el mecanismo actual.

## Validación posterior
- `public.search_costs_enriched('532202')`: **un resultado** con la descripción solicitada, **2 pedidos**, último neto **245,705 €**, fecha última 2026-10-02.
- `public.historical_price_history_filtered_review`: **2 líneas**, 2 pedidos, 2 textos de origen distintos, mínimo neto 245,705 € y máximo neto 289,458 €.
- Historial: 2 eventos de corrección existentes.
- No se modificó código ni configuración web; el resultado ya funciona con la aplicación desplegada.

## Alcance
Se han corregido las dos compras existentes. No se crea una regla automática para futuras importaciones; cualquier otra variante se puede revisar de manera supervisada.
