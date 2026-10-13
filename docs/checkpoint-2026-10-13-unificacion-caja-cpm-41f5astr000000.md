# PROSOEL Costes — unificación de caja PNZ-CPM-TDR-AE (313174)

**Fecha de actuación:** 2026-10-13. **Supabase:** `kusbndefngttaiytcrui`.

## Confirmación de PROSOEL

Agrupar todas las compras bajo referencia exacta `41F5ASTR000000` con la descripción efectiva:

**Caja de protección y medida PNZ-CPM-TDR-AE (313174)**

## Compras contrastadas

| Línea | Pedido | Proveedor | Descripción de origen | Neto unitario | Cantidad | Total | Resultado |
|---:|---|---|---|---:|---:|---:|---|
| 7884 | 25/321, 2025-05-14 | GRUPO RIAS | `CAJA DE PROTECCIÓN Y MEDIDA\nPNZ-CPM-TDR-AE*313174` | 664,770 € | 1 | 664,770 € | Corrección efectiva versión 1 |
| 11586 | 26/785, 2026-10-13 | GRUPO JARAMA | `Caja de protección y medida PNZ-CPM-TDR-AE (313174)` | 640,909 € | 1 | 640,909 € | Ya correcta, sin override |

- Referencia fuente y efectiva idéntica en ambas: **`41F5ASTR000000`**.
- No existían overrides previos ni reglas futuras para esta referencia.
- Total histórico conservado: **1.305,679 €**.

## Ejecución y verificación

1. Se verificaron en `public.order_lines_effective` compras, pedidos, proveedor, fecha, precios, cantidades, descripción fuente, exclusiones y versiones; ambas líneas tenían revisión cero.
2. Simulación transaccional `BEGIN … ROLLBACK`: una corrección efectiva, un evento de auditoría y dos reglas de importación, una por proveedor y descripción de origen. La simulación producía una única descripción efectiva para ambas compras.
3. Tras el `ROLLBACK` se confirmó que no quedó ningún override ni regla persistida.
4. Se ejecutó una transacción definitiva `BEGIN … COMMIT` con bloqueo de ambas líneas y precondiciones estrictas sobre identidad, referencia exacta, valor neto, cantidades e inexistencia de cambios concurrentes.
5. Se creó **1 fila en `public.purchase_line_overrides`** (línea 7884, revisión 1, `corrected_description` canónica, `corrected_reference=NULL`), junto con **1 evento en `public.purchase_review_events`** con antes/después, motivo y actor `asistente-prosoel-costes`.
6. Se crearon **2 reglas activas** en `private.confirmed_import_normalization_rules`, familia `CAJA PROTECCION Y MEDIDA`, cada una vinculada a proveedor, referencia fuente y descripción fuente con normalización de espacios. El motor existente `private.apply_confirmed_import_rules` las comprobará en futuros pedidos, incluyendo su control de precios y la auditoría de revisiones.
7. Se llamó a `private.reconcile_review_reference('41F5ASTR000000')`.
8. Se verificó mediante hash `public.order_lines` y los metadatos de `public.orders` antes/después: todos los datos originales permanecieron intactos. La fila JARAMA, ya correcta, **no recibió revisión artificial**.
9. Verificación independiente tras el commit: **2 compras, 1 sola descripción efectiva, 1 override, 1 evento auditado y 2 reglas activas**, total de reglas activas del sistema **173**.

## Advertencias y alcance

- `public.normalization_review_groups` puede seguir marcando `candidate_active=true` debido a presencia de dos proveedores aunque `description_count=1`. No se han alterado manualmente los criterios de la cola.
- «Sin ficha unificada» puede seguir mostrándose: estas correcciones de compra y reglas de importación **no crean un registro `public.materials`**.
- Se ha verificado Supabase, no la representación visual bajo una sesión autenticada en la web.
- No se ha modificado código ni se ha reimportado ningún pedido o sobrescrito el histórico.
- La RPC normal de revisión exige JWT administrativo del usuario web, ausente en el conector SQL; se realizaron writes equivalentes con control transaccional estricto, versiones y eventos de auditoría, sin suplantar identidad de usuario.
