# Checkpoint PROSOEL Costes — unificación de referencia 113149 (2026-10-08)

## Petición
El usuario confirma que los dos textos asociados a la referencia comercial **113149** de FERRETERÍA PALACIOS corresponden al mismo material y solicita que la descripción efectiva sea exactamente:

`TORNILLO MADERA BICROMATADO CABEZA PLANA 4X35MM 1000 UDS FADIS`

## Datos comprobados y cambios
Tres líneas, tres pedidos:
- **25/54** (31-01-2025), línea **6141**: original `CAJA TORNILLO MADERA BICROMATADO CABEZA PLANA 4 X\n35 MM 1000 UDS FADIS`, **cantidad 1**, **neto 10,35 €/caja**. Descripción efectiva corregida.
- **25/315** (12-05-2025), línea **8088**: original `TORNILLO MADERA BICROMATADO CABEZA PLANA 4X35MM 1000 UDS FADIS`, **cantidad 1000**, **neto 0,01056 €/ud**. Ya coincidía exactamente; **no se generó corrección innecesaria**.
- **25/776** (17-10-2025), línea **7613**: original `CAJA TORNILLO MADERA BICROMATADO CABEZA PLANA 4 X\n35 MM 1000 UDS FADIS`, **cantidad 1000**, **neto 0,01056 €/ud**. Descripción efectiva corregida.

Proveedor único: **FERRETERIA PALACIOS**. Referencia original y efectiva intacta: **113149**.

Se comprobó previamente en una transacción con `ROLLBACK` que las tres quedarían bajo una descripción común y que los precios y textos originales no cambiarían.

Se aplicó **una corrección múltiple de dos líneas** mediante la RPC existente `public.review_purchase_lines_bulk`, con comprobación de IDs, descripción de origen, proveedor, referencia, revisiones 0 y estado activo. El procedimiento registró 2 overrides y 2 eventos individuales de auditoría con justificación. No se editaron directamente los originales.

### Verificación posterior
- `search_costs_enriched('113149')`: **un único resultado** con título solicitado y **3 pedidos**.
- `historical_price_history_filtered_review`: **3 líneas y 3 pedidos**, con rango original neto **0,01056–10,35 €** y los textos de origen preservados.
- Dos compras corregidas tienen revisión 1; la tercera conserva revisión 0.
- Ningún cambio en referencia, precio, descuento, cantidad, proveedor, documentos de origen o importaciones.

## ADVERTENCIA PARA FUTUROS CAMBIOS: unidades de precio no comparables
La compra 25/54 tiene **1 caja de 1.000 tornillos a 10,35 €/caja**; las de 25/315 y 25/776 aparecen con **1.000 unidades a 0,01056 €/tornillo**.

**No interpretar** la mediana, el rango bruto ni un precio de 10,35 como si fueran €/tornillo. El buscador actual **agrupa la descripción** pero **no convierte unidades comerciales**; los precios originales siguen trazables. Se deberá añadir más adelante un mecanismo de unidades (caja/pieza) y conversiones verificadas para hacer comparaciones consistentes. **No se ha realizado conversión de precios** en esta corrección.

## Alcance temporal
Esta actuación se aplica únicamente a las compras existentes. Si llega un nuevo Excel con otra abreviatura de la referencia 113149, se podrá corregir de forma supervisada, pero no existe regla automática de renombrado.
