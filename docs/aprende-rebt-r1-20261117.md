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

## R5 · Nuevo método: norma por norma

- Índice del BOE con **29 artículos y 52 ITC**; se conserva el archivo de **88 repasos** y su progreso independiente.
- La lectura oficial es la acción principal: siempre enlazamos a la fuente primaria vigente y exigimos confirmación de consulta íntegra antes de registrar avance.
- 29 artículos tienen fichas breves de orientación verificadas; 17 unidades incluyen además un **extracto literal** contrastado con el BOE (no se presenta como texto completo). Las notas de comprensión son opcionales y separadas.
- Las 52 ITC tienen enlace al texto oficial; no se atribuye cobertura completa a fichas internas inexistentes. Es fase inicial del desglose por apartados, tablas y excepciones.
- Orden secuencial y progreso persistente en tabla RLS existente, sin reanudar ciclo de tests automáticamente.
- Fuente: https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099; última actualización publicada en la versión consultada: 03/09/2025.
