# Checkpoint 2026-10-08 — PROSOEL Costes

## Estado funcional

- Supabase project: `prosoel-costes`
- Project ref: `kusbndefngttaiytcrui`
- GitHub Pages funcionando con login Supabase.
- Usuarios actuales: exactamente los 2 usuarios ya configurados.
- **No crear nuevos usuarios** salvo petición expresa de PROSOEL.
- RLS y allowlist `public.app_users` activos.
- Frontend estático conectado directamente a Supabase.
- FastAPI queda como código de referencia/fallback; no se desplegará por ahora.

## Incidencia UI corregida

El login quedaba visible encima de la aplicación después de autenticar.

Correcciones aplicadas:

- `.hidden { display:none !important }`;
- atributo HTML `hidden` gestionado también desde JavaScript;
- cache bust de CSS/JS en GitHub Pages.

## Por qué el buscador devolvía 0 resultados

La estructura de Supabase está creada, pero el histórico **todavía no está cargado**.

Estado comprobado directamente en Supabase:

- `app_users`: 2 filas
- `suppliers`: 0
- `projects`: 0
- `materials`: 0
- `orders`: 0
- `order_lines`: 0
- resto de tablas de catálogo/auditoría: 0

Por tanto el buscador funciona contra una base vacía. No es un fallo del motor de búsqueda.

## Próximo paso obligatorio

**Carga inicial del histórico 2024-2026 en Supabase.**

Fuentes locales disponibles:

- `/mnt/data/2024.zip` — 1.104 XLSX
- `/mnt/data/2025.zip` — 957 XLSX
- `/mnt/data/2026.zip` — 802 XLSX
- total: 2.863 pedidos
- total esperado tras lector corregido: 11.538 líneas

La primera carga debe preservar:

- pedido/numeración;
- proveedor;
- fecha;
- obra;
- cantidad;
- referencia de compra;
- descripción original;
- PVP;
- descuento;
- neto;
- total;
- nombre del fichero;
- SHA-256.

Los Excel originales no se almacenan en Supabase.

## Después de la carga histórica

1. probar búsqueda sobre referencias y descripciones reales;
2. verificar contador de apariciones por número de pedidos;
3. comprobar "¿De dónde sale este precio?";
4. materializar progresivamente las decisiones de normalización ya auditadas;
5. mantener RAEE, ecotasas, portes y transporte fuera del catálogo/KPI;
6. continuar normalización desde la cobertura V11 (~51,35 % del universo material).

## Requisito de producto prioritario

Todo precio mostrado debe conservar trazabilidad completa hasta su línea histórica:

pedido, proveedor, fecha, obra, cantidad, referencia, descripción original,
PVP, descuento, neto, total y archivo de origen.

## Actualización 2026-10-08 — histórico completo y búsqueda V2

- Carga Supabase verificada: 2.863 pedidos (2024: 1.104, 2025: 957, 2026: 802), 11.538 líneas (4.440 / 3.724 / 3.374).
- Tablas actuales: 67 proveedores, 345 obras, 5.108 variantes comerciales, 0 materiales consolidados (fase siguiente).
- 0 registros pendientes en `import_stage_orders` y 0 líneas sin `commercial_item_id`.
- 233 líneas clasificados como tasas/portes/servicios y excluidas de catálogo.
- Validaciones: 186 pedidos y 180 líneas requieren revisión. Conservar importes originales.
- Se probaron precios y trazabilidad desde la interfaz GitHub Pages (captura del usuario, ejemplo DOWNLIGHT 12 W).
- Aplicada y versionada la migración `supabase/migrations/20261008_003_search_ranking_v2.sql`:
  - prioridad fuerte a coincidencia exacta de referencia;
  - prioridad a potencia W coincidente (12 W / 12W), penalización por potencia distinta expresada;
  - ligera bonificación por coincidencia de descripción sin espacios;
  - preservación de resultados históricos, contadores de pedidos y datos de precio.
