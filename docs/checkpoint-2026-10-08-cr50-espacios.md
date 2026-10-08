# Checkpoint PROSOEL Costes — CR50 duplicado por salto de línea (2026-10-08)

## Incidencia
El buscador mostraba dos resultados independientes con referencia `CR50` y aparente mismo título:
- 19 pedidos con `Tubo Aiscan-CR corrugado doble capa diámetro 50 negro`.
- 1 pedido `26/734`, proveedor **GRUPO JARAMA**, precio neto **0,660000 €/ud**, con salto de línea entre `50` y `negro`: `Tubo Aiscan-CR corrugado doble capa diámetro 50\nnegro`.

La UI convertía visualmente el salto de línea en un espacio, pero la agrupación SQL comparaba cadenas originales exactas. Era una duplicidad **de presentación**, no un segundo material técnico.

## Corrección aplicada
Se creó y aplicó la migración `supabase/migrations/20261008_040_normalize_search_whitespace.sql` (`v16_4_normalize_whitespace_search_and_history`).

Sin cambiar ninguna compra ni normalizar técnicamente materiales diferentes:
1. `public.search_costs_enriched`: agrupa por referencia y descripción efectiva con espacios consecutivos/saltos de línea normalizados a un espacio, y devuelve un título limpio.
2. `public.historical_price_history_filtered`: busca las compras por la misma regla de espacios, de modo que la ficha de procedencia coincide con el grupo de la búsqueda.
3. `public.search_cables_filtered`: aplica idéntico criterio de agrupación para la búsqueda guiada cuando proceda.

El criterio **no** elimina diferencias de códigos, marcas, tamaños, cifras, potencias, materiales ni vocabulario; solo sustituye grupos de espacios/blancos por un espacio para la presentación y las comparaciones.

## Validación posterior en Supabase
- Búsqueda por `aiscan`: **CR50 aparece una sola vez, 20 pedidos, 20 líneas**, último neto **0,64 €** (pedido más reciente del 2026-10-08, GRUPO RIAS).
- Procedencia de `CR50` con el título normalizado: **20 compras / 20 pedidos**, incluyendo la línea original con salto.
- CR20 sigue mostrando **142 pedidos**.
- CR25 sigue mostrando **107 pedidos**.
- `public.order_lines` sigue conservando **1 descripción CR50 con salto de línea**; no se cambió su precio ni sus fuentes.
- No se creó ninguna corrección individual de compra ni se tocó Supabase Auth.
- No se necesitó cambiar `app.js`, `index.html` ni desplegar una nueva versión de GitHub Pages; el ajuste reside íntegramente en las funciones SQL usadas por la web publicada.

## Futura revisión
Si se observan materiales aparentemente duplicados por **otras** diferencias (referencia distinta, abreviaturas, palabras reordenadas, datos técnicos), **no** agrupar automáticamente. Esas equivalencias requieren revisión supervisada; las agrupaciones por espacios son puramente tipográficas.
