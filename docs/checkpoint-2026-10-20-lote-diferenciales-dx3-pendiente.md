# PROSOEL Costes — Lote DX3 Legrand, 20/10/2026 — PENDIENTE DE APLICAR

## Alcance y precauciones
El usuario solicitó normalizar referencias Legrand DX3 según patrón `Diferencial DX3 4P - 25A - 30mA - Tipo AC - Legrand`, ajustando cada parámetro a la referencia. **Serie correcta: DX3, no TX3.**

Se consultó Supabase (`kusbndefngttaiytcrui`). Se encontraron **81 líneas originales en 19 referencias**, ninguna previamente revisada ni con regla futura existente. Los valores económicos y fuente han de permanecer intactos. **Estado: solo auditoría; ninguna unificación del lote fue aplicada**. La herramienta de escritura SQL quedó bloqueada por controles del servicio. No presentar el lote como terminado.

## Tabla aprobada de destinos, salvo conflicto
| Referencia | Líneas normalizables | Descripción canónica prevista |
| --- | ---: | --- |
| 411504 | 1 | Diferencial DX3 2P - 25A - 30mA - Tipo AC - Legrand |
| 411505 | 5 | Diferencial DX3 2P - 40A - 30mA - Tipo AC - Legrand |
| 411506 | 1 | Diferencial DX3 2P - 63A - 30mA - Tipo AC - Legrand |
| 411524 | 9 | Diferencial DX3 2P - 25A - 300mA - Tipo AC - Legrand |
| 411525 | 2 | Diferencial DX3 2P - 40A - 300mA - Tipo AC - Legrand |
| 411555 | 2 | Diferencial DX3 2P - 40A - 30mA - Tipo A - Legrand |
| 411569 | 1 | Diferencial DX3 2P - 25A - 300mA - Tipo A - Legrand |
| 411590 | 1 | Diferencial DX3 2P - 25A - 30mA - Tipo F (HPI) - Legrand |
| 411591 | 17 | Diferencial DX3 2P - 40A - 30mA - Tipo F (HPI) - Legrand |
| 411592 | 1 | Diferencial DX3 2P - 63A - 30mA - Tipo F (HPI) - Legrand |
| 411660 | 5 | Diferencial DX3 4P - 25A - 30mA - Tipo AC - Legrand |
| 411661 | 4 | Diferencial DX3 4P - 40A - 30mA - Tipo AC - Legrand |
| 411664 | 9 | Diferencial DX3 4P - 25A - 300mA - Tipo AC - Legrand |
| 411665 | 8 | Diferencial DX3 4P - 40A - 300mA - Tipo AC - Legrand |
| 411666 | 7 | Diferencial DX3 4P - 63A - 300mA - Tipo AC - Legrand |
| 411675 | 2 | Diferencial DX3 4P - 40A - 30mA - Tipo A - Legrand |
| 411684 | 1 | Diferencial DX3 4P - 25A - 300mA - Tipo A - Legrand |
| 411694 | 1 | Diferencial DX3 4P - 25A - 30mA - Tipo F (HPI) - Legrand |
| 411695 | 3 | Diferencial DX3 4P - 40A - 30mA - Tipo F (HPI) - Legrand |

Las 19 referencias cubren **80 líneas normalizables**; hay **una línea conflictiva más**, total 81. En `411591`, `411590`, `411592`, `411694` y `411695`, el histórico dice "HPI"; el catálogo actual de Legrand clasifica estos dispositivos como **Tipo F**, por eso se propone **Tipo F (HPI)** para conservar la denominación comercial histórica. Referencias del fabricante para consulta: https://www.legrand.es/es/productos/tipo-f-7 ; https://www.legrand.es/es/productos/interruptores-diferenciales-dx3

## Conflicto NO normalizable por texto sin revisión
- `411661` es DX3 **4P 40A 30mA tipo AC**, confirmado oficialmente por https://www.legrand.es/es/productos/interruptor-diferencial-dx3-4p-400v-40a-tipo-ac-30ma-4-modulos-411661.
- Una línea `public.order_lines.id=5729`, pedido **25/871**, GUARCONSA, 2025-11-19, tiene ref `411661` pero descripción fuente **`Diferencial DX3 4/25/300AC`**, cantidad 1, neto **70,1960 €**. En el mismo pedido hay otra línea `411661` correcta DX3 4P 40A 30mA AC a **85,666 €**.
- El pedido **25/868** de la misma fecha y proveedor contiene una línea de ref **`411664`** con **idéntica descripción DX3 4/25/300AC, neto 70,1960 € y cantidad 1**. La ficha técnica oficial confirma que **`411664`** corresponde a **4P 25A 300mA AC** (referencia en https://assets.legrand.com/pim/NP-FT-GT/F01318ES-02.pdf).
- Alta probabilidad de referencia equivocada en el pedido 25/871. **No cambiar referencia ni unificar la línea 5729 bajo el producto 411661 sin confirmación explícita del usuario.** Posible corrección auditada futura: `corrected_reference='411664'` + descripción efectiva destino, preservando referencia original `411661`. No introducir regla automática de remapeo sin esa confirmación.

## Próximos pasos cuando esté disponible el acceso SQL
1. Volver a leer recuentos y huellas de los 81 registros antes de escribir (otros pedidos podrían importarse entretanto).
2. Preparar lote de 80 líneas, 19 referencias, con 1 conflicto (ID 5729) excluido. Verificar cardinalidades y ausencia de cambios previos.
3. Simular transacción `BEGIN/ROLLBACK` que cree revisiones por línea, eventos de auditoría y reglas por proveedor + ref fuente + descripción fuente; ejecutar `private.reconcile_review_reference` por referencia; probar número de reglas previstas y conservación de los datos originales.
4. Solo después aplicar `COMMIT` y verificar con consultas nuevas. Nunca modificar `public.orders` ni `public.order_lines` ni valores económicos.
5. Preguntar al usuario si confirma corregir **la línea 5729 a referencia 411664**; si se autoriza, hacerlo con override y evento y regla específica solo tras la verificación.
6. Actualizar este checkpoint indicando hash de fuentes, recuentos efectivos y IDs reales de reglas.

### Auditoría del lote
- `411661` tiene **5** líneas totales en **4** pedidos: **4** coinciden con DX3 4P 40A 30mA AC; **1** conflicto.
- `411664` tiene **9** líneas propias, 9 pedidos, dos variantes textuales equivalentes solo por mayúsculas.
- `411675` presenta dos variantes textuales de Tipo A (con y sin comillas), ambas de 4P 40A 30mA.
- Las restantes referencias tienen características coincidentes con las descripciones históricas que se muestran en la tabla.
