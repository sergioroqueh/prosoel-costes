# Handoff web - 2026-10-08

## Estado actual

- Supabase project creado y configurado.
- Auth funciona con los usuarios ya existentes.
- **No crear usuarios adicionales** salvo instrucción explícita de PROSOEL.
- GitHub Pages funciona como frontend estático.
- Supabase se usa para Auth + PostgreSQL + RPC.
- FastAPI queda como código de referencia/fallback, no como arquitectura de producción actual.
- Frontend conectado a Supabase con Project URL + publishable key.
- RLS/allowlist configurados para usuarios autorizados.
- Búsqueda prevista por descripción aproximada, referencia, fabricante y modelo.
- La ficha de precio debe conservar como requisito principal:
  "¿De dónde sale este precio?" -> pedido, proveedor, fecha, obra, cantidad,
  PVP, descuento, neto, total, descripción y archivo de origen.
- Cada material debe mostrar número de **pedidos distintos** en los que aparece.

## Incidencia visual corregida

El login seguía visible encima de la aplicación después de autenticar porque
`.auth-shell { display:grid }` estaba sobrescribiendo `.hidden` por orden CSS.

Corregido con una regla específica que fuerza el ocultado de la vista de login.

## Por qué la búsqueda devuelve 0 resultados ahora

La estructura, Auth, RLS, RPC y frontend están montados, pero **el histórico real
todavía no se ha cargado en la PostgreSQL de Supabase**.

Por tanto `search_costs` funciona sobre tablas todavía vacías o sin el histórico
materializado.

La siguiente etapa es la carga inicial:

- 2.863 pedidos.
- 11.538 líneas históricas.
- después materializar las decisiones de normalización ya auditadas.

## Normalización acumulada antes de la carga web

Última simulación documentada:

- universo material: 11.270 líneas;
- 5.787 líneas resueltas sin conflicto;
- 51,35 % del universo material;
- 49 conflictos detectados;
- RAEE/ecotasas/portes/transporte fuera del KPI y del catálogo técnico.

## Siguiente acción

1. comprobar recuentos actuales en Supabase;
2. cargar el histórico 2024/2025/2026;
3. validar que el contador llega al último pedido cargado;
4. probar búsquedas reales;
5. materializar catálogo/aliases/variantes de la auditoría;
6. continuar normalización en paralelo.

No almacenar XLSX originales en Supabase.
