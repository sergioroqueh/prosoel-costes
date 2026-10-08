# PROSOEL Costes — Corrección supervisada de descripción 5826630 (8 octubre 2026)

## Solicitud
El usuario confirma que las tres compras referenciadas `5826630` de AMARA corresponden al mismo material, aunque el almacén haya utilizado dos descripciones distintas. Solicita unificar la **descripción efectiva** para consulta de precios, conservando el histórico original.

## Descripciones de origen
- `GRAPA PICA 14MM 2TORN.CABLE 16-50 LIGERA` — 2 líneas, pedidos **24/200** y **24/253**.
- `GRAPA PICA 14MM 2TOR.1C 16-50 M-8 GALV` — 1 línea, pedido **25/864**.

## Descripción unificada aplicada
`Grapa para pica de tierra Ø14 mm, 2 tornillos, cable 16–50 mm²`

Se eligió una denominación con los rasgos comunes de las tres líneas, sin afirmar simultáneamente «ligera», «M8» o «galvanizada», ya que esos términos solo constaban en algunas descripciones de origen y no se quiso inventar ninguna característica adicional.

## Cambios realizados
- **3** revisiones individuales, dentro de **una sola transacción atómica**, mediante el mecanismo existente `private.apply_purchase_line_review(...,'correct',...)`.
- Se verificaron por ID los registros **2743, 3471, 4879** y su referencia original/comercial `5826630`, proveedor AMARA, precios, estado no excluido y revisión esperada 0; ante cualquier variación, la transacción habría sido cancelada.
- Cada revisión generó su `purchase_line_overrides` y su evento en `purchase_review_events`, con justificación expresa y responsable autorizado.
- **0** cambios en precio neto (todas las compras siguen a **0,800000 €/ud**), cantidad, descuento, proveedor, referencia ni texto original del pedido.
- **0** cambios de código frontend; la aplicación actual ya entiende las descripciones efectivas.

## Resultado verificado en Supabase
- `search_costs_enriched('5826630')`: **un único resultado**, con la descripción unificada, **3 pedidos**, último neto 0,80 €/ud.
- `historical_price_history_filtered_review`: **3 compras** visibles y **2 descripciones originales** recuperables en procedencia.
- Auditoría: **3 eventos**, revisiones efectivas 1/1/1.
- Se realizó primero una simulación con `ROLLBACK`: 3/3 descripciones unificadas, fuentes preservadas y precios sin cambios. Luego se aplicó la transacción definitiva.

## Futuro
Solo están corregidas las tres compras existentes a fecha de ejecución. Un nuevo pedido importado con las descripciones antiguas no será renombrado automáticamente; habrá que revisar una posible regla supervisada si se repite el caso.
