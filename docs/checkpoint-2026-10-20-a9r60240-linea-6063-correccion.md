# PROSOEL Costes — A9R60240: corrección línea 6063 (20/10/2026)

**Estado: aplicado y verificado en Supabase** (proyecto `kusbndefngttaiytcrui`).

## Confirmación del usuario
Usuario confirma que la compra de referencia **A9R60240**, línea original **6063** del pedido **25/04** de **GRUPO RIAS**, tiene la descripción errónea `Interruptor diferencial ID-K 4P 25A 300mA`. La referencia original A9R60240 es correcta y su descripción efectiva debe unificarse con las otras compras:

**Interruptor diferencial residencial - Acti9 iID - 2P - 40A - 30mA - AC - Schneider**

## Qué se modificó
- `public.purchase_line_overrides`: revisión 1 en la línea 6063, únicamente `corrected_description`, manteniendo `corrected_reference=NULL`, `excluded=false`.
- `public.purchase_review_events`: un evento nuevo con descripción original y nueva, justificación y usuario revisor.
- `private.confirmed_import_normalization_rules`: **regla nueva ID 521**, proveedor **GRUPO RIAS (supplier_id=9)**, referencia original `A9R60240`, clave de descripción original `INTERRUPTOR DIFERENCIAL ID-K 4P 25A 300MA`, referencia destino `A9R60240` y descripción destino canónica. La regla solo contempla esta combinación específica; las otras seis reglas previas siguen intactas. No se aplica globalmente a los productos realmente identificados como ID-K o A9Z06425.
- Ejecutado `private.reconcile_review_reference('A9R60240')`.

## Integridad y pruebas
1. Estado inicial: 18 compras ya unificadas y una línea 6063 no revisada, seis reglas activas; ningún override, evento o regla para la combinación conflictiva.
2. La línea original 6063 pertenece al pedido `25/04` del 2025-01-02, proveedor GRUPO RIAS, cantidad 12, PVP 18,77 €, descuento `NETO`, neto 18,77 €/unidad e importe 225,24 €.
3. Se simuló `BEGIN/ROLLBACK`: 19 compras con descripción efectiva única, siete reglas activas, un evento nuevo y hash de fuente inalterado. Se verificó después ausencia de modificaciones persistidas por la simulación.
4. Se ejecutó `BEGIN/COMMIT` con bloqueos de filas fuente y aserciones de referencia, precio, pedidos, cardinalidad, revisiones y huella del original. Resultado confirmado con 19 compras en un grupo, siete reglas y un evento.
5. Consulta independiente posterior: **19 líneas / 19 pedidos, 145 unidades, 3.161,3794 €** de importe histórico; una sola descripción efectiva. Cola `normalization_review_groups.description_count=1`.
6. Huella MD5 de las 19 filas de `public.order_lines` (por ID), antes y después: **`8b00b79d3d24e759e5b8860e397e3e23`**. Nada ha cambiado en la fuente original (incluidas la referencia, descripción, precios, descuentos, cantidades, fechas y proveedor).
7. Simulación retrospectiva de emparejamiento con reglas futuras y filtro económico: **19 de 19 líneas coincidentes; 0 alertas de precio**. No equivale a importar realmente una compra futura bajo sesión administrativa.

No hubo modificaciones de frontend o código del importador ni ejecución de GitHub Actions.

Este checkpoint cierra la excepción 6063 descrita previamente en `docs/checkpoint-2026-10-20-schneider-10-referencias-aplicado.md`.
