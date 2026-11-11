# PROSOEL Costes — Unificación de la referencia 069801L

**Fecha de confirmación:** 11/11/2026  
**Referencia:** `069801L`  
**Artículo verificado:** conmutador modular Plexo de Legrand, IP55, IK08, 10AX, 250V, antracita  
**Descripción efectiva solicitada (exacta):** **Conmutador Plexo modular - IP55- IK08 - 10AX - 250V - Antracita**

## Verificación técnica
La referencia comercial 069801L y las características IP55, IK08, 10AX, 250V y antracita coinciden con la ficha del producto de Legrand en su catálogo Plexo y en la documentación comercial. El código es el mismo en los tres proveedores, aunque JARAMA usa `CONM 1P 10A`.

## Estado previo y operaciones
- **12 líneas de compra**, **12 pedidos**, **3 proveedores**, **5 variantes de texto origen normalizadas por proveedor**.
- **GRUPO RIAS:** 8 pedidos, precios netos observados 5,3550–5,5950 €/ud; último pedido 26/853 (10/11/2026), neto 5,5950 €.
- **GRUPO JARAMA:** 3 pedidos, precios netos observados 5,1680–6,1545 €/ud; último pedido 26/369 (07/05/2026), neto 6,1545 €.
- **GUARCONSA:** 1 pedido, 26/398 (14/05/2026), neto 5,3712 €.
- IDs de líneas afectadas: 6111, 8200, 8710, 8917, 8627, 9677, 10232, 10871, 11692, 8816, 11150, 11820.
- Se exigieron precondiciones estrictas de cantidad, referencias, proveedores, tipología y ausencia de revisiones/reglas anteriores.
- Se guardaron **12 correcciones efectivas de descripción** en `public.purchase_line_overrides` (versión 1) y **12 eventos de auditoría** en `public.purchase_review_events`. No se tocó `corrected_reference`, ni se excluyó ninguna compra.
- Se añadieron **5 reglas activas** en `private.confirmed_import_normalization_rules` (una por cada proveedor y variante de descripción normalizada en espacios), todas limitadas a la referencia de origen `069801L`.
- Se actualizó la cola mediante `private.reconcile_review_reference('069801L')`. La referencia puede permanecer como candidata de revisión por venir de más de un proveedor, aunque su `description_count=1`.
- El hash de las filas originales de `public.order_lines` fue idéntico antes y después.

## Comprobación posterior
La consulta efectiva sobre `public.order_lines_effective` devuelve **una sola descripción**, **12 pedidos**, **12 líneas**, **3 proveedores**, con fecha última de pedido **10/11/2026** y último precio neto **5,5950 €/ud (GRUPO RIAS)**. Se verificaron las cinco reglas, sus recuentos de evidencia (3, 1, 1, 5, 2), y los doce eventos de auditoría.

No se modificaron los Excel originales, PVP, descuentos, cantidades, precios netos ni totales. No se cambió el frontend: la búsqueda agrupa por referencia y descripción efectiva.

## Alcance de reglas futuras
Las reglas se aplican únicamente por **proveedor + referencia de origen + descripción de origen** con espacios normalizados y mantienen los controles de precio del importador. No extender equivalencias automáticamente a otros productos ni variantes de color o formato.
