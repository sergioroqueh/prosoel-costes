# PROSOEL Costes — Unificación completa 10040220 (2026-10-09)

## Petición y reanudación

Usuario confirma que los dos grupos de referencia efectiva `10040220` —`Tubo CLH DN20 gris 7035` y `Tubo corrugado CLH libre de halógenos, DN20 en color Gris RAL 7035.`— son el mismo tubo corrugado CLH DN20 gris RAL 7035. La primera ejecución quedó pendiente por bloqueo del servicio; al reintentar, el usuario había corregido algunas compras manualmente.

## Estado real comprobado antes de cambiar datos

10 líneas en `public.order_lines_effective`, 10 pedidos, 5 de GRUPO RIAS a 0,185000 €/ud y 5 de GRUPO JARAMA a 0,265000 €/ud.

Cuatro líneas de GRUPO RIAS ya estaban corregidas por el usuario bajo:
`Tubo corrugado CLH libre de halógenos, DN20 en color Gris RAL 7035`
(sin punto final): IDs `5523, 5727, 7007, 8236`, revisión 1. **No se modificaron**.

Quedaban seis líneas:
- GRUPO JARAMA: `5639, 5887, 5894, 6065, 6642`, revisión 0, descripciones de origen iguales salvo saltos de línea y puntuación final.
- GRUPO RIAS: `9900`, pedido `26/555`, revisión 1. Había un ajuste previo `10010220` → `10040220` y texto corregido `Tubo CLH DN20 gris 7035`. Se conservó esa corrección de referencia.

## Aplicación

Se eligió la **denominación ya utilizada por el usuario** (sin punto final), para respetar las cuatro operaciones manuales y agrupar todo bajo una única descripción efectiva:

`Tubo corrugado CLH libre de halógenos, DN20 en color Gris RAL 7035`

Se realizó:
1. Simulación completa con `ROLLBACK` de los seis cambios, comprobando preservación de la referencia antigua del pedido `26/555`.
2. En una única transacción, validación de revisiones esperadas, proveedor/precio, situación no excluida y coincidencia de las cuatro correcciones manuales.
3. Se aplicaron **6 correcciones** por `private.apply_purchase_line_review`, cada una con justificación y evento de auditoría. Los cinco registros de JARAMA pasaron de revisión 0 a 1; línea 9900 pasó de revisión 1 a 2. Las cuatro líneas manuales quedaron como estaban.

## Verificaciones posteriores

- `search_costs_enriched('10040220')`: **una fila**, referencia 10040220, título unificado, **10 pedidos, 10 líneas**, último neto **0,185000 €/ud**, último proveedor GRUPO RIAS.
- `historical_price_history_filtered_review('10040220', titulo)`: **10 líneas / 10 pedidos**, mínimo 0,185000 €, máximo 0,265000 €.
- Efectivo actual: **10/10** descripciones iguales, **10/10** referencias `10040220`; **5 líneas** a 0,185000 € y **5 líneas** a 0,265000 €.
- Auditoría: un evento en cada uno de los nueve registros con una sola corrección, dos eventos en línea 9900 (total 11 eventos), que conserva como `supplier_reference_source` el código original `10010220`.
- **Ninguna modificación** de compras originales, texto del Excel, cantidades, precio neto unitario, descuentos ni fechas.

## Nota

La descripción de catálogo queda sin punto final por coincidencia con las cuatro correcciones manuales ya realizadas. Se mantiene el sentido técnico y la nomenclatura solicitados. No existe una regla automática para pedidos futuros.

No fueron necesarios cambios de código ni desplegar GitHub Pages: se usa la lógica de correcciones existente.
