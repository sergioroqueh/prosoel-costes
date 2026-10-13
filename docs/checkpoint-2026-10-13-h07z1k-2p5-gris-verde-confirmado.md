# PROSOEL Costes — GRIS VERDE confirmado como GRIS, H07Z1-K 2,5 mm²

**Fecha:** 13/10/2026  
**Supabase:** `kusbndefngttaiytcrui`  
**Motivo:** el usuario confirma expresamente que las tres compras de cable descritas como «GRIS VERDE» son cable unipolar GRIS de 2,5 mm².

## Corrección confirmada

- Referencia fuente: `H07Z1K2,5GRI`.
- Referencia efectiva nueva: **`H07Z1K2,5GR`**.
- Descripción fuente: `MTS.CABLE FLEXIBLE L.H. H07Z1K 2,5 MM GRIS VERDE ROLLO`.
- Descripción efectiva nueva, exactamente: **Hilo Flexible Libre Halógenos H07Z1-K 2.5mm2 GRIS**.

Se identificaron las 3 compras siguientes, sin overrides ni revisiones anteriores:

| ID línea | Pedido | Cantidad (m) | PVP €/m | Dto. | Neto €/m | Importe (€) |
| --- | --- | ---: | ---: | --- | ---: | ---: |
| 4838 | 25/336 | 800 | 0,263000 | NETO | 0,263000 | 210,40 |
| 6676 | 25/570 | 800 | 0,263000 | NETO | 0,263000 | 210,40 |
| 8111 | 25/503 | 400 | 0,263000 | NETO | 0,263000 | 105,20 |
| **TOTAL** | **3 pedidos** | **2.000** | | | | **526,00** |

Proveedor **GRUPO RIAS** en las tres compras. Los pedidos completos contenían referencias independientes de amarillo/verde de 2,5 mm² y de otros colores, lo que refuerza que «GRIS VERDE» era una errata en estas líneas.

## Procedimiento y seguridad

1. Consulta inicial a `public.order_lines_effective` para comprobar identidad, proveedor, referencia, descripciones, precios, descuentos, cantidades y versiones.
2. Verificación de ausencia de correcciones previas para los IDs **4838, 6676 y 8111**.
3. Simulación transaccional con `BEGIN` y `ROLLBACK`: 3 filas en `public.purchase_line_overrides`, 3 eventos en `public.purchase_review_events`, destino 31 compras, origen 0.
4. Verificación explícita después del `ROLLBACK`: **0** overrides persistidos.
5. Transacción definitiva en `COMMIT` con precondiciones de integridad y bloqueo de registros, versión 1, actor `asistente-prosoel-costes`, motivos específicos y eventos con estado anterior/siguiente.
6. Reconciliación de las referencias antigua y nueva mediante `private.reconcile_review_reference`.
7. Comprobación hash de los registros originales de `public.order_lines` y metadatos completos de `public.orders` antes/después; idénticos, sin tocar las fuentes Excel.
8. Verificación posterior: las tres líneas muestran referencia efectiva `H07Z1K2,5GR`, descripción efectiva exacta, referencia y descripción fuente originales intactas, precios y cantidades iguales y revisión 1. La referencia de origen `H07Z1K2,5GRI` queda sin compras efectivas.
9. El grupo destino registra **31 compras / 31 pedidos**, **una única descripción efectiva**, **33.800 m**, **9.959,20 €** y precios netos históricos entre **0,245000 y 0,312000 €/m**.

## Observación de la cola

La fila de `public.normalization_review_groups` para `H07Z1K2,5GR` tiene `candidate_active=false`, pero aún devuelve valores agregados `purchase_count=27` y `description_count=2`. Esos contadores parecen metadatos no recalculados de la cola y **no coinciden** con `public.order_lines_effective` (31 compras, 1 descripción), que es la fuente fiable usada para validar esta corrección. No se alteraron manualmente ni se modificó la aplicación.

La verificación visual de la web autenticada y su sección Procedencia no ha sido posible desde el conector SQL sin JWT de usuario.

## Alcance

Solo revisiones de los campos efectivos y evento de auditoría; **no se modificaron precios ni datos importados, ni código de la aplicación**.
