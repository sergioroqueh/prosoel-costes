# PROSOEL Costes — Schneider Acti9 normalizado (2026-10-20)

**Estado: aplicado en Supabase y verificado.** Proyecto `kusbndefngttaiytcrui`.

## Descripciones exactas confirmadas por el usuario

- `A9K17616`: **Interruptor magnetotérmico - Acti9 iK60 - 1P+N - 16A - Curva C - 6kA - Schneider**.
- `A9R61240`: **Interruptor diferencial - Acti9 iID - 2P - 40A - 30mA - A-SI - Schneider**.

## Auditoría

- A9K17616: 26 compras en 26 pedidos, cinco proveedores, 209 unidades, importes originales 1.321,0670 €, netos 5,383–8,239 €.
- A9R61240: 26 compras en 26 pedidos, cinco proveedores, 122 unidades, importes originales 9.045,6570 €, netos 47,932–113,509 €.
- **Total:** 52 líneas, 331 unidades y **10.366,7240 €** de importes registrados.
- Reglas de coincidencia futuras únicas: **7 por referencia**, 14 en total.
- MD5 de las 52 filas originales de `public.order_lines` ordenadas por ID, antes y después: `54be0545842a3b593b2c94df18bcdae5`.

## Ejecución

1. Comprobados precios, proveedores, referencias, pedidos y variantes; sin revisiones previas ni datos invalidados.
2. Simulación SQL `BEGIN/ROLLBACK` correcta: 52 overrides, 52 eventos y 14 reglas. Consulta independiente confirmó que el rollback no persistió nada.
3. Transacción definitiva `BEGIN/COMMIT` con bloqueo de filas fuente, validación de hash, recuentos e importes originales, detección de conflictos y verificación antes del commit.
4. Guardadas 52 revisiones de `public.purchase_line_overrides`, 52 eventos de `public.purchase_review_events`, 14 reglas activas en `private.confirmed_import_normalization_rules`, familia `PROTECCIONES SCHNEIDER ACTI9`. Ejecutada reconciliación para ambas referencias.
5. Consultas posteriores confirmaron 26 compras por código bajo exactamente la descripción aprobada, siete reglas por código y hash original inalterado. La cola `normalization_review_groups` muestra `description_count=1` para cada referencia (aunque `candidate_active` siga true por otros motivos).

## Simulación de futuras importaciones

Las 52 líneas fuente coinciden con una regla (**52/52**). La simulación retrospectiva del control de precios detectó **una alerta**, línea 10718, pedido 26/193 GUARCONSA, `A9R61240`, neto **99,26 €/ud**. La línea queda unificada por confirmación de identidad, pero el precio original no se modificó ni se certificó económicamente.

Las reglas nuevas actúan solo con coincidencia de proveedor + referencia + descripción original normalizada en mayúsculas y espacios; continúan los filtros de precio y las revisiones humanas de variantes nuevas. No hubo modificación del frontend ni del código del importador, ni uso de GitHub Actions para el SQL. La simulación no sustituye una importación futura real autenticada.
