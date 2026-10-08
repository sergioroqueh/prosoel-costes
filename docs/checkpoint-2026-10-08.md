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

### Precisión UX del selector V4 (cierre)
- Mejorada ordenación de sugerencias por coincidencia inicial de nombre > inicial de palabra > coincidencia interior.
- Prueba real de los 67 proveedores: al escribir `RI`, `GRUPO RIAS` aparece en **posición 3 de 12 coincidencias**, no enterrado en el desplegable.
- Cambios `app/static/app.js` commit `edb18f50`; HTML usa caché `v=20261008-1255`, commit `afd65d4e`.
- SQL V4: migración aplicada y versionada; referencia `A9K17425` primera bajo precio ascendente, descendente, fecha reciente y código `A9K 17425` con espacio.
- Validación posterior: 2.863 pedidos, 11.538 líneas; consulta anónima de RPC denegada.

## Actualización 2026-10-08 — Comparativa por referencia y evolución V5

### Diagnóstico a partir de la captura del usuario
- La consulta escrita fue `A9F79425`; estaba seleccionado proveedor `CADIELSA`.
- `A9F79425` **sí existe**, pero no en CADIELSA: 7 líneas / 6 pedidos / 3 proveedores (**GRUPO RIAS** 4 pedidos, **GUARCONSA** 1, **RELUZ** 1).
- `A9K17425` es otra referencia, distinta: se compró 3 veces a CADIELSA, además de compras a otros proveedores.
- El resultado aproximado `A9K17425` bajo el filtro CADIELSA NO es la referencia exacta buscada; no debe llamarse coincidencia exacta.
- No se altera el buscador aproximado por potencias (falsos positivos tolerados como resultados relacionados, nunca equivalentes confirmados).

### Funcionalidad implantada
- Función SQL `public.reference_purchase_history(p_reference,result_limit)`, migración `supabase/migrations/20261008_007_reference_comparison.sql`:
  - consulta únicamente la **referencia original** exacta ignorando espacios y mayúsculas;
  - datos por línea: pedido, fecha, proveedor, obra, cantidad, PVP, descuento, neto, importe total, validación, descripción, fichero origen;
  - exclusivamente para authenticated con `private.has_app_access()`, `security invoker` y RLS; sin disponibilidad para anon;
  - no fusiona variantes ni modifica importes.
- En el listado: si la consulta parece código y hay proveedor/año seleccionados, se avisa cuando esa referencia exacta está en otros proveedores/años. Botón «Ver referencia exacta sin filtros» limpia proveedor, año y orden, vuelve a buscar.
- En cada ficha histórica con referencia: botón «Comparar proveedores y evolución» con tabla por proveedor: pedidos distintos, último neto y fecha, mediana, mínimo y máximo, gráfico cronológico por proveedor y acceso a todas las líneas originales por «Ver origen».
- Se advierte que la misma referencia de compra no certifica identidad técnica, fabricante ni precio actual; diferencias en descripciones se notifican.
- Estadísticas y gráfico incluyen únicamente líneas con precio neto positivo y `price_validation_status='valid'`; los demás registros siguen visibles en la tabla original.
- Se marca como potencialmente atípico, sin excluirlo, el precio neto >2,2 veces o <0,45 veces la mediana cuando hay ≥4 líneas validadas.
- Versión publicada en `app/static/index.html`: caché `v=20261008-v5`. CSS y JS integrados; sin bibliotecas nuevas.

### Pruebas efectuadas
- SQL autenticado `A9F79425`: 7 líneas, 6 pedidos, 3 proveedores. `A9K17425`: 12 líneas (no mezcladas).
- Función `reference_purchase_history('A9F 79425')` también devuelve 7 líneas (variaciones de espacio), pero no cambia códigos con dígitos distintos.
- Usuario autenticado fuera de `app_users`: 0 líneas visibles.
- `anon` sin permiso EXECUTE; authenticated autorizado puede ejecutar.
- Se reconoce 1 importe atípico en `A9F79425`: 92,81 €/ud registrado en GRUPO RIAS. Validación aritmética de origen marcada `valid`, pero revisión comercial pendiente.
- Test aislado de JavaScript con filas reales: gráfico SVG generado, 6 pedidos, 3 proveedores, aviso de atípico y enlace al histórico; PASS.
- Test de aviso exacto: para CADIELSA visible; GRUPO RIAS u «Todos los proveedores» oculto; PASS.
- Sintaxis JS comprobada PASS.
- Pendiente: prueba humana de la interfaz en navegador (incluyendo comparación, Tooltip/«Ver origen» y móvil), comprobar éxito del despliegue GitHub Pages para commit `89141fb2`.
- Comprobar en pantalla `A9F79425` con CADIELSA, después «Ver referencia exacta sin filtros», elegir uno de los resultados exactos y pulsar «Comparar proveedores y evolución».

