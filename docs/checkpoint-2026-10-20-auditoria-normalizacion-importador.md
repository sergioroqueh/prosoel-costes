# PROSOEL Costes — Auditoría de normalización e importador (2026-10-20)

## Prioridad acordada con el usuario
Mantener 2024–2026, **no importar 2023**. Mejorar calidad de las descripciones por referencia, continuar las unificaciones supervisadas y registrar reglas de importación para que los próximos pedidos mantengan los textos canónicos de las equivalencias aprobadas.

## Estado auditado (consultas SQL en Supabase `kusbndefngttaiytcrui`)
- `public.orders`: **2897 pedidos**.
- `public.order_lines`: **11661 líneas**.
- `public.purchase_line_overrides`: **1463 líneas revisadas**.
- `private.confirmed_import_normalization_rules`: **203 reglas activas**, para **123 referencias fuente diferentes**.
- `private.import_normalization_results`: 1 decisión registrada, `price_alert`.
- En 2026-10-20 se normalizó la referencia `027250106`, 2 compras, 2 reglas futuras (IDs 233 y 234), preservando originales.

### Comportamiento actual
`private.apply_confirmed_import_rules` enlazado a `public.import_new_prosoel_order` solo aplica reglas que coinciden con:
1. Proveedor exacto.
2. Referencia original exacta (normalizada en espacios/mayúsculas).
3. Descripción original exacta (normalizada en espacios/mayúsculas).

El motor comprueba extremos de precio e importa sin sobreescribir valores económicos. Si una combinación nueva no coincide, no la transforma en una equivalencia nueva. **No implementar una normalización universal por referencia sin un mecanismo de lista positiva aprobada**: algunas referencias están reutilizadas en materiales físicamente distintos.

## Casos de seguimiento prioritario

### `403628`: protección de precio
- 29 compras con la descripción efectiva `Magnetotérmico TX3 - 4P - 6kA - 400V - 25A - curva C - 4 módulos - Legrand`.
- Compra pendiente: línea **11597**, pedido **26/790**, **GUARCONSA**, fecha **2026-10-15**, referencia `403628`, texto fuente `Magnetotérmico TX3 6kA-C 4P 25A`, neto **78,560000 €**.
- En `private.import_normalization_results`: decisión **`price_alert`**, regla #220, mediana comparable histórica **30,7776 €**, 5 compras comparables. Original conservado.
- **No forzar normalización ni corregir precio** sin revisar el pedido y confirmar el valor con el usuario/proveedor.

### `403585`: código reutilizado
- Parte del histórico corresponde a magnetotérmico TX3 1P+N 10 A.
- Pero línea **2615**, pedido **24/231**, `GUARCONSA`: `Accesorio cofret interbloqueo Eurolocks n°850`, neto **9,1595 €**.
- Y línea **4722**, pedido **25/335**, `FANDUCT S.L.`: `MT2. CONDUCTO CHAPA 0.6 mm. CON METU 20 INTEGRAL`, neto **20,4520 €**.
- No aplicar una regla amplia `403585 -> TX3` a todas las líneas. Revisar referencias equivocadas por separado.

### Candidatos con varias descripciones efectivas
- `60087919`: 49 líneas en cola; varias descripciones de cable U/UTP CAT6 y LSZH/Dca, posibles equivalencias técnicas por comprobar.
- `LS981WW`: 37 líneas; una variante `Marco 1 elemento blanco alpino` frente a descripción larga habitual; revisar.
- `403033`: 35 líneas; textos `Diferencial TX3 2/40/30AC` y variante `(no accesoriable)`; revisar características antes de unificar.
- `403585`: 46 líneas; contiene inconsistencias de identidad confirmadas, no tratar en lote sin separaciones.

### Alerta sobre la cola de normalización
`normalization_review_groups` puede conservar contadores anteriores a las revisiones efectivas: por ejemplo `403586` figuraba con 4 descripciones en la cola, pero la consulta actual de `order_lines_effective` devuelve **67/67** compras bajo el mismo texto confirmado. No tomar el contador de cola como prueba de que una unificación sigue pendiente; usar primero la vista efectiva.

## Método a seguir en cada unificación confirmada
1. Consultar todas las compras fuente por referencia y proveedor; detectar si el mismo código se ha reutilizado para productos diferentes.
2. Verificar identidad técnica, precios, cantidades, proveedor, fechas, pedidos y revisiones existentes.
3. Validar cambios con simulación transaccional `BEGIN/ROLLBACK`, recuentos y huella de las líneas originales.
4. Confirmar descripción de destino con el usuario si aún no está aprobada; no inventar equivalencias.
5. Aplicar solo `purchase_line_overrides` + eventos auditados, sin alterar `public.orders` ni `public.order_lines`.
6. Crear reglas futuras por proveedor + referencia + cada texto de origen realmente verificado; conservar el control de precios.
7. Reconstruir la cola y comprobar el histórico efectivo, las reglas, las auditorías y huellas originales.
8. Documentar el checkpoint. Ante texto no cubierto, fabricante distinto o precio muy discordante, revisión humana.

## Límites de esta auditoría
El análisis es **solo de lectura**: no se han creado nuevas normalizaciones, reglas SQL ni modificaciones al importador en esta ronda. Las 203 reglas son el estado actual, no el número de referencias globalmente certificadas. Para nuevas importaciones el motor sigue reconociendo únicamente las variantes confirmadas.
