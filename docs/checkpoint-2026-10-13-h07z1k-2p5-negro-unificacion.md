# PROSOEL Costes — Unificación H07Z1-K 2,5 mm² NEGRO

**Fecha:** 2026-10-13  
**Proyecto Supabase:** `kusbndefngttaiytcrui`  
**Referencia efectiva:** `H07Z1K2,5NGR`

## Solicitud de PROSOEL

Agrupar los tres resultados observados (76 + 1 + 1 pedidos) bajo **una sola descripción efectiva**, exactamente:

`Hilo Flexible Libre Halógenos H07Z1-K 2.5mm2 NEGRO`

Sin alterar los precios históricos ni la referencia efectiva.

## Inspección previa del histórico

- **78 líneas / 78 pedidos** del proveedor **GRUPO RIAS**.
- Cinco descripciones originales (incluyendo variaciones de espacios y saltos de línea); la interfaz mostraba tres resultados (76 + 1 + 1).
- Dos referencias originales: `H07Z1K2,5NGR` y, en una compra corregida anteriormente, `H07Z1K1,5NGR`.
- Precio neto mínimo: **0,245000 €/m**. Máximo: **0,319000 €/m**.
- Cantidad acumulada: **75.200 m**. Suma de importes históricos: **21.609,2000 €**.
- **77 compras sin correcciones previas** y **1 compra con revisión anterior** (`order_lines.id = 11136`).

### Respeto a la corrección previa

La línea **11136**, pedido **26/210-26**, tiene la descripción de origen `CABLE H07Z1-K ZEROH FLEX 1X2,5 NEGRO`. En el checkpoint anterior se corrigió su referencia efectiva a `H07Z1K2,5NGR` porque el Excel tenía la referencia de 1,5 mm² equivocada.

Esta segunda operación conserva esa corrección de referencia y añade la descripción común. Su revisión pasa de **1 a 2**. Precio neto conservado **0,312000 €/m**, 400 m, importe **124,8000 €**.

## Ejecución

- Precondiciones estrictas: 78 líneas de cable 2,5 mm² negro, una sola revisión anterior (línea 11136), sin exclusiones ni conceptos de tasas/portes/servicios.
- Simulación real dentro de una transacción con `ROLLBACK`: 78/78 descripciones unificadas, 77 revisiones de versión 1 y una de versión 2, 75.200 m e importes intactos.
- Confirmación de que el `ROLLBACK` no persistió descripciones nuevas.
- Aplicación en **una sola transacción con `COMMIT`**: 78 correcciones en `public.purchase_line_overrides`, preservando `corrected_reference` ya existente; 78 eventos en `public.purchase_review_events` con estado anterior, siguiente, motivo y actor `asistente-prosoel-costes`.
- Las compras originales en `public.order_lines` y los datos originales de los pedidos en `public.orders` no se modificaron. Se comparó un checksum de todos los campos relevantes antes y después de la operación.
- Reconciliación de cola mediante `private.reconcile_review_reference('H07Z1K2,5NGR')`.

La función `private.apply_purchase_line_review` está limitada a sesiones JWT de administrador de la web y no es invocable directamente desde la conexión administrativa del conector SQL. Se utilizó su mecanismo de persistencia equivalente sin suplantar sesión, conservando control de revisiones y eventos de auditoría.

## Verificación posterior en Supabase

- `public.order_lines_effective`: **78 compras, 78 pedidos, una descripción efectiva**, referencia efectiva `H07Z1K2,5NGR`.
- Se conservan **5 textos de origen** y **2 referencias originales** para procedencia.
- Las **78 compras** muestran la descripción común exacta.
- **77 líneas con revisión 1**; **1 línea con revisión 2**.
- **78 eventos de auditoría** de esta operación.
- Precio mínimo **0,245000 €/m**, máximo **0,319000 €/m**, cantidad **75.200 m**, importe agregado **21.609,2000 €**.
- `normalization_review_groups.candidate_active = false` para esta referencia.

**Alcance de comprobación:** verificadas vista efectiva, documentos originales y eventos desde Supabase. La visualización del buscador y de Procedencia con JWT de la aplicación no se puede reproducir desde la conexión administrativa, por lo que no se declara verificada visualmente.

**Código:** ningún cambio de aplicación ni despliegue. Solo corrección de campos efectivos, con origen preservado y trazabilidad documental.
