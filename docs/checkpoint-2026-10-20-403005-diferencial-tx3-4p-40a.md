# PROSOEL Costes — Unificación referencia 403005 (diferencial TX3 4P 40A 30mA AC)

**Fecha:** 2026-10-20. **Supabase:** `kusbndefngttaiytcrui`.

## Confirmación del usuario
Se aprueba unificar las dos variantes de descripción de la referencia **`403005`** bajo la descripción efectiva exacta:

**Diferencial TX3 4P - 40A - 30mA - Tipo AC - Legrand**

No se alteran las referencias ni la procedencia de las compras ni los importes, precios unitarios, descuentos o cantidades.

## Auditoría inicial
- **7 líneas de compra** repartidas en **6 pedidos**, de tres proveedores (GRUPO JARAMA 3, GUARCONSA 2 y GRUPO RIAS 2).
- Dos textos fuente (espacios y saltos de línea se conservan en la línea original):
  - `Diferencial TX3 4/40/30AC`, 6 líneas.
  - `DIFERENCIAL TX34/40/30 CORRIENTE\nALTERNA`, 1 línea.
- 4 combinaciones proveedor/referencia/texto normalizado para el importador.
- Entre 2024-01-02 y 2026-09-11, **10 unidades**. Suma exacta de las líneas originales: **1.119,7749 €**.
- Netos originales entre **71,6856 €** y **246,1368 €**.
- Antes de la intervención: 0 revisiones, 0 reglas y 0 exclusiones; todas las compras con `price_validation_status='valid'`.
- MD5 de concatenación de los registros originales de `public.order_lines` por ID, **`92aeb47c496819496a8c3bb5d8260e00`**.

## Precio anómalo detectado y conservado
- Pedido **24/767**, GUARCONSA, fecha **2024-07-31**, línea **3836**.
- PVP **535,08 €**, descuento `0.54`, neto unitario **246,1368 €**, cantidad **2**, importe **492,2736 €**.
- La referencia es `403005`, el texto fuente coincide con el grupo. Se incluye en la unificación de **descripción**, sin alterar el dato económico.
- En una comprobación retrospectiva de la salvaguarda de importación por proveedor, el pequeño histórico de GUARCONSA ocasiona alertas en **ambas líneas** de ese proveedor (IDs **3483** y **3836**) al usar cada una como entrada hipotética frente a la otra. Esta prueba no constituye un cambio de precio ni una prueba sobre un nuevo pedido real; indica revisión humana en situaciones comparables.

## Ejecución
1. Lecturas originales auditadas por referencia, fecha, pedido, proveedor, descripción y precio.
2. Simulación real con `BEGIN/ROLLBACK`: **7 líneas normalizadas**, **7 eventos de auditoría**, **4 reglas futuras**, MD5 de compras originales intacto. Se verificó explícitamente que no quedaron cambios tras el rollback.
3. Transacción definitiva `BEGIN/COMMIT` con bloqueo de las 7 filas de origen y validación estricta de recuentos, fechas, importe y huella histórica, ausencia de revisiones anteriores y comprobación exacta del precio excepcional.
4. Insertados **7** `public.purchase_line_overrides`, revisión 1, `corrected_description` canónica, `corrected_reference=NULL`, `excluded=false`; sin modificar `public.order_lines` ni `public.orders`.
5. Insertados **7** `public.purchase_review_events`, con valores antes/después.
6. Añadidas cuatro reglas activas en `private.confirmed_import_normalization_rules`, IDs **265–268**, familia `PROTECCIONES LEGRAND TX3`:
   - Regla 265: GRUPO JARAMA, texto estándar, 3 líneas de evidencia.
   - Regla 266: GUARCONSA, texto estándar, 2 líneas.
   - Regla 267: GRUPO RIAS, texto estándar, 1 línea.
   - Regla 268: GRUPO RIAS, variante `CORRIENTE ALTERNA`, 1 línea.
7. Ejecutado `private.reconcile_review_reference('403005')`.
8. Verificación independiente tras `COMMIT`: vista efectiva con una sola descripción para las 7 líneas y los 6 pedidos, 7 revisiones, 4 reglas activas y conservación de unidades, importes y hash de los registros fuente.
9. Simulación de coincidencia del importador con los 7 casos históricos: **7/7 coinciden con regla**, **2 casos disparan alerta de precio**, IDs 3483 y 3836, debido a la comparación escasa y extremadamente dispersa dentro del mismo proveedor.

## Protección del importador
Las reglas se aplican por **proveedor + referencia original + descripción original normalizada en espacios y mayúsculas**. El motor conserva su control de precios atípicos. No se han modificado scripts de importación ni frontend y no se ha ensayado una importación real de un nuevo Excel autenticado. Cualquier variante nueva quedará sin confirmar para revisión humana.

El resultado visual esperado al recargar la búsqueda de `403005` es una sola descripción con las 7 líneas trazables. `normalization_review_groups.description_count=1` tras el reconcile; `candidate_active=true` puede mantenerse por ser multi-proveedor, sin significar que queden descripciones diferentes.
