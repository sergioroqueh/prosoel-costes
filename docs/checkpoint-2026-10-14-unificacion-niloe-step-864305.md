# PROSOEL Costes — unificación de tecla Niloé Step doble aluminio (864305)

**Fecha:** 2026-10-14. **Supabase:** `kusbndefngttaiytcrui`.

## Confirmación del usuario

Unificar las dos compras con referencia exacta `864305` bajo la descripción:

**Tecla Niloé Step doble para interruptor y conmutador, aluminio**

## Compras verificadas

| Línea | Pedido | Proveedor | Descripción fuente | Cantidad | PVP (€) | Descuento fuente | Neto unitario (€) | Total (€) |
|---|---|---|---|---:|---:|---|---:|---:|
| 3149 | 24/180 (12/02/2024) | GRUPO JARAMA | Tecla Niloé Step doble para interruptor y conmutador, aluminio | 2 | 1,0310 | NETO | 1,0310 | 2,0620 |
| 3441 | 24/43 (16/01/2024) | GRUPO RIAS | NS-TECLA DOBLE ALUM 864305 | 9 | 3,4800 | 0.61 | 1,3572 | 12,2148 |

Ambas compras conservan `supplier_reference_source = '864305'` y `supplier_reference = '864305'`. Total histórico preservado: **14,2768 €**. Inicialmente ambas líneas tenían revisión 0 y no existían reglas futuras para este código.

## Ejecución

1. Se comprobaron pedidos, proveedor, fecha, referencia, descripción fuente, PVP, descuentos, netos, cantidades, totales, exclusiones y revisiones existentes.
2. Se ejecutó simulación transaccional `BEGIN/ROLLBACK` con bloqueo y condiciones estrictas. Resultado simulado: dos compras agrupadas, una sola descripción efectiva, un override y dos reglas futuras. Se comprobó después que el rollback no había persistido ninguna revisión ni regla.
3. Transacción definitiva `BEGIN/COMMIT` con las mismas condiciones de integridad:
   - Se añadió una revisión versión 1 a **línea 3441 de RIAS**, con `corrected_reference=NULL` y `corrected_description` canónica.
   - Se añadió un evento en `public.purchase_review_events`, con antes/después, motivo y actor `asistente-prosoel-costes`.
   - La línea **3149 de JARAMA ya tenía el texto canónico** y no se alteró ni se generó una revisión artificial.
   - Se crearon **2 reglas activas** en `private.confirmed_import_normalization_rules`, familia `MECANISMOS NILOE STEP`, segmentadas por proveedor + referencia original exacta + descripción original con espacios normalizados. Estas reglas se reutilizan en futuros pedidos por el motor ya existente `private.apply_confirmed_import_rules`.
   - Se llamó a `private.reconcile_review_reference('864305')`.
4. Se calculó el hash de `public.order_lines` y metadatos íntegros de `public.orders` antes/después de la transacción, confirmando que ningún campo histórico original había cambiado.
5. Se verificó después del commit:
   - **2 compras** efectivas bajo una sola descripción exacta.
   - **1 corrección efectiva** y **1 evento de auditoría**.
   - **2 reglas futuras activas**.
   - Referencias, PVP, descuentos, netos, cantidades, fecha, proveedor y trazabilidad intactos.

## Alcance y advertencias

- La cola `public.normalization_review_groups` puede mostrar `candidate_active=true` debido a la existencia de dos proveedores; el contador efectivo de variantes de descripción ya es **1**.
- El mensaje de la interfaz «sin ficha unificada» puede permanecer porque no se creó `public.materials`.
- El total de reglas activas observado tras la operación es **178**. Es un recuento del momento de verificación, no una garantía de que no existan otras altas concurrentes.
- No se alteró ningún Excel de origen ni código de la web.
- La vista `public.order_lines_effective` fue verificada por SQL; no se comprobó la vista web con JWT autenticado.
- La interfaz de revisión con JWT de administrador no es invocable desde el conector SQL. Se usó el modelo de overrides/auditoría existente bajo la conexión autorizada, con condiciones y controles de versiones.