### Cierre verificado V5
- GitHub Pages workflow #36, commit `89141fb2`: **completed / success**. Frontend V5 desplegado.
- Supabase tras la migración: 2.863 pedidos, 11.538 líneas, sin cambios en compras originales.
- `public.reference_purchase_history`: `anon` sin EXECUTE; usuarios autenticados con EXECUTE y control `private.has_app_access()` + RLS. Una identidad autenticada sin estar en allowlist devuelve 0 filas.
- Auditoría de seguridad posterior sin advertencias nuevas: solo quedan aviso INFO de staging con RLS sin policy (intencional) y aviso Auth de protección contra contraseñas filtradas, anterior.
- Pruebas con filas reales de `A9F79425`: función web genera SVG, 6 pedidos, 3 proveedores, 1 precio atípico y detalle histórico; comprobación aislada PASS.
- Falta validación manual de experiencia real tras abrir la aplicación con `Ctrl+F5`; ninguna prueba de interfaz autenticada completa mediante navegador remoto.

## Actualización V6 — Vista de procedencia única y filtros alineados

### Motivo (feedback de usuario con capturas)
- La comparativa tenía "Ver las 7 líneas originales y su procedencia" y, debajo, otra sección "Procedencia" con las mismas compras; la vista resultaba repetitiva.
- El campo editable de proveedor no quedaba alineado verticalmente con Año y Ordenar por.

### Correcciones realizadas
- `app/static/app.js`: unificada la procedencia en **una sola tabla** `#provenanceRows`, siempre debajo del gráfico.
  - Al abrir la ficha muestra las líneas de la variante seleccionada y respeta los filtros de búsqueda.
  - Al pulsar "Comparar proveedores y evolución", el gráfico y la tabla resumen conservan su sitio, mientras que la única tabla "Procedencia" pasa a mostrar **todas las compras de la referencia original**, incluidas otras descripciones, proveedores o años.
  - Se actualizan `#provenanceCount` y `#provenanceScope` para advertir expresamente que, tras la comparación, se muestra el histórico global del código de compra y que no se asume equivalencia técnica.
  - Se conserva cada enlace "Ver origen" de cada pedido y se reconectan sus eventos tras reemplazar la tabla.
  - Eliminados el acordeón duplicado, la función `comparisonHistoryHtml` y sus handlers de procedencia redundantes.
- `app/static/index.html`: los filtros Proveedor/Año/Ordenar por tienen ahora exactamente la misma estructura (`.filter-field` + `label` + control). Caché de CSS/JS actualizada a `v=20261008-v6`.
- `app/static/styles.css`: etiquetas de 16 px de altura y campos de 40 px de altura, espaciados y alineados uniformemente en escritorio y móvil; eliminado CSS del acordeón duplicado; leyenda aclaratoria bajo Procedencia.
- **No se han modificado tablas de Supabase, normalización, referencias, precios, descuentos ni permisos**.

### Verificaciones
- Sintaxis JavaScript PASS, 3 filtros presentes con `filter-field` y CSS unificado.
- Prueba de interacción aislada con las siete líneas reales `A9F79425`: al comparar hay 1 gráfico, no existe acordeón duplicado, la tabla única muestra 7 líneas, contador `7 líneas`, leyenda de alcance global y `wireOriginButtons()` se ejecuta. PASS.
- Pendiente validación visual final en navegador real del usuario (incluida alineación, expansión "Ver origen" y vista móvil).
- Última publicación de Pages: comprobar que la ejecución del commit HTML `77ef6f5d` termina con éxito (o commit posterior en `app/static`).

## Actualización V7 — normalización conservadora: cola de revisión real

### Alcance
- Se inicia la fase de catálogo normalizado, **sin aplicar fusiones automáticas** ni aprobar equivalencias por parecido textual.
- Inventario del histórico: 3.474 referencias de compra no vacías y distintas tras compactar espacios, de las cuales **890** cumplen criterios para revisión:
  - 714 aparecen en más de un proveedor.
  - 502 tienen distintas descripciones originales (las categorías se solapan).
  - 6 presentan más de una potencia explícita (W) bajo el mismo código.
