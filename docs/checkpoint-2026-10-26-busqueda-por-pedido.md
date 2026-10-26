# Checkpoint · Búsqueda de pedidos por número · 2026-10-26

## Objetivo
En PROSOEL-Costes, consultar un pedido completo por número (ejemplo `26/775`) en una pestaña independiente de «Consultar precios».

## Implementado
- Pestaña «Buscar pedido» para usuarios autorizados, sin cambiar autenticación ni permisos.
- Acepta `26/775`, `2026/775`, `26-775`, y sufijo de subpedido `26/775.1`.
- Filtro estructurado por `orders.order_year` y `orders.order_number`, evitando coincidencias parciales (775 frente a 7750).
- Recupera cada pedido por separado si existen varias filas con idéntico año y número (no los fusiona).
- Recupera las líneas **originales** de `order_lines` con paginación hasta agotarlas (evita límite de 1000 filas).
- Muestra fecha, proveedor, obra, archivo de origen, importe declarado, referencia de línea, descripción original, cantidad, PVP, descuento, neto, total y clasificación de línea.
- Incluye portes/RAEE/otras líneas originales sin transformar, ya que aquí el objetivo es «qué se pidió», no estadísticas de precios.
- Interfaz de solo lectura, todas las cadenas de BD escapadas para HTML.

## Evidencia real leída en Supabase (sin modificar)
Proyecto `prosoel-costes`, tablas `public.orders`, `public.order_lines`, `public.suppliers`, `public.projects`.
- `26/775`: 1 registro / 1 línea, fecha 2026-10-07, proveedor AMARA, obra TALLER, archivo `Pedido -775- TALLER FP (cinta aislante) 07-10-26 AMARA.xlsx`.
- Línea: referencia 657054, cinta aislante PVC gris, cantidad 320, PVP 0,48 €, descuento NETO, neto 0,48 €, total 153,60 €.
- Las tablas ya conceden SELECT al rol `authenticated` y tienen RLS `private.has_app_access()`; no se ha creado función RPC ni migración.
- Caso de duplicidad detectado: año 2026, número 210, 35 registros; por eso la búsqueda muestra registros independientes.
- Máximo de líneas por pedido encontrado en esta revisión: 101. La paginación cubre escenarios más grandes.

## Pruebas
- 8/8 comprobaciones funcionales ejecutadas en un entorno JavaScript aislado:
  parser, entradas inválidas, coincidencias exactas, subpedidos, duplicados, paginación 1203 filas, respuesta vacía, errores y escape HTML.
- Revisión de sintaxis de los dos módulos JS satisfactoria.
- Comprobación de IDs HTML: sin duplicados; todos los controles encontrados.
- Pruebas reproducibles sin CI ni npm: `node --test tests/order_lookup.test.mjs`.
- No se ha probado una sesión real en el navegador con token de un usuario autorizado ni ejecutado el despliegue de Pages.

## Límites y seguridad
- Sin modificaciones en Supabase, precios, normalización, permisos, órdenes o importación.
- Sin crear ni ejecutar GitHub Actions.
- `main` sin cambios; funcionalidad preparada en rama / PR para revisión.
- No incluye archivo XLSX descargable: en la base sólo se conserva su nombre y la información estructurada.

## Publicación SIN workflow propio de Actions
Actualmente el repo se despliega por `.github/workflows/pages.yml`, que copia `app/static`.
Para evitar ese workflow, se puede publicar desde una rama dedicada `gh-pages` con el **contenido de `app/static` en la raíz**:
1. Preparar/actualizar la rama `gh-pages` con los archivos estáticos.
2. GitHub → Settings → Pages → Build and deployment → Source: **Deploy from a branch**.
3. Seleccionar branch `gh-pages`, folder **/(root)**, guardar.
4. Verificar login, búsqueda `26/775` y búsqueda histórica en navegador tras la publicación.

Advertencia: GitHub aún usa su propia infraestructura interna de publicación de Pages, incluso al publicar desde rama; no se debe prometer que funciona si el servicio de Actions/Pages está totalmente inhabilitado para la cuenta.

## Siguiente paso
Revisión PR, comprobar el despliegue real y migrar el origen de Pages a rama si se quiere prescindir de workflows mantenidos por nosotros. No alterar el histórico de compras.
