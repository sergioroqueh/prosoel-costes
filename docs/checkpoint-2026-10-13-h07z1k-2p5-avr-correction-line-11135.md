# PROSOEL Costes — corrección de referencia errónea, cable H07Z1-K 2,5 mm² amarillo/verde

**Fecha:** 2026-10-13. **Supabase:** `kusbndefngttaiytcrui`.

## Confirmación de PROSOEL

La línea de compra con la referencia original **`H07Z1K1,5AVR`** en realidad corresponde a cable **H07Z1-K ZEROH FLEX 1×2,5 mm² AM-VD**, no a 1,5 mm². Corregir únicamente su referencia efectiva a **`H07Z1K2,5AVR`**.

## Compra inspeccionada

- Línea **11135**; pedido ID **2764**, referencia de pedido **26/210-26**.
- Fecha **23/07/2026**; proveedor **GRUPO RIAS**; obra COPROMA R-4 PASEO LA HABANA 74.
- Archivo fuente **`Pedido -210-27- COPROMA R4 PASEO LA HABANA 74 (cable) 23-07-26 RIAS.xlsx`**.
- Referencia del Excel **`H07Z1K1,5AVR`** (equivocada); descripción del Excel **`CABLE H07Z1-K ZEROH FLEX 1X2,5 AM-VD`** (sección 2,5).
- Cantidad **400**, PVP **0,312000 €/m**, descuento original **NETO**, neto **0,312000 €/m**, total **124,8000 €**.
- Sin revisión previa al iniciar la operación; revisión esperada **0**.
- La referencia `H07Z1K2,5AVR` ya existía en Supabase para compras de cable amarillo/verde 2,5 mm² (79 pedidos antes de este cambio).

## Procedimiento, alcance y validación

1. Se verificó en `public.order_lines_effective` la identidad exacta del pedido, los datos originales, el precio neto, la descripción, la referencia y ausencia de revisiones previas.
2. Se ensayó la transacción con `ROLLBACK`; se comprobó que la vista efectiva trasladaba la compra y dejaba **73 pedidos** en `H07Z1K1,5AVR` y **80 pedidos** en `H07Z1K2,5AVR`. Verificación posterior: 0 revisiones y 0 eventos persistidos para la línea tras la simulación.
3. Se ejecutó la corrección definitiva en una sola transacción con `COMMIT`: fila en `public.purchase_line_overrides` (revisión 1, `corrected_reference='H07Z1K2,5AVR'`, `corrected_description=NULL`) y evento en `public.purchase_review_events`, actor **`asistente-prosoel-costes`** y motivo específico.
4. Se invocó `private.reconcile_review_reference` para ambas referencias tras el cambio.
5. Se usó un hash/checksum de la fila original de `public.order_lines` y metadatos de `public.orders` antes/después. Se confirmó su identidad y que ningún PVP, descuento, neto, cantidad, descripción original, proveedor, fecha, pedido ni archivo fuente cambió.
6. Verificación tras el commit: **1 revisión y 1 evento** nuevos; referencia efectiva correcta en la línea 11135; referencia original y descripción de origen conservadas; precio y total conservados.
7. Grupo de 1,5 mm²: **73 compras**, una descripción efectiva común; `normalization_review_groups.candidate_active = false`. Grupo de 2,5 mm²: **80 compras**; su cola sigue activa por diferencias textuales (no se unificaron en esta operación).

## Notas

La función `private.apply_purchase_line_review` requiere JWT de usuario administrador y no es invocable con el acceso administrativo SQL del conector. Se siguió el mecanismo existente de revisión (override y evento) en una transacción con validación estricta de versión y estado previo, sin suplantar ninguna sesión.

No se cambió código de la aplicación ni se introdujo regla automática de normalización. La agrupación se verificó en Supabase; la inspección visual del buscador con sesión autenticada no se pudo realizar desde el conector.