- Al clasificar los 890 grupos para la cola: 6 `technical_conflict`, 496 `variant_descriptions`, 388 `cross_supplier` (clases mutuamente excluyentes: cada referencia tiene la prioridad de su riesgo).

### Base de datos
- Nueva migración `supabase/migrations/20261008_008_normalization_review_queue.sql`.
- Tabla `public.normalization_review_groups` guarda propuestas de revisión y métricas (referencia original, descripciones, proveedores, pedidos, potencia, prioridad).
- Función `public.normalization_review_queue`: búsqueda por código o descripción, filtro de riesgo, paginación y total de candidatos.
- Solo lectura desde la web. RLS y `private.has_app_access()` activos; `anon` no ejecuta la función. La identidad autenticada fuera de la allowlist obtiene 0 resultados.
- Datos históricos originales intactos; no se crean materiales ni se asigna `material_id`.

### Interfaz
- Nueva pestaña `Normalización` junto a `Consultar precios`, en `app/static/index.html`.
- Búsqueda por referencia o descripción, filtros por conflicto técnico/descripción distinta/código en varios proveedores, y paginación de 30 en 30.
- Cada candidato muestra las descripciones observadas, número de proveedores y pedidos, precios históricos por proveedor, validación, posibles atípicos, y acceso a las líneas de origen.
- Botón para buscar la referencia en la pestaña de precios.
- CSS adaptable a móvil en `app/static/styles.css`, lógica `app/static/app.js`.
- No existe botón de "aprobar" todavía; se añadirá con decisión explícita y evidencias suficientes para evitar fusiones indebidas.
- Se ha preservado el buscador, comparativa V5 y Procedencia única V6.
- Cache CSS/JS `v=20261008-v7`.

### Pruebas
- SQL autenticado: 890 candidatos; 6 riesgos `technical_conflict`, 30 resultados por página; filtro exacto `CLP160APMB4C` y `A9F79425` correcto.
- `CLP160APMB4C`: hay dos líneas en un pedido, con descripciones técnicas incompatibles como un solo material: **38 W / 1685 mm** vs. **44 W / 1965 mm**. Advertencia mostrada (prueba JS con datos reales).
- `A9F79425`: devuelve 7 líneas de 6 pedidos de 3 proveedores; no se mezcla con `A9K17425`.
- Prueba de render del detalle con datos reales: advertencia de conflicto, ambas potencias presentes y botón "Ver origen" en cada compra. PASS.
- Sintaxis de JavaScript PASS; HTML y CSS con selectores correctos; permisos y recuentos conservados.
- Auditor Supabase: sin avisos nuevos; persiste aviso previo de protección de contraseñas filtradas desactivada.
- **Pendiente:** prueba visual final desde navegador real y definición del flujo de aprobación controlada.

### Cierre del despliegue V7
- GitHub Pages Actions run #43, commit `0dec3cac`: `completed / success`; la nueva pestaña de Normalización está publicada.
- Punto de control guardado sin alterar el histórico; SQL de la cola en GitHub y Supabase. Primera prueba recomendada: filtrar **Conflictos de potencia**, abrir `CLP160APMB4C` y comprobar por separado las luminarias de 38 W y 44 W.
- Próxima fase tras validación visual: decisiones de normalización supervisadas y auditables, con evidencia, revisión individual y sin combinaciones por nombre parecido.

## Actualización V8 — confirmación manual desde la aplicación (2026-10-08)

### Solicitud y criterio
- El usuario preguntó si puede **confirmar** las equivalencias desde la pestaña Normalización. En V7 solo había consulta.
- V8 añade decisiones **supervisadas y auditadas** directamente en la app; no es una fusión real de productos ni una asignación automática de `material_id`.
- Cada decisión está ligada al grupo de referencia observada (no todavía a una identidad técnica definitiva por cada variante). Un grupo puede contener productos distintos y debe tratarse así.