- Confirmación de SQL en Supabase: función `public.search_costs` contiene ranking de referencias y potencia.
- Pendiente: prueba manual en navegador de `DOWNLIGHT 12 W`, `403608`, `DOWNLIGHT 18 W`; evaluar falsos positivos y rendimiento.
- Pendiente: filtros por fabricante/proveedor/año, formato de descuentos para la interfaz, gráfico histórico y catálogo normalizado.
- Regla permanente: solo 2 usuarios autorizados, sin altas nuevas; no almacenar archivos originales en GitHub/Supabase; conservar trazabilidad.
- Nota: el bloque anterior sobre base vacía queda supersedido por esta actualización.

## Actualización 2026-10-08 — buscador y filtros V3

### Cambios implantados
- Migración `supabase/migrations/20261008_004_search_filters_v3.sql` aplicada en PostgreSQL y versionada en GitHub.
- RPC `public.search_costs_filtered` (SECURITY INVOKER, solo usuarios autenticados autorizados):
  filtro por proveedor (`p_supplier_id`), año (`p_year`), orden (`p_sort`), paginación (`p_offset`), `total_count` real antes de limitar página.
- Coincidencia exacta de referencia, potencia con unidad W, búsqueda aproximada y exclusión de RAEE/portes/servicios preservadas.
- RPC `public.historical_price_history_filtered` devuelve exclusivamente la combinación **referencia original + descripción original** seleccionada; incluye filtros de proveedor y año. Corrige una discordancia anterior: al pulsar 1 pedido podían mostrarse 2 por compartir referencia con otra descripción.
- Interfaz GitHub Pages actualizada con desplegables **Proveedor**, **Año del pedido** y **Ordenar por** (relevancia, recientes, frecuencia, precio ascendente/descendente); botón limpiar; carga incremental de 30 resultados; contador "Mostrando X de Y".
- Descuentos legibles: ejemplo valor histórico `0.44` se ve como `44 %`; `NETO` se muestra como `Neto`; siempre se conserva el dato original en tooltip/procedencia.
- Cambios de autenticación, contraseña y allowlist no modificados. Sin añadir usuarios.

### Pruebas realizadas
- Prueba SQL en sesión autenticada: búsqueda `DOWNLIGHT 12W` devuelve 33 grupos (30 + 3); el filtro año 2024 devuelve 17, año 2026 devuelve 11; filtro GRUPO RIAS devuelve 24.
- `10101240` como búsqueda exacta devuelve esa referencia primera; ficha de variante `DOWNLIGHT EMPOTRAR DISCO 12W 4000K\\nBLANCO /E`: 1 línea, año 2024 y GRUPO RIAS; ninguna línea en 2026.
- Ordenar por menor precio, mayor frecuencia y última fecha: consulta respondida correctamente.
- Los 67 proveedores están disponibles para usuarios autorizados.
- Sintaxis JavaScript verificada (PASS). Pendiente smoke-test humano en navegador una vez desplegado Pages.

### Referencia 10101240 y normalización
- Dos descripciones observadas con el mismo código `10101240`, 7,58 €; una tiene salto de línea antes de BLANCO, la otra concatena `4000KBLANCO`.
- **No fusionar automáticamente** y no asumir referencia oficial de fabricante. La unión técnica irá por normalización validada.
- Precio histórico ≠ precio vigente. No se ha alterado el histórico ni creado materiales consolidados.

### Próximo paso
1. Confirmar despliegue de Pages y revisar la nueva pantalla de filtros.
2. Probar cambio de proveedor/año y trazabilidad de línea seleccionada.
3. Mejorar facetas técnicas (potencia/IP/CCT) cuando haya datos normalizados y fiables.
4. Auditar casos de precio y descuentos incoherentes sin sobrescribir originales.

