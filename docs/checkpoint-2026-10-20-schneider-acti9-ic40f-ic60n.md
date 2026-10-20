# PROSOEL Costes — Schneider Acti9 iC40F / iC60N normalizado

**Fecha:** 2026-10-20. **Estado:** aplicado y verificado en Supabase, proyecto `kusbndefngttaiytcrui`.

## Descripciones exactas aprobadas por el usuario

| Referencia | Compras | Descripción efectiva | Reglas futuras |
| --- | ---: | --- | ---: |
| A9P53616 | 11 | Interruptor magnetotérmico DPN - Acti9 iC40F - 1P+N - 16A - Curva C - 6kA - Schneider | 4 |
| A9P53610 | 6 | Interruptor magnetotérmico DPN - Acti9 iC40F - 1P+N - 10A - Curva C - 6kA - Schneider | 3 |
| A9F79610 | 3 | Interruptor magnetotérmico - Acti9 iC60N - 1P+N - 10A - Curva C - 6000A/10kA - Schneider | 2 |
| A9F79425 | 7 | Interruptor magnetotérmico - Acti9 iC60N - 4P - 25A - Curva C - 6000A/10kA - Schneider | 3 |

**Total: 27 líneas y 12 reglas de importación futura.**

## Integridad del histórico
- Compra original A9P53616: 11 líneas, 39 unidades, importe 650,1226 €, MD5 `6cacd0762c706ab9372e050c09949544`.
- Compra original A9P53610: 6 líneas, 9 unidades, importe 147,5680 €, MD5 `d1ea7b2f4f88030d7e8af6eaadadd744`.
- Compra original A9F79610: 3 líneas, 34 unidades, importe 419,4500 €, MD5 `662a18de011ddaee636759e54c50ed27`.
- Compra original A9F79425: 7 líneas, 36 unidades, importe 2.081,4606 €, MD5 `319d7f2d74cd5836819216b91a162faa`.
- Total: **27 líneas, 118 unidades, 3.298,6012 €**.
- MD5 concatenando las 27 filas originales `public.order_lines` por ID: **`80dd29175017787d2eb8dd8ae405a1f9`**, idéntico antes y después.
- No había normalizaciones ni reglas futuras anteriores a esta operación.

## Caso económico pendiente
La línea **7665**, pedido **25/13** de **GRUPO RIAS**, referencia `A9F79425`, tiene:
- PVP **32,810000 €**;
- descuento `NETO`;
- neto unitario **92,810000 €**;
- cantidad **15**;
- total registrado **1.392,1500 €**;
- validación de precio de origen `valid` porque el neto y el total sí cuadran.

El PVP y el neto son incoherentes entre sí; y el neto 92,81 € es anómalo frente al resto de compras. **No se ha corregido el precio ni excluido el pedido** sin autorización. La simulación de la salvaguarda de importación lo señala como anomalía (1 alerta de 27).

## Aplicación y pruebas
1. Auditadas compras, descripciones, precios y excepciones de las cuatro referencias.
2. Simulación SQL real `BEGIN/ROLLBACK`: **27 overrides, 27 eventos, 12 reglas**. Se validó el hash de origen y después se comprobó que el rollback dejó 0 registros persistidos.
3. Transacción definitiva con `BEGIN/COMMIT` y bloqueos de las compras originales. Comprobadas cardinalidades por referencia, hash y totales, ausencia de normalizaciones previas y anomalía histórica sin corregir.
4. Se insertaron 27 entradas en `public.purchase_line_overrides`, revisión 1, únicamente `corrected_description` con la descripción canónica, sin cambiar la referencia.
5. Se insertaron 27 eventos en `public.purchase_review_events` para conservar antes/después.
6. Se crearon 12 entradas activas en `private.confirmed_import_normalization_rules` por proveedor, referencia de origen y descripción original verificada, familia `PROTECCIONES SCHNEIDER ACTI9`.
7. Ejecutada `private.reconcile_review_reference` para cada una de las cuatro referencias.
8. Lecturas independientes tras `COMMIT`: todas las compras con un único texto efectivo por referencia, 12 reglas activas, 27 eventos, sumas y hash de origen intactos.
9. Simulación retrospectiva de los controles de normalización y precios del importador: **27/27 coincidencias con regla, 1 alerta de precio** (línea 7665). Una compra futura nueva con precio fuera de tolerancia seguirá requiriendo revisión humana.

No se ha desplegado frontend ni modificado código del importador, no se han ejecutado GitHub Actions. Los textos nuevos o proveedores desconocidos no se normalizarán sin verificar la equivalencia; la comprobación no incluye importación real de nuevo pedido bajo sesión administrativa.