### Base de datos / seguridad
- Migración `supabase/migrations/20261008_009_review_decisions_admin_audit.sql` aplicada y versionada.
- Tabla `public.normalization_review_events` con historial inmutable de cambios: referencia, estado anterior/nuevo, nota anterior/nueva, usuario real de la sesión y fecha.
- Trigger `private.audit_normalization_review` asigna `reviewed_at`/`reviewed_by`, valida motivo y crea la bitácora automáticamente. Trigger en esquema `private`, `SECURITY DEFINER` con `search_path=''`, sin permiso EXECUTE para `anon/authenticated/public`.
- Privilegios a la vista: `authenticated` tiene UPDATE **solo** de `review_status` y `review_note`, no en campos técnicos ni históricos. Política RLS UPDATE permite únicamente a la cuenta `admin` ya existente y activa, verificada con JWT y `app_users`.
- Usuarios existentes sin cambio: cuenta Sergio rol `admin`; otra cuenta rol `user` puede consultar pero no confirmar.
- Estados disponibles: `pending` (volver a pendiente), `needs_evidence`, `distinct_products` (contiene artículos distintos, no fusionar), `ready_for_mapping` (identidad verificada según revisión, pero **todavía no consolidada**).
- La decisión `ready_for_mapping` está prohibida si un código agrupa distintas potencias explícitas. Justificación mínima 12/25 caracteres según acción; nota máxima 2.000 caracteres.
- Auditoría solo con SELECT para usuarios autorizados; `anon` sin permisos. No se ha añadido ningún usuario.

### Web
- `app/static/app.js` muestra formulario a `admin` y vista solo lectura al otro usuario.
- Campo de estado, nota técnica, casilla explícita de comprobación, botón **Guardar revisión**, errores/success y historial reciente de cambios.
- La escritura utiliza bloqueo optimista por `review_status` y `reviewed_at` para no sobrescribir una revisión cambiada concurrentemente.
- Se cargan los metadatos actualizados y hasta 12 entradas de auditoría al abrir la referencia; las tarjetas muestran el estado actual.
- `app/static/styles.css`: formato de controles, auditoría y mensajes para móvil/escritorio.
- `app/static/index.html`: nueva versión de caché `v=20261008-v8`.

### Pruebas
- Esquema SQL: en una transacción revertida, Sergio/admin cambió `CLP160APMB4C` a `distinct_products`; se generó 1 evento, se atribuyó el responsable y se conservaron 0 materiales y 0 líneas vinculadas. La transacción se revirtió.
- Intento como rol `user`: **0 filas actualizadas** por RLS.
- `authenticated` no tiene UPDATE de `supplier_count` ni INSERT en auditoría; `anon` no tiene UPDATE.
- JS de render real con datos `CLP160APMB4C`: cuenta admin ve botón y casilla; opción de vincular deshabilitada por coexistir 38 W y 44 W; cuenta user no ve formulario. PASS.
- Prueba simulada del guardado: se envía una única actualización, se refresca listado y detalle, y se muestra mensaje de registro en bitácora. PASS.
- Recuento tras pruebas: 2.863 pedidos, 11.538 líneas, 890 candidatos, **0 decisiones persistidas, 0 eventos reales y 0 materiales canónicos**.
- Auditor Supabase sin avisos nuevos: persisten los previos de staging RLS sin policy (intencional) y protección Auth de contraseñas filtradas.

### Pendiente al cerrar la fase
- Confirmar GitHub Pages deployment de V8.
- Prueba humana: abrir Normalización / `CLP160APMB4C`, seleccionar `Contiene productos distintos: NO fusionar el grupo`, añadir justificación (38 W 1685 mm vs 44 W 1965 mm), marcar confirmación y pulsar Guardar. Ver mensaje, estado e historial.
- Próximo módulo: consolidación de variantes y materiales canónicos **solo después de revisión técnica evidenciada y explícita**, nunca por simple coincidencia de códigos.

### Despliegue V8 confirmado
- GitHub Pages Actions run #47, commit `9c078b70`: `completed / success`.
- V8 disponible en `https://sergioroqueh.github.io/prosoel-costes/` tras actualizar con `Ctrl+F5`.
- Última comprobación: base de datos conserva 890 revisiones en estado `pending`, 0 decisiones persistidas, 0 entradas de auditoría, sin creación de materiales.

## Actualización V9 — altas diarias de pedidos desde la web + ayuda de normalización

### Objetivo del usuario
- Evitar tener que subir pedidos nuevos a ChatGPT ni instalar Git/Python en el ordenador del trabajo.
- Hacer más viable la revisión de 890 grupos de referencias: asistencia en la justificación, sin decisiones automáticas ni inventar equivalencias.

