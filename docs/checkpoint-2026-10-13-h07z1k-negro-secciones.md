# PROSOEL Costes — Corrección de sección y unificación H07Z1-K negro

**Fecha:** 2026-10-13.  
**Proyecto Supabase:** `kusbndefngttaiytcrui`.  
**Origen:** revisión de cola PROSOEL de `H07Z1K1,5NGR`, tras confirmación expresa del usuario.

## Decisión validada

La referencia observada `H07Z1K1,5NGR` agrupa originalmente 94 compras y un caso con sección equivocada en la referencia.

1. **93 compras de 1,5 mm²:** conservar referencia efectiva `H07Z1K1,5NGR` y unificar descripción efectiva exactamente como **Hilo Flexible Libre Halógenos H07Z1-K 1.5mm2 NEGRO**.
2. **Una compra de 2,5 mm²:** trasladar únicamente la referencia efectiva a `H07Z1K2,5NGR` y conservar la descripción original **CABLE H07Z1-K ZEROH FLEX 1X2,5 NEGRO**.

**No homogeneizar ni modificar ningún precio**, PVP, descuento, cantidad, proveedor, pedido o fecha. El dato importado de los Excel permanece inmutable.

## Compra corregida a 2,5 mm²

- ID línea: **11136**; ID pedido: **2764**; pedido **26/210-26**.
- Proveedor: **GRUPO RIAS**; fecha: **2026-07-23**.
- Referencia original: `H07Z1K1,5NGR`; referencia efectiva nueva: `H07Z1K2,5NGR`.
- Descripción original y efectiva: **CABLE H07Z1-K ZEROH FLEX 1X2,5 NEGRO**.
- Cantidad: **400 m**; PVP: **0,312000 €/m**; descuento: **NETO**; precio neto: **0,312000 €/m**; importe: **124,8000 €**.

La referencia de destino `H07Z1K2,5NGR` ya existía previamente para el mismo tipo de cable de 2,5 mm² negro. Otras referencias comerciales de fabricantes distintos quedan fuera de esta corrección.

## Compras de 1,5 mm²

- **93 pedidos / 93 líneas** del histórico, todos del mismo proveedor, sin revisiones previas.
- **90.600 m** en conjunto, con precios unitarios netos originales entre **0,147000 y 0,222000 €/m**.
- Las variaciones de texto antiguas (saltos de línea, espacios, abreviaturas) siguen consultables como descripciones de origen.
- Se aplica **solo descripción efectiva**, sin cambio de la referencia ni de los importes.

## Seguridad y auditoría

- Se inspeccionaron las 94 líneas y su ausencia de correcciones previas.
- La función `private.apply_purchase_line_review` exige un JWT administrador de la web y no puede ejecutarse directamente con la sesión SQL del conector: devolvió la denegación prevista. **No se suplantó ninguna identidad de administrador.**
- Se aplicó el mecanismo persistente equivalente en una transacción controlada: 94 filas en `public.purchase_line_overrides` y 94 eventos en `public.purchase_review_events` (revisión 1, motivo específico y actor `asistente-prosoel-costes`).
- La operación completa se ensayó con `ROLLBACK`, comprobando **93 + 1** resultados y **94** registros en ambas tablas dentro de la simulación. Se verificó después del rollback que el número de cambios persistidos era 0.
- Se repitió con `COMMIT` y se verificó su persistencia.
- Se llamaron los mecanismos existentes `private.reconcile_review_reference` para ambas referencias.
- Validación final: **93/93** líneas de 1,5 mm² con referencia/descripcion efectivas comunes; **1/1** compra de 2,5 mm² trasladada con descripción original y cifras intactas; **94/94** originales existentes y **94/94** eventos de auditoría; `normalization_review_groups.candidate_active=false` para la referencia de 1,5.

## Limitación de verificación

Las consultas directas desde el conector SQL a `public.search_costs_enriched` y `public.purchase_reference_review_history` no devolvieron filas **sin sesión JWT de usuario**, así que no se afirma una comprobación visual de la web autenticada. Sí se verificó el resultado desde `public.order_lines_effective` y las tablas de procedencia y auditoría. La próxima revisión visual en la web debe mostrar 93 compras agrupadas en 1,5 mm² y una compra incorporada al histórico de 2,5 mm².

## Alcance

Corrección exclusivamente de datos efectivos existentes; **sin cambios de código ni despliegue**. Las futuras importaciones no quedan sujetas a una regla automática adicional.
