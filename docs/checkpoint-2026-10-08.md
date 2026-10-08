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
