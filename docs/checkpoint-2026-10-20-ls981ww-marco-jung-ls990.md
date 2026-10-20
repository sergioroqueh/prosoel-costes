# PROSOEL Costes — Unificación LS981WW / Marco simple JUNG LS990 blanco alpino

**Fecha:** 20/10/2026. **Proyecto Supabase:** `kusbndefngttaiytcrui`.

## Confirmación expresa del usuario
Unificar las dos descripciones de compra con referencia **`LS981WW`** bajo el texto canónico exacto:

**Marco simple 1 elemento JUNG LS981WW - Blanco alpino - Serie LS990**

No se corrigen características, referencias, PVP, descuentos, cantidades, importes ni archivos originales; la operación afecta exclusivamente a la descripción **efectiva**.

## Auditoría histórica
- **37 líneas en 37 pedidos**, 3 proveedores: GRUPO JARAMA (8), GUARCONSA (22), GRUPO RIAS (7).
- **36 compras** con texto de origen `Marco simple 81x81mm LS 990 duroplástico brillante blanco alpino para montaje horizontal o vertical`.
- **1 compra** con texto de origen `Marco 1 elemento blanco alpino` (GRUPO JARAMA).
- 2024-01-04 a 2026-09-16; **628 unidades**, total registrado **960,7750 €**, netos **1,3950–3,8450 €/ud**.
- Antes de modificar, ninguna compra estaba revisada o excluida, todas tenían estado de precio `valid`. No había reglas activas o inactivas para esta referencia.
- Hash MD5 de las 37 filas **originales** de `public.order_lines` concatenadas por ID: `52d164c21388f9361d4bd2c4619d8220`.

### Precio que requiere seguimiento
Línea **9715**, pedido **26/710**, GRUPO JARAMA, fecha 2026-09-16:
- Fuente: `Marco 1 elemento blanco alpino`.
- Cantidad 14, PVP **7,690000 €**, descuento `0.5` y neto **3,845000 €/ud**, total 53,8300 €.
- El resto del histórico se sitúa habitualmente cerca de 1,50 €/ud; se **conserva íntegro el precio original**, sin presumir error.
- Si entrara nuevamente una compra con ese neto, la salvaguarda de precios actual del importador bloquearía la normalización automática y solicitaría revisión.

## Cambios aplicados y verificados
1. Simulación real `BEGIN/ROLLBACK` y comprobación posterior de que no dejó revisiones, auditorías ni reglas persistidas.
2. Transacción definitiva `BEGIN/COMMIT` con bloqueo, comprobación de huella de origen, recuentos, total, unidades, estado de precio, ausencia de revisiones y reglas previas y verificación de la compra 26/710.
3. **37 registros** `public.purchase_line_overrides` de revisión 1, descripción efectiva canónica, `corrected_reference=NULL`, `excluded=false`, actor `asistente-prosoel-costes`.
4. **37 eventos** `public.purchase_review_events` que conservan estados previos y siguientes.
5. **4 reglas activas** `private.confirmed_import_normalization_rules` (IDs **249, 250, 251, 252**), familia `MECANISMOS JUNG LS990`, agrupadas por proveedor + referencia fuente + descripción fuente exacta con espacios normalizados:
   - GRUPO JARAMA: descripción larga (7) y corta (1).
   - GRUPO RIAS: descripción larga (7).
   - GUARCONSA: descripción larga (22).
6. Ejecutado `private.reconcile_review_reference('LS981WW')`.
7. Consultas independientes posteriores verifican **una descripción efectiva en 37 pedidos**, 4 reglas activas, 37 eventos, 628 unidades, importe 960,7750 €, hash de fuente idéntico.
8. Simulación de la coincidencia y las salvaguardas de precios usando las 37 compras como muestra: **37/37 emparejan regla** y **1/37 dispara alerta de precio** (línea 9715). La alerta no impide la unificación histórica autorizada, pero mantiene la protección para pedidos futuros similares.

## Alcance de futuras importaciones
El importador ya desplegado aplica automáticamente la descripción unificada solo si el proveedor, la referencia original y la descripción original coinciden con una de estas cuatro reglas **y** supera los controles económicos. No se generaliza el código a nuevos proveedores, descripciones no verificadas ni precios atípicos. No se ha probado con un pedido nuevo real autenticado. No se han modificado el frontend ni GitHub Actions.

### Estado después
- 2.897 pedidos y 11.661 líneas originales.
- 1.549 líneas con revisión efectiva.
- 212 reglas futuras activas.
