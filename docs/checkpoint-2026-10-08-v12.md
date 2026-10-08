# PROSOEL Costes — checkpoint V12 (8 de octubre de 2026)

## Objetivo y regla técnica
Usuario solicita corregir compras erróneas dentro de Normalización y eventualmente excluir pedidos completos, **sin perder los documentos históricos**, y poder aprobar datos efectivos para catálogo. Implementada **revisión por línea** y **exclusión reversible por pedido**. No se hace DELETE físico ni se altera ningún valor almacenado en `public.orders` o `public.order_lines`.

## Estado de Supabase durante el cierre
- Al consultar a las 16:00 aprox.: **2.871 pedidos**, **11.565 líneas**. El usuario continúa importando pedidos; estos recuentos son dinámicos.
- 892 candidatos activos a revisión.
- **0 correcciones de línea persistidas**, **0 pedidos excluidos**, **0 eventos reales de corrección**; los ensayos se efectuaron en transacciones con `ROLLBACK`.
- Los pedidos 26/740 (fuente «ANULADO...») y 26/763 constan en `orders`. La captura del usuario mostrando **0 huecos** es coherente.
- **CR20** mantiene 142 compras históricas; las siete líneas cuya descripción original dice «diámetro 25» son IDs 745, 826, 1197, 1307, 2560, 3879 y 4048; no se han modificado aún realmente.

## Esquema — migraciones versionadas
- `20261008_017_purchase_review_overlays.sql`: tablas `purchase_line_overrides`, `purchase_order_overrides`, `purchase_review_events`, RLS SELECT, `order_lines_effective` con `security_invoker=true`. Contiene columnas técnicas efectivas junto a `supplier_reference_source`/`description_source` y `usable_for_prices`; fuente original intacta.
- `20261008_018_evidence_uses_effective_prices.sql`: recalcula las alertas de normalización con descripciones efectivas y solo compras utilizables.
- `20261008_019_reconcile_review_reference.sql`: recalcula únicamente claves implicadas y marca `candidate_active=false` los grupos que ya no cumplen condiciones, sin borrar decisiones históricas.
- `20261008_020_purchase_admin_review_rpc.sql`: RPC con permisos admin: corregir/excluir/restaurar línea, excluir/restaurar pedido; motivo obligatorio, revision esperada (control concurrencia), bitácora.
- `20261008_021_review_purchase_history_api.sql`: histórico de compras de una referencia, muestra líneas del código original y del efectivo, incluyendo exclusiones/reasignaciones para auditoría.
- `20261008_022_price_search_corrected_values.sql`: `search_costs_filtered`, `historical_price_history_filtered`, `reference_purchase_history`, `material_price_history`, `material_summary` consumen líneas efectivas y excluyen las no utilizables.
- `20261008_023_review_queue_active_groups.sql`: cola V3 solo grupos activos; la información previa permanece en BD.
- `20261008_024_price_history_source_values.sql`: RPC auxiliares `*_review` preservan valores fuente y efectivos para «Ver origen».
- `20261008_025_bulk_purchase_corrections.sql`: `review_purchase_lines_bulk` acepta 2–30 líneas diferentes con **idéntica referencia y descripción original**; transacción atómica, evento por cada una, revisión de versión.
- `20261008_026_import_reactivate_review_groups.sql`: nuevas importaciones respetan correcciones y reactivan grupos cuando aparecen nuevas compras.

## Interfaz V12
- Pestaña **Normalización** → seleccionar una referencia → botón **«Revisar estas N líneas»** junto a cada descripción de origen.
- «Revisar las N líneas de origen y corregir compras concretas»: tabla con pedido, proveedor, descripción original, precio neto y estado para catálogo. Excluidas y reasignadas siguen visibles, pero no se incluyen en estadísticas.
- Botón **Revisar** sobre una línea → modal con referencia y descripción originales y la operación:
  1. Corregir referencia y/o descripción **para el catálogo**;
  2. Excluir línea de los cálculos;
  3. Restaurar línea a valores originales;
  4. Excluir pedido completo de los cálculos (escribir su número como confirmación extra);
  5. Restaurar pedido completo.
- Campo de **justificación obligatorio**, casilla de conformidad y bitácora de correcciones con actor/fecha/motivo.
- Selección múltiple de líneas idénticas en origen: «Seleccionar líneas visibles» (máximo 30) → «Corregir selección». Solo corrige referencias/descripciones, no permite exclusión múltiple; cada cambio se audita.
- Fuente del Excel, cantidades y PVP/netos quedan intactos; las compras corregidas aparecen en resultados de búsqueda y estadísticas bajo su referencia/descripción **efectiva**.
- Archivos: `app/static/index.html`, `app/static/app.js`, `app/static/styles.css`. Cache assets `v=20261008-v12`.

## Tests SQL verificados (todos reversibles)
- CR20 línea #745: editar descripción de Ø25 a Ø20 → la vista efectiva y la búsqueda reflejan la corrección, mientras `order_lines.description_original` permanece en Ø25; neto idéntico, auditoría creada.
- Excluir/restaurar línea #745 → fuera de precios cuando excluida, visible en revisión, evento por cada cambio, recupera exactamente el precio anterior al restaurar.
- Excluir/restaurar pedido #176 → 3 líneas permanecen en el histórico y fuera de precios durante exclusión; restauración íntegra y 2 eventos auditados.
- Corregir las **7** líneas originales Ø25 bajo CR20, una a una y también mediante RPC masivo → alerta de diámetro desaparece del grupo, **7 registros originales Ø25 preservados**, suma de precios no cambia, 7 eventos de auditoría.
- Cuenta `user` no administra: RPC devuelve error 42501. Intento con revisión obsoleta rechazado. Usuario `anon` sin permiso EXECUTE.
- Consulta `purchase_reference_review_history('CR20')` autenticada devuelve 142 líneas reales; `reference_purchase_history_review('CR20')` devuelve 142 al no haber correcciones persistidas.
- Sintaxis del JS principal PASS. La validación visual completa por el usuario del modal y la selección masiva sigue **pendiente**. No declarar prueba E2E navegador hasta verla.

## Precauciones y continuidad
- **No dar por verificada** la corrección de las siete líneas CR20 automáticamente. Es una simulación; el responsable de presupuesto debe contrastar pedido y proveedor antes de guardar.
- Primera comprobación recomendada: abrir CR20 → descripción Ø25 → «Revisar estas 7 líneas» → abrir una sola → inspeccionar el modal SIN GUARDAR; confirmar que muestra origen y opción de corrección.
- Una vez probada la interfaz, revisar primero un caso realmente contrastado. Después puede usarse el lote para líneas idénticas.
- No aumentar permisos ni usuarios; solo los actuales.
- Si hay ajustes, conservar este checkpoint y la revisión V12 en GitHub.

## Despliegue
GitHub Pages Actions #85, commit `22f0e2e7`: `completed / success`.
