> **ACTUALIZACIÓN 2026-10-20 — EXCEPCIÓN 6063 RESUELTA.** El usuario confirmó que la referencia original A9R60240 era correcta y la descripción del pedido 25/04 estaba equivocada. Se ha corregido y auditado la línea 6063; A9R60240 tiene ya **19 compras unificadas y 7 reglas activas**, sin modificar sus datos originales. Ver [checkpoint de cierre](checkpoint-2026-10-20-a9r60240-linea-6063-correccion.md). El resto del documento describe el estado anterior a esta corrección.

---

# PROSOEL Costes — Diez referencias Schneider Acti9: NORMALIZACIÓN APLICADA

Fecha 2026-10-20. Supabase proyecto `kusbndefngttaiytcrui`. Repositorio `sergioroqueh/prosoel-costes`. **Estado: transacción confirmada y auditoría independiente superada**.

## Destinos exactos aprobados por el usuario
| Referencia | Líneas actualizadas | Reglas activas | Descripción efectiva exacta |
| --- | ---: | ---: | --- |
| `A9R60240` | 18 | 6 | Interruptor diferencial residencial - Acti9 iID - 2P - 40A - 30mA - AC - Schneider |
| `A9K17610` | 18 | 5 | Interruptor magnetotérmico - Acti9 iK60 - 1P+N - 10A - Curva C - 6kA - Schneider |
| `A9K17425` | 12 | 5 | Interruptor magnetotérmico - Acti9 iK60N - 4P - 25A - Curva C - 6000A - Schneider |
| `A9K17625` | 12 | 5 | Interruptor magnetotérmico - Acti9 iK60 - 1P+N - 25A - Curva C - 6kA - Schneider |
| `A9R84440` | 10 | 4 | Interruptor diferencial - Acti9 iID - 4P - 40A - 300mA - AC - Schneider |
| `A9R60225` | 9 | 3 | Interruptor diferencial residencial - Acti9 iID - 2P - 25A - 30mA - AC - Schneider |
| `A9F79440` | 9 | 5 | Interruptor magnetotérmico - Acti9 iC60N - 4P - 40A - Curva C - 6000A/10kA - Schneider |
| `A9R81240` | 9 | 3 | Interruptor diferencial - Acti9 iID - 2P - 40A - 30mA - AC - Schneider |
| `A9F79616` | 8 | 3 | Interruptor magnetotérmico - Acti9 iC60N - 1P+N - 16A - Curva C - 6000A/10kA - Schneider |
| `A9R81425` | 7 | 5 | Interruptor diferencial - Acti9 iID - 4P - 25A - 30mA - AC - Schneider |

**Totales: 112 líneas normalizadas, 112 eventos auditables y 44 reglas futuras activas.** Había 113 compras originales y 610 unidades, sumando **13.421,4099 €**; estas cifras y los precios unitarios permanecen intactos. Total de compras históricas por referencia y hash `md5(string_agg(to_jsonb(l)::text, '|' ORDER BY l.id))` antes y después:
- `A9R60240`: `8b00b79d3d24e759e5b8860e397e3e23`
- `A9K17610`: `69b04e08741d54c13765547698b8d234`
- `A9K17425`: `4865ce5896915dc14d5b838f097545f7`
- `A9K17625`: `1fa9bfec23142624178738cdb52d9203`
- `A9R84440`: `844a4b1777eca4a1bca6501682d441fe`
- `A9R60225`: `d41ebc69dc172be00e6a3f7305031681`
- `A9F79440`: `db90ab701bd17353adf0e4002225adf7`
- `A9R81240`: `6d2c6d3712b55e490c9fa27b9205f0b5`
- `A9F79616`: `5f2bed3900d632e56362bed53aa5ff55`
- `A9R81425`: `3d38a8db21e241ac43e3a2740d5b9e53`

## Excepción pendiente expresamente excluida del lote
Línea original y efectiva `6063`, pedido `25/04`, GRUPO RIAS, 2025-01-02:
- Referencia `A9R60240`, pero descripción **Interruptor diferencial ID-K 4P 25A 300mA** (características incompatibles con diferencial residencial iID 2P 40A 30mA).
- Cantidad 12; PVP 18,77 €, descuento `NETO`, neto 18,77 €, total 225,24 €.
- En ese mismo pedido hay líneas con referencia `A9Z06425` y la misma descripción ID-K, pero neto 58,24 €. Por ello NO basta la descripción para determinar si el error de la línea 6063 está en referencia o texto: falta confirmación humana.
- **No se cambió** la línea 6063; conserva descripción anterior y `line_review_revision=0`. **No se creó regla** para su combinación proveedor GRUPO RIAS + referencia `A9R60240` + descripción `ID-K 4P 25A 300mA`.
- En la vista para `A9R60240`: 18 compras bajo el texto nuevo y 1 compra conflictiva con texto original.

## Pruebas y cambio persistido
1. Verificados en vivo recuentos y huellas de las 10 referencias. No había overrides, reglas ni eventos previos, y la línea 6063 seguía intacta.
2. Determinadas 112 combinaciones elegibles y **44** claves únicas de futuro importador, por proveedor, referencia de origen y descripción literal normalizada.
3. Primera transacción real de simulación `BEGIN / ROLLBACK` superada: 112 overrides, 112 eventos, 44 reglas, excepción 6063 sin revisar. Una consulta independiente confirmó **0 overrides / 0 reglas / 0 eventos** tras rollback.
4. Transacción definitiva `BEGIN / COMMIT` con `FOR UPDATE`, validación de MD5, cantidades, sumas, origen intacto, ausencia de revisiones/rules previas, y controles de excepción antes/después; éxito confirmado con **112 líneas / 44 reglas / 112 eventos**.
5. 112 filas en `public.purchase_line_overrides`: revisión 1, `corrected_description` idéntica a la aprobación, `corrected_reference=NULL`, `excluded=false`.
6. 112 eventos en `public.purchase_review_events` conservan valores antes/después y motivo. 44 reglas en `private.confirmed_import_normalization_rules` con familia `PROTECCIONES SCHNEIDER ACTI9`.
7. Ejecutado `private.reconcile_review_reference` para las diez referencias.
8. Lectura independiente posterior confirmó recuentos por referencia, 10 textos efectivos aprobados, 44 reglas activas, huellas originales y datos económicos intactos.
9. Simulación retrospectiva del emparejamiento y control económico del importador sobre las 113 líneas originales: **112/112 compras elegibles con regla**, **0 alertas de precio simuladas**, **1 sin regla (ID 6063)**. Esto no representa una importación real nueva autenticada.

No se modificó el código de frontend ni importador y no se ejecutó CI remoto de GitHub Actions.

Documento anterior de preparación: `docs/checkpoint-2026-10-20-schneider-10-referencias-pendiente.md`, supersedido por este checkpoint final.
