# Aprende REBT R1 — 17/11/2026

Piloto privado para la cuenta Sergio (`compras@prosoel.es`, admin activo).

- Menú Herramientas y tarjeta de lección diaria en Consultar precios.
- 20 microlecciones, pregunta, aplicación profesional y fuente BOE.
- Selección diaria por fecha Europe/Madrid; el ciclo se repite tras 20 días hasta ampliarlo.
- Búsqueda, favoritos y completadas; progreso personal RLS en Supabase.
- Contenido de los JS es público por GitHub Pages. La UI es solo para Sergio y su progreso sí es privado.
- Las guías del Ministerio son no vinculantes.
- No se toca ningún pedido, material ni histórico de compras.

**R2:** migración aplicada al Supabase de PROSOEL; pruebas SQL de acceso Sergio/denegación Israel-Ignacio en transacciones revertidas y CI Playwright en escritorio/móvil superadas. **R3:** enlace directo a la ITC, lección antes de biblioteca en móvil y progreso de portada cargado al inicio. Pendiente validación manual con inicio de sesión real tras despliegue.

Fuentes: https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099 y https://industria.gob.es/Calidad-Industrial/seguridadindustrial/instalacionesindustriales/baja-tension/Paginas/guia-tecnica-aplicacion.aspx

## R4 · Revisión de interfaz y ampliación (17/11/2026)

- La tarjeta de inicio pierde el fondo destacado y se presenta como enlace discreto, con menor altura y peso visual.
- Catálogo ampliado de 20 a **88 microlecciones**, cubriendo **46 ITC**; no se modifica el identificador de las 20 anteriores ni el progreso.
- Filtro adicional por tema y búsqueda; mantiene los filtros de favoritas, pendientes y completadas.
- Solucionado el salto de navegación: conservación de desplazamiento de biblioteca, posición de documento y foco de búsqueda al actualizar la lección o registrar respuestas.
- En móvil, al seleccionar desde biblioteca se enfoca el contenido seleccionado; los filtros no deben provocar salto a la primera entrada.
- Fuentes: RD 842/2002 en BOE consolidado y guías no vinculantes del Ministerio. Cada microlección se identifica por ITC; revisión editorial continua antes de ampliar.

Pruebas R4: CI de código, regresión de navegación y Chromium escritorio/móvil. No cambiar permisos de Sergio ni tablas de pedidos.
