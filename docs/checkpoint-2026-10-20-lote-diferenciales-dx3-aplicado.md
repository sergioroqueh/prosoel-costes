# PROSOEL Costes — lote diferenciales DX3 Legrand aplicado

**Fecha:** 2026-10-20. **Supabase:** `kusbndefngttaiytcrui`. **Estado:** FINALIZADO Y VERIFICADO.

## Objetivo
El usuario autorizó normalizar todas las referencias DX3 de las capturas, ajustando serie, polos, corriente nominal, sensibilidad y tipo, y confirmó expresamente corregir la referencia equivocada del pedido 25/871.

Patrón canónico: `Diferencial DX3 [2P/4P] - [25A/40A/63A] - [30mA/300mA] - Tipo [AC/A/F (HPI)] - Legrand`.

### Resultado: 19 referencias, 81 líneas
| Ref. efectiva | Compras | Descripción efectiva |
| --- | ---: | --- |
| `411504` | 1 | Diferencial DX3 2P - 25A - 30mA - Tipo AC - Legrand |
| `411505` | 5 | Diferencial DX3 2P - 40A - 30mA - Tipo AC - Legrand |
| `411506` | 1 | Diferencial DX3 2P - 63A - 30mA - Tipo AC - Legrand |
| `411524` | 9 | Diferencial DX3 2P - 25A - 300mA - Tipo AC - Legrand |
| `411525` | 2 | Diferencial DX3 2P - 40A - 300mA - Tipo AC - Legrand |
| `411555` | 2 | Diferencial DX3 2P - 40A - 30mA - Tipo A - Legrand |
| `411569` | 1 | Diferencial DX3 2P - 25A - 300mA - Tipo A - Legrand |
| `411590` | 1 | Diferencial DX3 2P - 25A - 30mA - Tipo F (HPI) - Legrand |
| `411591` | 17 | Diferencial DX3 2P - 40A - 30mA - Tipo F (HPI) - Legrand |
| `411592` | 1 | Diferencial DX3 2P - 63A - 30mA - Tipo F (HPI) - Legrand |
| `411660` | 5 | Diferencial DX3 4P - 25A - 30mA - Tipo AC - Legrand |
| `411661` | 4 | Diferencial DX3 4P - 40A - 30mA - Tipo AC - Legrand |
| `411664` | 10 | Diferencial DX3 4P - 25A - 300mA - Tipo AC - Legrand |
| `411665` | 8 | Diferencial DX3 4P - 40A - 300mA - Tipo AC - Legrand |
| `411666` | 7 | Diferencial DX3 4P - 63A - 300mA - Tipo AC - Legrand |
| `411675` | 2 | Diferencial DX3 4P - 40A - 30mA - Tipo A - Legrand |
| `411684` | 1 | Diferencial DX3 4P - 25A - 300mA - Tipo A - Legrand |
| `411694` | 1 | Diferencial DX3 4P - 25A - 30mA - Tipo F (HPI) - Legrand |
| `411695` | 3 | Diferencial DX3 4P - 40A - 30mA - Tipo F (HPI) - Legrand |

La variante HPI aparece en el texto efectivo como «Tipo F (HPI)» para reflejar denominación moderna y término histórico. Los tipos A, AC y F no se consolidan entre sí.

## Conflicto resuelto
- Línea original `public.order_lines.id=5729`, pedido `25/871`, GUARCONSA, 2025-11-19.
- Referencia fuente `411661`, descripción fuente `Diferencial DX3 4/25/300AC`, cantidad 1 y neto 70,196 €.
- El pedido `25/868` incluía una compra análoga de ref. `411664`, mismo precio y descripción (línea 5694).
- Confirmación expresa usuario: corregir referencia efectiva **411661 → 411664**.
- Después: **411661 = 4 compras** (DX3 4P 40A 30mA AC); **411664 = 10 compras** (DX3 4P 25A 300mA AC).
- `supplier_reference_source` sigue siendo `411661` en la línea 5729; `corrected_reference` es `411664`, y su descripción efectiva apunta a la canónica de `411664`.
- Regla futura específica **ID 352** solo para GUARCONSA + referencia origen 411661 + descripción origen `DIFERENCIAL DX3 4/25/300AC`, con destino 411664; **NO** aplica a otras descripciones `411661`.

## Protección y auditoría de base
- 81 filas en `public.purchase_line_overrides` (revisión 1) sin borrar ni sobrescribir registros fuente.
- 81 eventos nuevos en `public.purchase_review_events` con valores originales y efectivos.
- 38 reglas únicas activas en `private.confirmed_import_normalization_rules`, agrupadas por proveedor + referencia original + texto original, incluyendo la corrección específica de 5729.
- Se invocó `private.reconcile_review_reference` para las 19 referencias.
- Se verificó la ausencia de revisiones y reglas previas antes del lote.
- Fuente original `public.order_lines`: **81 líneas**, **188 unidades**, **13.958,8831 €**; comprobada antes y después mediante MD5 concatenando filas en orden ID: `d54a96793fdb41755a50c465c2239444`.
- Primera simulación SQL falló por una agrupación incorrecta de las futuras reglas, se revirtió por entero. Segunda simulación SQL `BEGIN/ROLLBACK` pasó con 81 overrides, 81 eventos, 38 reglas y la excepción corregida. Verificado el estado original tras rollback.
- Transacción final con `BEGIN/COMMIT`, bloqueos de las fuentes, precondiciones de hash/importe/recuento/ausencia de revisiones y verificaciones efectivas previas al commit. Resultado: 81 overrides, 38 reglas, 81 auditorías, ref efectiva de 5729 = 411664.
- Comprobaciones SQL **independientes tras COMMIT**: 19 grupos de descripción única (una por referencia), conteos individuales correctos, tipos separados, corrección 5729 trazable, reglas activas y huella intacta.
- Simulación retrospectiva del emparejamiento y salvaguarda de precios del importador sobre las 81 compras: **81/81 reconocidas, 0 sin regla y 0 alertas de precio**. Una importación futura real bajo sesión autenticada todavía no se ha ejecutado.

## Alcance y límites
- Sin cambio alguno en `public.orders` ni en `public.order_lines`: PVP, descuento, neto, total, cantidad, proveedor y fecha originales preservados.
- Sin modificación al código de importación ya desplegado; su protección por proveedor + referencia + descripción fuente, y control de precios, sigue vigente.
- Otros textos o proveedores no verificados siguen pendientes; no se extrapolan equivalencias a ciegas.
- No se ha ejecutado CI ni GitHub Actions por el trabajo SQL. Solo se guarda este documento de checkpoint.

**Sustituye al checkpoint PREVIO de auditoría** `docs/checkpoint-2026-10-20-lote-diferenciales-dx3-pendiente.md`.