### Importación web (desarrollada y desplegada)
- Nueva pestaña **Importar pedido**, visible únicamente para la cuenta autorizada con rol `admin`.
- `app/static/order_import.js`: lectura local de un XLSX con APIs del navegador (ZIP + Deflate-raw + XML + SHA256 WebCrypto), sin dependencias externas de Excel.
- Reconoce hoja `HOJA PEDIDO`, plantilla actual de descuento único y variante antigua de dos descuentos.
- Extrae proveedor, obra, fecha, referencia/número, líneas, descuentos, PVP, neto, total, clasificación conservadora y hash SHA-256 del archivo original.
- Vista previa con total declarado frente a suma de líneas, primeras 50 líneas, advertencias y confirmación explícita.
- Antes de confirmar: consulta en Supabase si existe el mismo SHA-256 o el mismo año+número+subnúmero con un archivo distinto. En ambos casos bloquea la importación.
- Durante la confirmación: RPC `public.import_new_prosoel_order`; operación transaccional y protegida por rol admin, registra el fichero en `order_import_audit`, crea proveedor/obra/variante si procede, pedido y líneas originales. No almacena el XLSX.
- La cola de Normalización se actualiza **solo** para las referencias afectadas; ningún material canónico se crea y no se sobrescriben decisiones de revisión.
- Ficheros SQL versionados:
  - `supabase/migrations/20261008_010_browser_order_import.sql`;
  - `supabase/migrations/20261008_011_import_refresh_review_queue.sql`.
- Frontend en `app/static/index.html`, `app/static/app.js`, `app/static/styles.css`, parser `app/static/order_import.js`.
- Caché de frontend actualizado a `v=20261008-v9b`.
- Guía de uso: `docs/importacion-pedidos-nuevos.md`.

### Normalización asistida
- Se ha incorporado la sección **Ayuda preliminar de PROSOEL Costes**, generada con las líneas históricas:
  - potencia distinta bajo mismo código → sugerir `distinct_products`;
  - solo diferencias de espacios/tildes → advertir que pueden ser variantes tipográficas;
  - código/descripción repetidos entre proveedores → requerir confirmación de fabricante.
- Botón **Preparar justificación para revisar**: introduce propuesta en el formulario pero **no marca la conformidad ni ejecuta Guardar**.
- Filtro de candidatos por estado (todos/pendiente/necesita evidencia/productos distintos/listo para vincular).
- RPC de lectura `public.normalization_review_queue_v2`, migración `supabase/migrations/20261008_012_review_queue_status_filter.sql`; sin cambios en historial ni permisos de revisión.

### Pruebas realizadas
- SQL bajo transacción revertida: alta de pedido simulado con 2 líneas y conflicto de potencias; se generaron pedido, líneas, auditoría y grupo `technical_conflict` pendiente; después rollback.
- Duplicado exacto: SQL devuelve `duplicate` y 0 líneas para un SHA del histórico.
- Número repetido con otro SHA: SQL devuelve `number_conflict` y 0 líneas.
- Cuenta no administradora: RPC de escritura rechaza el acceso.
- Lector JS: comprobadas las cabeceras de plantilla actual y doble descuento, fecha Excel 2024/2026, conversión decimal, normalización de referencia y clasificación RAEE/portes (pruebas de funciones con celdas de muestra).
- Sugerencias de revisión: casos 38/44 W, diferencia tipográfica y referencia repetida en proveedores: estados/textos orientativos correctos.
- Sintaxis del parser y del JS principal PASS; controles HTML y CSS presentes.
- Supabase tras pruebas: **2.863 pedidos**, **11.538 líneas**, **890 candidatos**, 0 revisiones aprobadas, 0 pedidos diarios grabados y 0 materiales canónicos. Las transacciones de ensayo no persisten.
- `anon` carece de ejecución sobre RPC de importación y cola V2. Avisos del Security Advisor sin cambios: staging de solo lectura administrativa sin policies y protección de contraseñas filtradas pendiente de valorar.
- GitHub Pages: workflow #58 para los cambios frontend `0abe1607` completado con `success`.

### Primera prueba recomendada y límites
- **Importante: todavía no se ha ejecutado una prueba completa de la lectura nativa XLSX en la sesión de navegador del usuario.**
- Para hacerlo sin escribir datos: abrir PROSOEL Costes → pestaña `Importar pedido` → elegir un XLSX **ya importado** del histórico (no ZIP) → debe aparecer su vista previa y `Archivo duplicado`, sin permitir confirmar.
- Si pasa, probar un XLSX nuevo guardado y recalculado desde Excel; revisar la vista previa y confirmarlo.
- No proclamar importación real de archivo nuevo hasta que el usuario confirme y se verifiquen los recuentos.
- Se admiten XLSX individuales hasta 15 MB, ≤250 líneas, solo plantillas reconocidas, navegador moderno.
- Mantener siempre los dos usuarios existentes. Sin autoresolución de identidades técnicas, ni sobrescritura de precios históricos.
