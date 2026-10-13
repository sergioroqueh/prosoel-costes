# PROSOEL Costes — Unificación H07Z1-K 1,5 mm² AMARILLO VERDE

**Fecha:** 2026-10-13. **Supabase:** `kusbndefngttaiytcrui`.

## Petición

Unificar únicamente compras con **referencia exacta común**, bajo la descripción efectiva:

**Hilo Flexible Libre Halógenos H07Z1-K 1.5mm2 AMARILLO VERDE**

No modificar precios, pedidos, proveedores, descuentos, cantidades ni líneas originales.

## Identificación previa

La referencia **`H07Z1K1,5AVR`** tenía **74 compras**: **73 correspondían a cable amarillo-verde de 1,5 mm²** y una a cable de 2,5 mm² que figuraba con referencia equivocada. Se seleccionaron solo 73 compras para normalizar, distribuidas en cinco descripciones originales:

- 58: `MTS.CABLE FLEXIBLE L.H. H07Z1K 1,5 MM\nAMARILLO VERDE ROLLO`
- 7: `MTS.CABLE FLEXIBLE L.H. H07Z1K 1,5 MM AMARILO VERDE  ROLLO`
- 5: `MTS.CABLE FLEXIBLE L.H. H07Z1K 1,5 MM AMARILLO VERDE ROLLO`
- 2: `MTS.CABLE FLEXIBLE L.H. H07Z1K 1,5 MM \nAMARILLO VERDE ROLLO`
- 1: `MTS.CABLE FLEXIBLE L.H. H07Z1K 1,5 MM\nAMARILLO VERDE  ROLLO`

Las 73 compras proceden de GRUPO RIAS, 73 pedidos, sin revisiones previas ni exclusiones. **95.200 m** en conjunto; suma de importes **17.053,80 €**; precios netos unitarios originales entre **0,147000 y 0,196000 €/m**.

## Líneas no consolidadas

Por indicación expresa «si ref es igual», **no se modificaron ni agruparon otras referencias** aunque sus descripciones parecieran equivalentes:

- `H07Z1-K1,5AV`, CADIELSA: 1 compra, neto **0,185000 €/m**.
- `H07Z1K1,5AV`, GRUPO RIAS: 1 compra, neto **0,165000 €/m**.

**Advertencia técnica:** Línea ID **11135**, pedido **26/210-26**, GRUPO RIAS, del 23/07/2026. Referencia original y efectiva `H07Z1K1,5AVR` pero descripción original **`CABLE H07Z1-K ZEROH FLEX 1X2,5 AM-VD`**. Compra de **400 m** a **0,312000 €/m** neto, **124,80 €**, descuento NETO. Por diferencia de sección **no se incluyó en la unificación** ni se corrigió su referencia sin autorización. Existe la referencia de 2,5 mm² `H07Z1K2,5AVR` en el histórico como posible destino, pendiente de confirmación.

## Ejecución y QA

- Se inspeccionaron referencias originales/efectivas, cinco variantes de texto, precio neto, PVP, descuento, cantidad, proveedor, exclusiones y revisiones anteriores.
- Se adquirieron bloqueos en las 73 líneas y se verificaron precondiciones de recuento, textos, sección, 73 revisiones esperadas = 0, metros e importes; se comprobó que ID 11135 estaba sin modificar.
- Simulación transaccional con `ROLLBACK`: **73/73** descripciones efectivas comunes y compra anómala sin cambios. Se verificó después que el rollback no persistió ningún override nuevo.
- Ejecución definitiva en una transacción con `COMMIT`: **73 nuevas revisiones** en `public.purchase_line_overrides` (versión 1) y **73 eventos** en `public.purchase_review_events` con estado anterior y posterior, actor `asistente-prosoel-costes` y motivos de corrección.
- Los originales en `public.order_lines` y campos de pedido en `public.orders` se contrastaron con checksum antes/después y permanecieron intactos.
- Se ejecutó `private.reconcile_review_reference('H07Z1K1,5AVR')`.
- Verificación posterior: **73 líneas** bajo la descripción exacta, **cinco descripciones originales** recuperables y **73 revisiones / 73 eventos**; la anomalía ID 11135 sigue sin revisión, y las dos referencias diferentes permanecen sin cambios.
- La cola `normalization_review_groups` permanece con `candidate_active=true`, **74 compras y dos descripciones efectivas** porque existe la anomalía de 2,5 mm². Es intencionado: no debe cerrarse como completamente resuelta.

La función de revisión `private.apply_purchase_line_review` solo acepta sesiones JWT administrativas de la web, no disponibles en el contexto de la conexión SQL del conector. Se siguió el mecanismo de overrides/auditoría equivalente en transacción controlada, sin suplantar la sesión de administrador.

## Alcance y límites

Solo se modificaron campos efectivos de revisión, sin cambios de código ni despliegue de la aplicación. Se verificó la vista `public.order_lines_effective` y la procedencia de datos en Supabase, pero no se pudo comprobar visualmente el buscador ni la sección Procedencia bajo un JWT de usuario autenticado.
