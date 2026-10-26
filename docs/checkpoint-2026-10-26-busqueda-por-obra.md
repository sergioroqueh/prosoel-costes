# PROSOEL-Costes — búsqueda por obra (2026-10-26)

## Alcance realizado
- Entrada unificada `26/819` o `LYMA` en la pestaña Buscar pedido.
- Búsqueda por obra con `public.projects` (`ilike`) con distinción de IDs, selección exacta preferida y elección explícita de homónimos/parciales.
- Pedidos `public.orders` filtrados por `project_id`, orden fecha DESC e ID DESC, paginados 20 en 20 con botón Mostrar 20 más y conteo.
- Desplegable por pedido: `public.order_lines` únicamente al solicitarlo, con paginación de 1000 para no truncar históricos y caché de la sesión.
- Las líneas originales preservan cantidad, referencia, descripción, PVP, descuento, neto y total sin modificación.
- La clasificación literal `unknown` se muestra «Sin clasificar». También se traducen RAEE/ecotasa, portes y servicios. **No se cambian datos de la base de datos.**
- Puntos de entrada web con versiones de módulo y CSS para evitar caché.

## Comprobaciones
- Pruebas de JavaScript aisladas sobre los módulos reales ejecutadas: 14 verificaciones funcionales y 3 de desplegable/caché/escape HTML: **17/17 PASS**.
- Sintaxis JS app y módulos, IDs de interfaz: comprobados.
- Tests versionados sin CI: `tests/project_lookup.test.mjs` (7 casos) y tests de número de pedido anteriores. Para ejecutar en entorno local con Node: `node --test tests/order_lookup.test.mjs tests/project_lookup.test.mjs`.
- Base Supabase comprobada **solo lectura**: LYMA (id 32, 82 pedidos) frente a LYMA EL LOMO (id 26, 24 pedidos). Confirmado pedido 26/819 (2026-10-26, Grupo Rias).
- `line_kind=unknown` no implica material ni precio desconocidos.

## Publicación
- `main` sin cambios; no workflows propios de GitHub Actions.
- Solo actualizar `gh-pages` con el árbol `app/static` probado de la rama de característica.
- GitHub Pages por rama `gh-pages` raíz, sin alterar la configuración previamente ajustada.
- Verificar despliegue de Pages tras actualización y prueba final manual con sesión autenticada.

## Limitaciones
- No hay prueba de extremo a extremo de navegador autenticado (requiere login del usuario).
- La rama `gh-pages` es la fuente de publicación actual; cambios futuros en `main` no se reflejarán automáticamente sin sincronizar el árbol estático.
