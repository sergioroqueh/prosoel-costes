# PROSOEL Costes — Unificación cable H07Z1-K 2,5 mm² azul

Fecha de actuación: **2026-10-13**. Proyecto Supabase: `kusbndefngttaiytcrui`.

## Solicitud

La revisión de resultados presenta una compra de cable de **2,5 mm² AZUL** con referencia original **`H07Z1K1,5AZR`** y otros dos resultados por **`H07Z1K2,5AZR`** (75 y 1 pedidos).

PROSOEL confirma agrupar exclusivamente esos materiales como:

- Referencia efectiva: **`H07Z1K2,5AZR`**.
- Descripción efectiva exacta: **`Hilo Flexible Libre Halógenos H07Z1-K 2.5mm2 AZUL`**.

## Estado anterior de Supabase

- 76 compras ya bajo `H07Z1K2,5AZR`, con cuatro variantes de descripciones de origen:
  - 61 compras: `MTS.CABLE FLEXIBLE L.H. H07Z1K 2,5 MM\nAZUL ROLLO`
  - 12 compras: `MTS.CABLE FLEXIBLE L.H. H07Z1K 2,5 MM AZUL ROLLO`
  - 2 compras: `MTS.CABLE FLEXIBLE L.H. H07Z1K 2,5 MM \nAZUL ROLLO`
  - 1 compra: `MTS.CABLE FLEXIBLE L.H. H07Z1K 2,5 MMAZUL ROLLO`
- Una compra con referencia equivocada `H07Z1K1,5AZR` y descripción de origen `CABLE H07Z1-K ZEROH FLEX 1X2,5 AZUL`: ID línea **11134**, pedido **26/210-26**, fecha **2026-07-23**, proveedor **GRUPO RIAS**. Cantidad **400 m**, PVP y neto **0,312000 €/m**, descuento **NETO**, total **124,8000 €**.
- Total afectado: **77 compras / 77 pedidos**, un proveedor, sin revisiones previas ni exclusiones, **5 variantes de descripción original**.
- Precios unitarios históricos: **0,245000–0,319000 €/m**. Cantidad **136.800 m**; suma de líneas **39.602,6000 €**.

## Verificación y actuación

1. Se bloquearon las líneas durante la transacción y se validaron las 77 compras, 1 referencia errónea, ninguna revisión previa, textos técnicamente coherentes con 2,5 mm² azul, cantidades e importes agregados.
2. Simulación con `ROLLBACK`: 77 líneas normalizadas, un traslado de referencia, una descripción efectiva y todos los importes preservados; verificación posterior de que la simulación no había persistido cambios.
3. Aplicación con `COMMIT` en **una única transacción**: 77 revisiones (versión 1) en `public.purchase_line_overrides`, 77 eventos en `public.purchase_review_events`, con estados anterior/siguiente, motivo y actor `asistente-prosoel-costes`.
4. En la línea **11134** se cambió **solo la referencia efectiva** y **la descripción efectiva**; en las otras 76 se cambió únicamente la descripción efectiva.
5. Se comprobaron mediante checksum los campos originales de compras y pedidos antes/después, incluyendo referencia original, descripción original, cantidad, PVP, descuento, neto, total, proveedor, fecha y archivo fuente. **No se modificaron los datos originales.**
6. Se actualizaron las colas mediante `private.reconcile_review_reference` para `H07Z1K1,5AZR` y `H07Z1K2,5AZR`.
7. Verificación posterior al commit: 77 líneas efectivas bajo **una descripción exacta**, **5 descripciones de origen** conservadas, **77 revisiones y 77 eventos**, línea 11134 corregida conservando origen, precio y cantidad, cola `H07Z1K2,5AZR` con `candidate_active = false`.

La función `private.apply_purchase_line_review` requiere JWT administrador de la web y no se puede invocar desde la conexión SQL administrativa. Se utilizó el mecanismo persistente existente con control de versiones, precondiciones, auditoría y transacción, sin simular identidad de usuario.

## Advertencia técnica no incluida en el cambio

Se detectó una línea distinta, **ID 3472, pedido 24/356 del 18/03/2024**, con referencia `H07Z1K1,5AZR` y descripción original `MTS.CABLE FLEXIBLE L.H. H07Z1K 10 MM\nAZUL ROLLO`. Precio neto **0,155000 €/m**, cantidad **200 m**. La contradicción 1,5 mm² vs 10 mm puede obedecer a una errata de descripción, pero no hay prueba suficiente para reclasificarla. **Se dejó sin modificar a la espera de confirmación expresa de PROSOEL**.

## Alcance

- Se modificaron únicamente campos efectivos de revisión, sin cambios de código ni despliegue web.
- La vista `public.order_lines_effective` y la auditoría verifican la agrupación; la comprobación visual desde el buscador autenticado queda pendiente, porque el conector SQL no dispone de su JWT.
- Este checkpoint documenta el estado revisado; no se introduce ninguna normalización automática para futuras importaciones.
