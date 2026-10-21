# Checkpoint 2026-10-21 — Schneider Acti9 y selección de resultados

## Confirmación de normalización

El usuario confirmó expresamente estas equivalencias/descripciones (se usa el texto literal indicado):
- A9K17632 -> Magnetotérmico Acti9 iK60 - 1P+N - 32A - Curva C - 6kA - Schneider (5 líneas)
- A9K17416 -> Magnetotérmico Acti9 iK60N - 4P - 16A - Curva C - 6000A - Schneider (5)
- A9K17620 -> Magnetotérmico Acti9 iK60 - 1P+N - 20A - Curva C - 6kA - Schneider (2)
- A9K17216 -> Magnetotérmico Acti9 iK60N - 2P - 16A - Curva C - 6kA - Schneider (5)
- A9K17210 -> Magnetotérmico Acti9 iK60N - 2P - 10A - Curva C - 6kA - Schneider (4)
- A9K17225 -> Magnetotérmico Acti9 iK60 - 2P - 25A - Curva C - 6kA - Schneider (3)
- A9K17432 -> Magnetotérmico Acti9 iK60N - 4P - 32A - Curva C - 6000A - Schneider (1)
- A9F79216 -> Magnetotérmico Acti9 iC60N - 2P - 16A - Curva C - 6000A/10kA - Schneider (3)
- 7500510216 (SALTOKI) -> A9K17216, mismo texto canónico (1)
- A9K17232 -> Magnetotérmico Acti9 iK60 - 2P - 32A - Curva C - 6kA - Schneider (1)
- AIC9K17616 (ref errónea) -> A9K17616: Interruptor magnetotérmico - Acti9 iK60 - 1P+N - 16A - Curva C - 6kA - Schneider (2)
- A9K17616 (ya confirmado 2026-10-20) conservado (26).

## Aplicado en Supabase

- 58 líneas totales observadas; 32 nuevos overrides insertados en public.purchase_line_overrides y 26 preservados.
- 22 reglas nuevas confirmadas en private.confirmed_import_normalization_rules: combinación estricta de proveedor, referencia y descripción de origen. Se conservan 7 reglas previas para A9K17616.
- La referencia y descripción originales de public.order_lines siguen intactas, así como PVP, descuento, neto, cantidad, pedido y fecha.
- Confirmación posterior mediante SELECT por referencia original: todos los campos efectivos coinciden con el objetivo, incluyendo las dos equivalencias especiales.
- La normalización futura usa la función privada ya existente apply_confirmed_import_rules; mantiene sus salvaguardas de precios. No se ha reescrito el algoritmo del importador.
- Aviso de seguridad de Supabase: esquema private con RLS desactivado; verificar que NO se exponga a través de Data API antes de compartir ampliamente. No cambiar RLS a ciegas.

## UI

- app/static/app.js: estado selectedResultKey; marca persistente aria-pressed e is-selected en la tarjeta del resultado elegido; se conserva al cargar más resultados, se limpia al iniciar otra búsqueda.
- app/static/styles.css: resaltado azul permanente, borde lateral y círculo visual.
- app/static/index.html: parámetros de caché renovados para JS y CSS.
- Commits de UI: d0df45ed080551f186fd9d94513ea6ab3cd1c36a, 870546b31e8dcf17c80202739646ce508ccb5db9, fd26028cd641b915667fb69f34857ab1007d6557, 057ca9ceb777089364a695d7ba0b9c83279a35aa.
- Pendiente de confirmar despliegue GitHub Pages y comprobar en navegador autenticado. No ejecutar CI remoto adicional únicamente por este checkpoint.