### Cierre V3 — despliegue y seguridad
- GitHub Actions Pages: run 21, commit `b1ca8bb9`, estado `success`. La web desplegada incluye los filtros.
- Privilegios comprobados: `anon` no ejecuta las RPC nuevas; `authenticated` sí, con RLS + `private.has_app_access()`.
- Migración `supabase/migrations/20261008_005_restrict_rls_event_trigger.sql`: revocada la capacidad de ejecutar `public.rls_auto_enable()` desde `PUBLIC`, `anon` y `authenticated` (antes advertencia de seguridad). El event trigger `ensure_rls` permanece activo. Auditor posterior sin las advertencias de función accesible.
- Resto de avisos Supabase: `import_stage_orders` tiene RLS sin policies deliberadamente, ya que la carga es administrativa y no permite uso desde la web; protección de contraseñas filtradas desactivada (revisar ajuste Auth si el plan lo permite).
- Prueba de ordenación: referencia exacta `10101240` primera; precio ascendente y fecha reciente responden correctamente. La ficha del año 2024 devuelve 1 compra y en 2026 cero.
- Próximo punto de prueba manual: abrir `https://sergioroqueh.github.io/prosoel-costes/`, pulsar `Ctrl+F5`, buscar `DOWNLIGHT 12W`, filtrar `GRUPO RIAS`, elegir 2024, ordenar y abrir procedencia. Si el cambio no aparece, verificar caché y última ejecución de GitHub Pages.

## Actualización 2026-10-08 — Proveedor editable y búsqueda exacta V4

### Cambios en producción
- Sustituido el `select` de proveedores (67 entradas) por campo editable accesible con lista desplegable:
  - placeholder predeterminado **Todos los proveedores** (identificador `null`).
  - escritura parcial en cualquier posición del nombre; por ejemplo `RI` permite localizar `GRUPO RIAS`.
  - sugerencias con coincidencias, navegación con flechas, Enter para elegir, Escape para cerrar y clic/táctil.
  - opción para volver a todos vaciando el campo o mediante «Limpiar filtros».
  - el proveedor solo cambia al elegirlo; teclear letras no aplica filtros ambiguos.
  - CSS adaptable a móvil, sin librerías ni permisos adicionales.
- Cambios en `app/static/index.html`, `app/static/styles.css` y `app/static/app.js`.
- Caché de JS/CSS actualizada a `v=20261008-1235`.
- GitHub Pages Actions run 24 (commit `340aa89f`) **success**, web desplegada.
- Migración `supabase/migrations/20261008_006_exact_reference_priority.sql` aplicada y guardada:
  - una coincidencia exacta de referencia de compra se muestra primero incluso ordenando por precio o fecha.
  - se ignoran solo los espacios en la comparación del código, sin cambiar puntuación/dígitos ni la referencia original.
  - **no se ha endurecido la clasificación de potencia**: los 50 W pueden aparecer al buscar 18 W si el usuario ordena por precio y también coinciden de forma aproximada.
  - no se han fusionado variantes ni modificado precios.

### Validaciones
- Código JavaScript: comprobación de sintaxis PASS.
- IDs de interfaz `supplierFilter`, `supplierCombobox`, `supplierSuggestions`, `yearFilter`, `sortFilter` presentes.
- SQL autenticado de `search_costs_filtered`:
  - `A9K17425` sale en primer lugar en precio ascendente, descendente y por fecha reciente.
  - `A9K 17425` con espacio devuelve `A9K17425` primero.
  - `DOWNLIGHT 18W` + menor precio mantiene la coincidencia aproximada ECOALUM 50 W al inicio (comportamiento aceptado, sin declarar equivalencia técnica).
- Recuentos preservados: 2.863 pedidos, 11.538 líneas.
- Pendiente: prueba manual del combobox en navegador real desde la sesión del usuario. Abrir web, Ctrl+F5, buscar `A9K 17425` / `DOWNLIGHT 18W`, filtrar proveedor escribiendo `RI`, seleccionar `GRUPO RIAS`, volver a Todos; confirmar interacción en escritorio y móvil.

### Próxima fase
- Comparativa histórica entre proveedores y evolución de precios con trazabilidad y advertencias sobre equivalencia técnica.
- Mantener solamente los dos usuarios existentes, no exponer datos de pedidos en GitHub y no alterar valores históricos.

### Ajuste posterior V4 — teclado y móvil
- Corregida la selección de sugerencias del proveedor para ratón/táctil: se mantiene abierto al cambiar foco dentro del componente y se cierra al salir.
- Versión de caché JS/CSS actualizada a `v=20261008-1245`.
- La última versión es la que incorpora commits `b2f7c2dc` (autocompletado) y `5bcc7689` (caché).
- Esperar confirmación de GitHub Pages run 26, después prueba humana en el navegador.
