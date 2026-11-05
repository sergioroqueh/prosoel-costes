# Actualización de pedidos importados — PROSOEL Costes (05/11/2026)

## Objetivo
Cuando se modifica un Excel de pedido después de importar (por ejemplo, se añade un material al 26/842),
NO se crea otro pedido ni se cambia su numeración. La web ofrece **Confirmar actualización**.

## Uso desde la web (solo administradores)
1. Abrir https://sergioroqueh.github.io/prosoel-costes/ y entrar en **Importar pedido**.
2. Seleccionar el archivo XLSX actualizado, con su misma numeración.
3. Si coincide exactamente con un archivo registrado, se omite.
4. Si coincide año/número/subnúmero, pero la huella de archivo es distinta, se comprueba proveedor, fecha e identidad.
5. Se muestra un comparativo de materiales añadidos, modificados y eliminados, y del importe original y nuevo.
6. Revisar el comparativo, escribir el **motivo** (al menos cinco caracteres), marcar la confirmación y pulsar **Confirmar actualización**.
7. Confirmar el mensaje con revisión y líneas; buscar el mismo número en la aplicación.

## Protecciones
- Solo un administrador activo, con sesión autenticada, puede ejecutar la revisión.
- El mismo ID de pedido y su numeración se mantienen; las ofertas relacionadas con el pedido mantienen su vinculación.
- El nuevo SHA del Excel tiene que ser diferente del anterior y no puede pertenecer a otro pedido.
- Bloqueo transaccional de la fila y comprobación de la huella anterior evitan sobrescrituras simultáneas.
- Se conserva una instantánea **íntegra anterior** de cabecera y todas las líneas, más autor, motivo, hora, SHA anterior/nuevo.
- Se emparejan materiales preexistentes antes de crear los nuevos (dos pasadas), conservando IDs, incluso si se insertan filas entre otras.
- Si se intenta borrar o reemplazar un material con una revisión externa/normalización dependiente, la operación se rechaza sin cambios parciales.
- No se altera el Excel en el ordenador ni el seguimiento independiente sincronizado desde Google Drive.
- La tabla de revisiones tiene RLS y está cerrada para acceso directo de usuarios de aplicación.
- Nuevos productos se incorporan al histórico de compras con referencia, descripción y precios extraídos.
- Los números de ofertas ya enlazadas no se eliminan ni se reescriben automáticamente si solo cambia el contenido del pedido; cambios de oferta deben revisarse por separado.

## Prueba reversible
El 05/11/2026 se simuló en la base de datos el 26/842 con una quinta línea, su comparativa y revisión.
La llamada devolvió actualización válida con una línea añadida. La prueba se ejecutó dentro de una
subtransacción revertida intencionadamente: no creó revisión ni alteró el pedido real.

## Archivo de migración
`database/migrations/20261105_safe_order_revisions.sql`.
