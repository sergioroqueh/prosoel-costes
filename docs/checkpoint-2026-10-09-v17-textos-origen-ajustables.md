# PROSOEL Costes — checkpoint V17: ajuste de línea en el origen de compras

Fecha: 2026-10-09.

## Incidencia detectada durante el uso

Cuando una ficha histórica (ej. tubo CLH DN32, ref. 10040232) mostraba «Ver origen», un motivo de revisión extenso ensanchaba toda la tabla de procedencia, generaba gran desplazamiento horizontal y dejaba un enorme espacio vacío en el recuadro de detalle.

Causa comprobada en `app/static/styles.css`:
```css
.history-table th,
.history-table td { white-space: nowrap; }
```
Al estar el detalle dentro de un `<td colspan="8">`, el texto de `originHtml(row)` heredaba la imposibilidad de saltar de línea. Un motivo largo se convertía en una cadena horizontal que ampliaba el ancho de la tabla.

## Cambio mínimo y localizado

- `app/static/app.js`: ahora los `<td colspan="8">` que contienen `origin-detail` tienen la clase explícita `origin-detail-cell`; se mantiene el marcado del resto de la tabla.
- `app/static/styles.css`: el `td.origin-detail-cell` tiene `white-space: normal`, `min-width: 0` y `overflow-wrap: anywhere`. El bloque `.origin-detail` añade `white-space: normal`, `overflow-wrap: anywhere`, `word-break: normal`, `box-sizing:border-box`, `width/max-width:100%` y `min-width:0`.
- `app/static/index.html`: caché de CSS y JS versionada con `v=20261009-v17`.

Esto permite que los motivos largos, nombres de obra, nombres de archivo y descripciones originales se partan en varias líneas dentro del ancho disponible. **No** se cambia `white-space: nowrap` de las celdas de fecha, proveedor, descuento o importes; la tabla puede seguir desplazándose horizontalmente en pantallas pequeñas si sus ocho columnas no caben.

## Garantías y verificaciones de código

- No se han modificado datos de Supabase, compras históricas, precios, notas de revisión, referencias ni el HTML de los importes.
- Se comprobó la sintaxis JS compilable, balance de llaves del CSS y existencia del marcado y de los tres recursos versionados en index.
- Pendiente de confirmación visual en navegador autenticado. El detalle se comprueba abriendo la búsqueda `10040232`, desplegando «Ver origen» en una compra corregida (p. ej. 24/242) y verificando que «Motivo de revisión» envuelve líneas sin añadir scroll horizontal adicional.
- GitHub Pages se publica automáticamente al actualizar el repositorio.

## Próximos pasos
Comprobar visualmente con Ctrl+F5. Si la tabla de ocho columnas sigue precisando desplazamiento en pantallas pequeñas, se considera normal; **no** debe crecer por textos de notas dentro de «Ver origen».
