# PROSOEL Costes — 403628: compra 26/790 integrada en el grupo, alerta económica conservada

Fecha: 2026-10-20. Proyecto Supabase: `kusbndefngttaiytcrui`.

## Incidencia comunicada
El usuario observó dos tarjetas para la misma referencia `403628`: 29 pedidos con la descripción unificada y uno de GUARCONSA, pedido `26/790`, precio neto 78,56 €. Solicitó investigar si ese pedido ya estaba incluido entre los otros 29 y corregir la duplicación visual.

## Diagnóstico verificado
- La tarjeta superior NO era una compra duplicada ni estaba incluida en el grupo de 29.
- La línea fuente `public.order_lines.id=11597`, `order_id=2885`, pedido **26/790** de GUARCONSA, fecha 2026-10-15, línea 1, referencia de origen 403628, descripción `Magnetotérmico TX3 6kA-C 4P 25A`, cantidad 1, PVP 78,56 €, descuento `NETO`, neto **78,56 €**, total **78,56 €**.
- Existían exactamente 29 compras ya normalizadas bajo la descripción canónica `Magnetotérmico TX3 - 4P - 6kA - 400V - 25A - curva C - 4 módulos - Legrand`. Sus netos iban de 29,18 € a 32,976 €.
- La compra 26/790 tenía estado de precio validado en origen, pero el control del importador generó una **`price_alert`** legítima (registro `private.import_normalization_results.id=1`, `rule_id=220`, mediana comparable 30,7776 €, menor 30,7776 €, 5 compras comparables). Por eso no se aplicó automáticamente una normalización que ya coincidía por proveedor/referencia/texto fuente.
- El mismo pedido solo contiene una línea; la base tiene **30 compras distintas** de la referencia `403628`.

## Corrección y garantías
- Se decidió corregir exclusivamente la agrupación por descripción para **la línea 11597**, sin cambiar ni descartar el precio atípico. La identidad técnica pertenece a la misma referencia ya confirmada; esto no valida el precio económico.
- Se verificaron precio, proveedor, pedido, cantidad, fila única, alerta de precio preexistente, grupo efectivo de 29 y regla activa 220 para GUARCONSA.
- Hash MD5 de las 30 líneas fuente originales `public.order_lines`, concatenadas por ID: `a2137c157f85a2248db162d41d70b5df`.
- Simulación `BEGIN/ROLLBACK`: 30 compras bajo una sola descripción, un evento de auditoría de la línea 11597, `price_alert` conservada, hash original idéntico; confirmación de que el rollback no creó revisiones ni cambios.
- Transacción final `BEGIN/COMMIT`: insertada exactamente una fila en `public.purchase_line_overrides`, `corrected_description` canónica, `corrected_reference=NULL`, `excluded=false`, `revision=1`. Insertado un evento en `public.purchase_review_events` explicando la integración sin certificar precio. Ejecutado `private.reconcile_review_reference('403628')`.
- No se modificaron `public.order_lines`, `public.orders`, ninguna de las 29 correcciones anteriores ni las cinco reglas de importación existentes. El control del importador sigue activo.
- Auditoría independiente después del commit:
  - Una sola descripción efectiva, **30 líneas en 30 pedidos** y **66 unidades**.
  - Suma original preservada: **2.089,1165 €**.
  - La compra 26/790 aparece bajo la descripción unificada a 78,56 € netos, y su `price_alert` sigue registrada.
  - 5 reglas activas sin cambios; MD5 original sin cambios; `normalization_review_groups.description_count=1`.

## Advertencia para presupuestación
Este grupo tendrá como compra más reciente la del 2026-10-15 con **78,56 €**. Ese valor está económicamente pendiente de comprobación y no debe tratarse como precio representativo de mercado solo porque la descripción ahora esté unificada. Las últimas compras normales tenían valores aproximadamente **30–33 €**. Se recomienda verificar contra el pedido original o factura de GUARCONSA antes de utilizar 78,56 € como precio vigente para un presupuesto.

No se han cambiado scripts del importador ni el frontend y no se ha ejecutado GitHub Actions para esta corrección.