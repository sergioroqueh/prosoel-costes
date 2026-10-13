# PROSOEL Costes — Seis referencias consolidadas y reglas futuras

**Fecha:** 2026-10-13  
**Supabase:** `kusbndefngttaiytcrui`  
**Operación:** Confirmación expresa del usuario de unificar las descripciones de seis referencias y reutilizar las equivalencias en el importador de pedidos nuevos.

## Referencias y textos canónicos exactos

| Referencia original/efectiva | Descripción efectiva confirmada | Compras históricas | Correcciones nuevas | Ya correctas | Reglas futuras |
|---|---|---:|---:|---:|---:|
| `069571L` | Base de corriente modular Plexo IP55, 2P+T, embornamiento con tornillos, gris | 16 | 10 | 6 | 6 |
| `069683L` | Marco de empotrar Plexo modular, 2 elementos horizontales o verticales, gris | 7 | 3 | 4 | 2 |
| `069511L` | Conmutador Plexo modular, 10AX, gris | 10 | 6 | 4 | 3 |
| `069733L` | Base de corriente monobloc superficie Plexo IP55, 16A, 2P+T, embornamiento con tornillos, gris | 27 | 22 | 5 | 5 |
| `3012` | Caja estanca con 10 conos – AcquaBOX - IP55 - FAMATEL | 25 | 25 | 0 | 3 |
| `RZ1K3X2,5R` | Manguera 3X2,5 mm² Flexible Libre de halógenos RZ1-K (AS) 1KV | 38 | 38 | 0 | 6 |
| **Total** | | **123** | **104** | **19** | **25** |

**Importante:** se mantuvieron las seis referencias efectivas y originales. No hubo correcciones de códigos, solo de descripciones efectivas.

## Ejecución

1. Se consultaron en `public.order_lines_effective` las 123 líneas de las seis referencias y sus variantes de texto, proveedores, revisiones y precios. Todas tenían `line_review_revision=0`.
2. Se detectaron cuatro compras con particularidades de precio que **no se modificaron**: línea 4427 (`069733L`, precio no disponible), línea 1235 (`3012`, precio 0), línea 10554 (`3012`, precio no disponible) y línea 11106 (`RZ1K3X2,5R`, precio no disponible). No se inventaron precios.
3. Se preparó una transacción con bloqueo de registros de origen, validación de referencia exacta, exclusiones, recuento **123** y necesidad de corrección **104**.
4. **Simulación `BEGIN … ROLLBACK` completada:** 104 versiones de corrección, 104 eventos de auditoría, 25 reglas con ámbito por proveedor y **una sola descripción efectiva por referencia**. Se comprobó que el rollback no guardó ninguna corrección.
5. **Transacción definitiva `BEGIN … COMMIT` completada y verificada** con las mismas precondiciones. Se insertaron:
   - 104 filas en `public.purchase_line_overrides`, versión 1, `corrected_reference = NULL` y `corrected_description` canónica, sin exclusión.
   - 104 filas en `public.purchase_review_events` con antes/después, motivo y actor `asistente-prosoel-costes`.
   - 25 filas activas en `private.confirmed_import_normalization_rules`, agrupadas por **proveedor + referencia de origen + descripción de origen con espacios normalizados**, usando la familia `PLEXO`, `ACQUABOX` o `RZ1-K` según corresponda.
6. Se invocó `private.reconcile_review_reference` para las seis referencias y se verificó el resultado efectivo en las 123 compras.
7. Se comprobó mediante hash, antes y después de la transacción, que **ninguna fila original de `public.order_lines` ni su pedido en `public.orders` cambió**. En particular, conservar PVP, descuentos, precio neto, importe, cantidad, proveedor, fecha, archivo y descripción original.
8. Las 19 compras que ya utilizaban exactamente la descripción solicitada permanecieron sin revisión artificial.

### Totales históricos preservados (no redondear ni sumar ficticiamente)

- `069511L`: 206,8385 €.
- `069571L`: 1.532,4912 €.
- `069683L`: 202,2849 €.
- `069733L`: 1.167,9020 €.
- `3012`: 646,0550 €.
- `RZ1K3X2,5R`: 10.500,7900 €.
- **Suma de importes registrados:** 14.256,3616 €.

## Protección de futuras importaciones

Estas 25 nuevas reglas se suman a las 146 reglas H07Z1-K existentes, para un total de **171 reglas activas**.

Se reutiliza el motor previamente desplegado `private.apply_confirmed_import_rules` mediante `public.import_new_prosoel_order`, sin alterar código de la web. El importador:
- Guarda inalterados los datos fuente.
- Busca regla exacta por proveedor, referencia y texto de origen normalizado en espacios.
- Verifica el precio contra el histórico comparable, sin sustituirlo.
- Aplica la descripción efectiva mediante la función oficial de revisión con control de versión y evento auditado.
- Conserva compras sin regla o con precio anómalo para revisión, sin inventar equivalencias.

### Simulación con el pedido recién importado `26/784`

Se ha consultado el pedido real `26/784` (ID 2879), de HERMAFER BOADILLA, importado previamente por `compras@prosoel.es`. Tras la corrección histórica:
- Sus seis líneas de referencias solicitadas aparecen con sus descripciones canónicas en `public.order_lines_effective`, cada una con revisión 1, y su fuente original accesible.
- Una simulación de un pedido equivalente entrante, excluyendo el propio pedido del precio comparable, indica **6 coincidencias correctas y 0 alertas de precio**.
- Las tres líneas restantes no coinciden con estas reglas y permanecen sin revisión.
- Se mantienen precio, descuentos, cantidad y el importe total del pedido: **1.058,4662 €**.

## Matices operativos

- La cola `normalization_review_groups` presenta `candidate_active=true` para las seis referencias por contener compras de varios proveedores, aunque `description_count=1` para todas. Esta clasificación se debe a la regla actual que considera comparaciones entre proveedores y **no indica que las descripciones sigan diferentes**. No se alteró manualmente esta cola para evitar inconsistencias.
- La web aún puede mostrar el mensaje **«sin ficha unificada»**, porque esta actuación normaliza el historial de compras y prepara reglas, pero no crea una ficha de `public.materials`.
- No se ha realizado después de este cambio una importación completamente nueva bajo JWT de usuario; la comprobación de reglas se efectuó de forma retrospectiva, mediante SQL de simulación. La prueba real seguirá siendo el siguiente Excel.
- Las reglas no deben extenderse por simple coincidencia parcial de código a otras familias ni a nuevos proveedores; toda nueva pareja de origen requiere confirmación.
- No se modificó ninguna tabla de precios originales, ni archivos Excel, ni código de interfaz.
