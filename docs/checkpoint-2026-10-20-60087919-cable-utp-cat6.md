# PROSOEL Costes — Unificación 60087919, cable U/UTP Cat.6 LSZH Dca Blanco

**Fecha:** 2026-10-20. **Supabase:** `kusbndefngttaiytcrui`.

## Confirmación del usuario
Todos los resultados visibles de `60087919` representan el mismo material (cable UTP). Se aprueba normalizar la referencia y las variantes observadas bajo la descripción efectiva:

**Cable de datos U/UTP Cat.6 - 4 pares - 24 AWG - LSZH - Dca - Blanco**

Referencia original y efectiva: **`60087919`**.

El histórico muestra algunas descripciones de caja de 305 m y variantes con salto de línea; no se interpreta el embalaje `C-305` como nueva unidad de precio. Se mantiene el texto exacto del pedido como dato fuente, y la descripción efectiva es la denominación normalizada confirmada.

## Auditoría previa
- **49 líneas / 49 pedidos**, con 3 proveedores y 4 textos de origen literales.
- Variantes de normalización futura tras homogeneizar espacios: **5 combinaciones proveedor + descripción origen**.
- GRUPO RIAS: 34 compras `UTP 4P CAT.6 LSOH Dca BLANCO G.C. 24 AWG`; 3 `JT U/UTP6 4P HD LSZH C-305 Dca BR\n60087919`; 2 `JT U/UTP6 4P HD LSZH C-305 Dca BR 60087919`; 2 `JT U/UTP6 4P HD LSZH C-305 Dca BR60087919`.
- GRUPO JARAMA: 3 compras `UTP 4P CAT.6 LSOH Dca BLANCO G.C. 24 AWG`.
- GUARCONSA: 5 compras `UTP 4P CAT.6 LSOH Dca BLANCO G.C. 24 AWG`.
- Todas eran utilizables para precios, tenían `price_validation_status='valid'`, revisión 0 y referencia `60087919`; no existían reglas futuras para ella.
- Intervalo de fechas de compra: 2024-01-12 a 2026-10-01. Precio neto unitario registrado: de **0,297000** a **0,378000 €/ud**.
- **54.930 unidades** y **17.557,6317 €** de importes registrados. Precio neto de la última compra `26/757` (2026-10-01, GRUPO RIAS): **0,325000 €/ud**.
- La huella de las 49 filas **originales** en `public.order_lines`, concatenadas por ID, es MD5 `802c995108b4fdd8130c585ffa270aac`.

## Transacción
1. Lectura y validación estricta previa: referencia, recuentos de líneas/proveedores/textos, totales, cantidades, revisiones previas, registros de auditoría y reglas preexistentes.
2. Simulación `BEGIN ... ROLLBACK`: **49 overrides, 49 eventos de auditoría, 5 reglas futuras**; hash de fuentes intacto. Se verificó posteriormente que el rollback dejó cero registros persistidos.
3. Transacción definitiva `BEGIN ... COMMIT` con bloqueo de líneas y precondiciones idénticas.
4. Insertados 49 registros en `public.purchase_line_overrides`, revisión 1, `corrected_reference=NULL`, `corrected_description` canónica, `excluded=false`; sin actualizar `public.order_lines` ni `public.orders`.
5. Insertados 49 registros en `public.purchase_review_events`, con estado anterior/posterior y motivo de usuario.
6. Insertadas cinco reglas activas en `private.confirmed_import_normalization_rules`, IDs **240–244**. Las combinaciones se restringen a **proveedor + referencia original exacta + descripción original normalizada en espacios**; la variante del salto de línea y su equivalente con espacio comparten regla.
7. Ejecutada `private.reconcile_review_reference('60087919')`. En `normalization_review_groups`, `description_count=1`; `candidate_active=true` puede continuar por comparativa entre proveedores, sin que ello implique varios textos efectivos.
8. Verificación independiente después del commit: una sola descripción efectiva para las 49 compras; 49 eventos de auditoría; 5 reglas futuras activas; hash original idéntico y total histórico preservado.
9. Simulación de emparejamiento y guardia de precios vigente con compras históricas: **49/49 coinciden con regla y 0 alertas de precio**.

## Importaciones futuras
No se modifica el importador SQL ni la web. El motor ya desplegado `private.apply_confirmed_import_rules`, dentro de `public.import_new_prosoel_order`, reconoce estas cinco combinaciones aprobadas y corrige únicamente la descripción efectiva, salvo que se dispare una alerta de precio. Los textos de otros proveedores o descripciones no confirmadas quedan pendientes. Los precios, importes, descuentos, cantidades, proveedores, fechas y Excel originales permanecen intactos. No se ha ejecutado una nueva importación real bajo JWT; la validación de futuro es de simulación de las reglas con datos reales existentes.

**Estado de base después:** 2.897 pedidos, 11.661 líneas originales, 1.512 overrides y 208 reglas futuras activas. Sin modificaciones de frontend ni despliegues de GitHub Actions.
