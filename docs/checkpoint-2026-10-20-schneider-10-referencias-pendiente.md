> **ESTADO ACTUALIZADO: LOTE APLICADO Y VERIFICADO (2026-10-20).** Consultar [checkpoint definitivo](checkpoint-2026-10-20-schneider-10-referencias-aplicado.md). Ya se han normalizado las 112 compras elegibles, registrado 112 eventos y activado 44 reglas de importación. La excepción 6063 sigue pendiente. Lo que sigue era la auditoría PREVIA, no el estado actual.

---

# PROSOEL - Schneider Acti9 (10 referencias) - PENDIENTE DE APLICAR

Fecha 2026-10-20. Supabase: `kusbndefngttaiytcrui`.

**ESTADO: NO SE HAN APLICADO CAMBIOS DE ESTE LOTE.** Las operaciones SQL fueron bloqueadas por los controles del servicio antes de la simulacion. No afirmar que se normalizó o se crearon reglas.

## Descripciones confirmadas expresamente por el usuario

| Referencia | Lineas elegibles | Descripcion exacta |
| --- | ---: | --- |
| A9R60240 | 18 | Interruptor diferencial residencial - Acti9 iID - 2P - 40A - 30mA - AC - Schneider |
| A9K17610 | 18 | Interruptor magnetotérmico - Acti9 iK60 - 1P+N - 10A - Curva C - 6kA - Schneider |
| A9K17425 | 12 | Interruptor magnetotérmico - Acti9 iK60N - 4P - 25A - Curva C - 6000A - Schneider |
| A9K17625 | 12 | Interruptor magnetotérmico - Acti9 iK60 - 1P+N - 25A - Curva C - 6kA - Schneider |
| A9R84440 | 10 | Interruptor diferencial - Acti9 iID - 4P - 40A - 300mA - AC - Schneider |
| A9R60225 | 9 | Interruptor diferencial residencial - Acti9 iID - 2P - 25A - 30mA - AC - Schneider |
| A9F79440 | 9 | Interruptor magnetotérmico - Acti9 iC60N - 4P - 40A - Curva C - 6000A/10kA - Schneider |
| A9R81240 | 9 | Interruptor diferencial - Acti9 iID - 2P - 40A - 30mA - AC - Schneider |
| A9F79616 | 8 | Interruptor magnetotérmico - Acti9 iC60N - 1P+N - 16A - Curva C - 6000A/10kA - Schneider |
| A9R81425 | 7 | Interruptor diferencial - Acti9 iID - 4P - 25A - 30mA - AC - Schneider |

Los números indicados suman **112 compras aptas**, en un histórico de **113 compras, 610 unidades y 13.421,4099 EUR registrados**. Se identificaron 10 referencias y se consultaron variantes descriptivas, todas sin revisión previa y sin reglas de importación preexistentes en las lecturas iniciales. Antes de aplicar, volver a consultar el estado para evitar doble normalización por concurrentes.

## Excepción técnica NO autorizada a convertir
Línea `public.order_lines.id=6063`, pedido **25/04**, fecha 2025-01-02, GRUPO RIAS: referencia fuente `A9R60240`, descripción fuente `Interruptor diferencial ID-K 4P 25A 300mA`, cantidad 12, PVP y neto 18,77 EUR, importe 225,24 EUR. Contradice referencia A9R60240, usualmente iID residencial 2P 40A 30mA AC. El mismo pedido tiene dos líneas fuente de ref. `A9Z06425` (IDs 6061 y 6064), descripción ID-K 4P 25A 300mA, pero neto 58,24 EUR. **No se puede concluir si la línea 6063 tiene equivocada la referencia o la descripción.** No homogeneizarla ni remapear referencia sin confirmación humana adicional. El usuario confirmó los 10 textos por referencia, no corrigió explícitamente esta línea contradictoria. Se excluye el ID 6063 del cambio histórico y de la generación de reglas futuras.

## Huellas históricas de las 113 líneas originales por referencia
- A9R60240: 8b00b79d3d24e759e5b8860e397e3e23
- A9K17610: 69b04e08741d54c13765547698b8d234
- A9K17425: 4865ce5896915dc14d5b838f097545f7
- A9K17625: 1fa9bfec23142624178738cdb52d9203
- A9R84440: 844a4b1777eca4a1bca6501682d441fe
- A9R60225: d41ebc69dc172be00e6a3f7305031681
- A9F79440: db90ab701bd17353adf0e4002225adf7
- A9R81240: 6d2c6d3712b55e490c9fa27b9205f0b5
- A9F79616: 5f2bed3900d632e56362bed53aa5ff55
- A9R81425: 3d38a8db21e241ac43e3a2740d5b9e53

## Próxima ejecución segura
- Volver a comprobar cantidades, hash por referencia, ausencia de overrides o reglas y excepción intacta.
- Ejecutar `BEGIN/ROLLBACK` con 112 overrides efectivos, 112 eventos de auditoría, y reglas deduplicadas por proveedor + referencia fuente + descripción fuente normalizada. Se estiman 44 combinaciones únicas, **verificar antes de COMMIT**.
- Confirmar rollback limpio; ejecutar transacción de aplicación sólo si sus aserciones pasan; revisar 10 referencias por separado y asegurar que la línea 6063 sigue intacta.
- Preservar todos los valores económicos de `public.order_lines`; `private.reconcile_review_reference` para cada referencia; simular nuevas coincidencias y filtros de precios; documentar resultados reales.
- No ejecutar CI ni modificar frontend/importador, salvo que surjan fallos.
