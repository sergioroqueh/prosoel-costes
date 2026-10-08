# PROSOEL Costes — corrección supervisada CR20: Ø25 → Ø20

Fecha de actuación: 2026-10-08.

## Solicitud

El usuario confirma que **todas las compras con referencia CR20 y descripción «Tubo Aiscan-CR corrugado doble capa diámetro 25 negro» son en realidad tubo Aiscan-CR Ø20**, y que los precios registrados corresponden a CR20.

## Resultado aplicado en Supabase

**7 líneas históricas corregidas**, todas del proveedor **GRUPO JARAMA**, referencia **CR20**:

| Pedido | Fecha | ID línea | Cantidad | Neto unitario |
|---|---|---:|---:|---:|
| 24/991 | 2024-10-28 | 745 | 300 | 0,167000 € |
| 24/905 | 2024-10-01 | 4048 | 4000 | 0,167000 € |
| 24/884 | 2024-09-24 | 1307 | 1200 | 0,167000 € |
| 24/883 | 2024-09-24 | 2560 | 2000 | 0,167000 € |
| 24/850 | 2024-09-12 | 826 | 3000 | 0,167000 € |
| 24/806 | 2024-08-21 | 1197 | 400 | 0,167000 € |
| 24/643 | 2024-06-18 | 3879 | 5000 | 0,167000 € |

**Descripción efectiva nueva:** `Tubo Aiscan-CR corrugado doble capa diámetro 20 negro`.

**Descripción original preservada:** `Tubo Aiscan-CR corrugado doble capa diámetro 25 negro`.

Se utilizó la función existente `public.review_purchase_lines_bulk` en una transacción, pasando las revisiones esperadas, sin modificar directamente `public.order_lines`. Justificación registrada: el usuario confirma que el código y el precio corresponden a CR20 y la mención a diámetro 25 en el pedido es errónea.

## Integridad y auditoría

- Simulación previa en transacción revertida: 7/7 corregidas, 7/7 fuentes conservadas y 7/7 precios sin cambios.
- Transacción definitiva: 7 compras corregidas; 7 fuentes conservadas; 7 precios sin cambios; 7 pedidos distintos.
- Confirmación posterior: **0 compras CR20** continúan con la descripción efectiva exacta de Ø25 negro.
- Siete eventos individuales de auditoría; revisión de línea pasa de 0 a 1.
- La cola de normalización se reconcilió mediante la función vigente para CR20.
- Las 2 compras de **GRUPO RIAS** modificadas previamente (26/122 y 26/078; texto original abreviado de Ø20) permanecen sin alterar; ahora suman **9 overrides descriptivos CR20** con nombre efectivo Ø20.
- No cambia ni un precio, referencia, descuento, cantidad, proveedor o pedido original; no se elimina ninguna línea.

## Alcance temporal

Esta actuación alcanza las siete compras existentes identificadas al ejecutar la consulta. **No instala una regla automática para futuros pedidos**: una nueva compra con el mismo error requerirá una nueva corrección o un mecanismo de validación específico.

## Procedimiento reversible

En Normalización → CR20 pueden inspeccionarse los originales y la bitácora de correcciones. La restauración de una línea deberá efectuarse con el mecanismo de revisión existente y justificación; nunca mediante eliminación física del pedido.

No fueron necesarios cambios de código, migraciones de esquema ni despliegue de la interfaz.
