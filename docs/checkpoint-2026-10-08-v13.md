# PROSOEL Costes — checkpoint V13 (8 octubre 2026)

## Alcance
Restyling exclusivamente visual con la identidad PROSOEL, a petición del usuario. Se conserva **toda la lógica actual** de consultas de precios, búsqueda, importación de Excel, normalización, decisiones supervisadas, corrección por línea y exclusión reversible.

## Identidad visual
- Azul principal `#134079` (extraído del logotipo suministrado).
- Naranja corporativo `#EC6B43` (extraído del logotipo).
- Blanco/gris claro `#F7F7F7` para fondo.
- Colores de éxito (verde) y error crítico (rojo) conservados semánticamente.
- Favicon SVG con una versión vectorial del monograma PROSOEL en `app/static/assets/prosoel-mark.svg`; sirve también como logotipo visible en cabecera y pantalla de inicio de sesión.
- `index.html`: `<link rel="icon" type="image/svg+xml">`, meta `theme-color`, imágenes decorativas del símbolo corporativo (sin duplicar texto accesible).
- `styles.css`: tokens `--prosoel-*`; nuevas reglas de cabecera, logo, botones y pestañas, alertas y fondo; adaptación móvil.
- Cache busting de recursos CSS y JS con `v=20261008-v13`.

## Archivos modificados
- `app/static/assets/prosoel-mark.svg` **nuevo**.
- `app/static/index.html` — imagen en cabecera/login, favicon y versión de recursos.
- `app/static/styles.css` — reglas de marca y colores.
- `app/static/app.js` — **sin modificar** (blob SHA original `eab5d96d7425513f44d03fdb994aada0ee2d360f`).

## Pruebas efectuadas
- GitHub API confirma que el SVG existe, contiene los dos colores, `index.html` enlaza el icono y presenta dos imágenes de marca.
- HTML mantiene las IDs críticas de la app, importación y correcciones.
- CSS equilibrado en llaves y variables de color disponibles.
- Versiones de cache HTML CSS y JS coinciden.
- Ninguna migración SQL ni modificación de Supabase ejecutada durante este restyling.
- Pendiente comprobación visual final desde navegador autenticado, sobre todo el favicon en Chrome y la presentación móvil.

## Puesta en producción
- GitHub Actions Pages se inicia automáticamente por los cambios bajo `app/static/**`.
- **Despliegue comprobado:** GitHub Actions Pages run **#94**, commit `1ad4579e`, estado `completed / success`.
- URL: https://sergioroqueh.github.io/prosoel-costes/
- Refrescar con Ctrl+F5; el navegador puede conservar el favicon antiguo en caché.

## Siguiente fase
Validar color, legibilidad y tamaño del logotipo en la cabecera. La normalización sigue siendo **supervisada**: las compras incongruentes permanecen localizables, y el usuario las depura paulatinamente al presupuestar.
