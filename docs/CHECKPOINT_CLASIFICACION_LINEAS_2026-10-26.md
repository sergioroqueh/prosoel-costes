# PROSOEL-Costes — clasificación conservadora v1 (26/10/2026)

## Objetivo
Distinguir tipo de línea y familia técnica en el buscador de pedidos y obras sin modificar precios, descuentos, cantidad, referencias ni la clasificación original en Supabase.

## Estado comprobado del histórico
- `public.order_lines`: 11.727 líneas (lectura 26/10).
- `line_kind=unknown` con revisión pendiente: 11.476 líneas.
- Clasificados previamente: RAEE/ecotasa 145, portes 70, servicio 20, posible servicio 16.
- `public.orders`: 2.913 pedidos.
- Se inspeccionó una muestra de 259 líneas reales, incluyendo líneas recientes, aleatorias y previamente clasificadas. Se detectó un falso positivo («Manipulación de tira LED») y se añadió bloqueo por lenguaje de prestación antes de publicar. También se distinguió «Conector RJ45» (datos) de la familia genérica de conexiones.

## Arquitectura entregada
1. `app/static/line_classification.js`: motor puro y sin efectos secundarios.
2. Categoría original explícita (RAEE, portes, servicio, posible servicio) tiene siempre prioridad.
3. Un solo patrón técnico inequívoco y sin indicios de servicio / transporte => «Material probable» + familia técnica.
4. Vocabulario mixto o ausencia de evidencias => «Pendiente de revisión», sin clasificar arbitrariamente.
5. Familias: puesta a tierra, aparamenta/protecciones, envolventes/cajas, telecom/datos, cables/conductores, iluminación, mecanismos/tomas, canalizaciones/tubos, bornas/conexiones, fijaciones/consumibles.
6. Vista de `26/819` y pedidos desplegados por `LYMA`: dos columnas «Clasificación sugerida» + «Familia», explicación en title/leyenda y recuento de materiales propuestos y pendientes.
7. Las reglas se aplican en lectura a pedidos históricos y a futuros pedidos importados. No toca el importador ni cambia `line_kind` persistido; toda sugerencia se recalcula al visualizar y queda pendiente de aceptación humana para consolidar.
8. Sin tablas, vistas, RPC, triggers o migraciones nuevas. Se respetan Auth+RLS existentes; frontend con publishable key.

## Pruebas y límites
- Pruebas JS aisladas realizadas sobre código de GitHub: 17/17 heurísticas/preservación; 12/12 integración de vista con datos simulados; 27/27 comprobaciones previas al ajuste; comprobación de sintaxis de app.js y módulos.
- Pruebas versionadas: `tests/line_classification.test.mjs` (6 casos con múltiples subcasos), más tests del buscador anteriores. Para reproducir localmente: `node --test tests/order_lookup.test.mjs tests/project_lookup.test.mjs tests/line_classification.test.mjs`.
- No se ejecutó Node en un entorno con checkout del repositorio por falta de red desde el contenedor; las comprobaciones anteriores sí se ejecutaron en sandbox JS sobre el código descargado de GitHub.
- No se probó sesión real autenticada con navegador; prueba visual final por usuario.
- Sin identificación forzada de todo el histórico: la prioridad es minimizar falsos positivos.
- TODO posterior opcional: revisión humana y consolidación auditada en una tabla de decisiones separada, si se aprueba, con trazabilidad de cambios.

## Seguridad y publicación
- GitHub `main` no modificado. Ningún GitHub Actions propio requerido ni ejecutado para código/pruebas.
- Publicar exclusivamente el árbol `app/static` en `gh-pages` raíz mediante commit fast-forward.
- No ejecutar `UPDATE`, `INSERT`, `DELETE` ni DDL en Supabase.
