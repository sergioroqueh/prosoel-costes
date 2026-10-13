# PROSOEL Costes — Unificación cable H07Z1-K 1,5 mm² AZUL

**Fecha:** 2026-10-13  
**Proyecto Supabase:** `kusbndefngttaiytcrui`  
**Referencia efectiva:** `H07Z1K1,5AZR`

## Petición confirmada por PROSOEL

Unificar los tres grupos visibles de la revisión (62 + 14 + 2 compras), todos con la misma referencia y cable H07Z1-K 1,5 mm² azul, bajo la descripción efectiva exacta:

**Hilo Flexible Libre Halógenos H07Z1-K 1.5mm2 AZUL**

No modificar referencia, precios, descuentos, cantidades ni datos originales de los pedidos.

## Estado real previo comprobado

En `public.order_lines_effective` existían 79 compras asociadas a `H07Z1K1,5AZR`:

| Compras | Descripción de origen | Estado previo |
|---:|---|---|
| 62 | `MTS.CABLE FLEXIBLE L.H. H07Z1K 1,5 MM\nAZUL ROLLO` | Sin revisar |
| 14 | `MTS.CABLE FLEXIBLE L.H. H07Z1K 1,5 MM AZUL ROLLO` | Sin revisar |
| 2 | `MTS.CABLE FLEXIBLE L.H. H07Z1K 1,5 MM \nAZUL ROLLO` | Sin revisar |
| 1 | `MTS.CABLE FLEXIBLE L.H. H07Z1K 10 MM\nAZUL ROLLO` | **Ya corregido previamente por el usuario** |

Las **78 líneas de la petición** carecían de revisiones anteriores y no estaban excluidas. Proveedor GRUPO RIAS; 78 pedidos, **98.200 m**, **17.655,40 €** en importes históricos, neto mínimo **0,147000 €/m** y máximo **0,232000 €/m**.

### Revisión previa preservada

La línea **3472**, pedido **24/356** del 18/03/2024, ya constaba revisada desde `compras@prosoel.es` el 13/10/2026, con motivo **«Verificado por precio y fecha»** y descripción efectiva **Hilo Flexible Libre Halógenos H07Z1-K 1.5mm2 AZUL**. La descripción fuente original sigue indicando «10 MM»; la decisión revisada conserva ambos textos y la auditoría. Su revisión permaneció en **versión 1**, sin modificaciones adicionales; **200 m**, neto **0,155000 €/m**, total **31,00 €**.

## Ejecución segura

- Se consultaron y bloquearon las 78 filas objetivo y se confirmaron referencia, tres variantes textuales, sección 1,5 mm², color azul, ausencia de overrides y exclusiones, cantidades, total económico y existencia de la revisión previa de la línea 3472.
- Se comprobó checksum de compras y campos de pedidos originales para el grupo completo antes/después de la operación.
- Simulación con `BEGIN` / `ROLLBACK`: **79/79** descripciones efectivas comunes, 79 revisiones de versión 1 (una anterior), **98.400 m** y **17.686,40 €** preservados. Comprobación posterior confirmó que el rollback dejó únicamente la descripción previamente normalizada.
- Aplicación definitiva en **una transacción con `COMMIT`**: 78 entradas nuevas en `public.purchase_line_overrides` (versión 1) y 78 eventos en `public.purchase_review_events`, actor `asistente-prosoel-costes`, motivo y antes/después.
- Se usó el mecanismo persistente de auditoría y revisión existente, sin modificar registros crudos. `private.apply_purchase_line_review` exige JWT de administrador de la aplicación y no es ejecutable con esta conexión SQL, por lo que no se suplantó sesión de usuario.
- `private.reconcile_review_reference('H07Z1K1,5AZR')` actualizó la cola existente.

## Comprobación posterior

- **79 pedidos / 79 líneas**, una sola descripción efectiva, cuatro descripciones de origen preservadas.
- **78 nuevos eventos de auditoría**, **79 overrides** acumulados (el adicional es el ya existente del usuario).
- Precios históricos intactos **0,147000–0,232000 €/m**; cantidad acumulada **98.400 m**; importe de líneas **17.686,40 €**.
- La línea 3472 continúa con revisión 1 del usuario y el mismo texto y precio de origen; no fue modificada.
- Cola `normalization_review_groups` para `H07Z1K1,5AZR`: `candidate_active=false`.
- Comprobación de agrupación en `public.order_lines_effective` finalizada. La vista autenticada de buscador/procedencia no puede inspeccionarse visualmente desde el conector administrativo sin su JWT.

**No se modificó código ni se añadió regla de normalización automática.**
