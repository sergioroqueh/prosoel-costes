# Cola de revisión técnica priorizada — PROSOEL Costes V11

Documento automático de trabajo a partir de **descripciones originales de compras**. Fecha de corte: 8 de octubre de 2026. **No es un informe de equivalencia certificada.**

## Procedimiento recomendado

1. Empezar por los grupos con mayor número de pedidos y contradicciones expresas.
2. En la pestaña `Normalización` activar `Solo referencias con alertas técnicas detectadas`.
3. Abrir cada ficha, leer las descripciones y localizar **cada pedido de origen** donde aparece el dato discordante.
4. Distinguir si la diferencia indica artículos realmente distintos, un error de código o una transcripción incorrecta.
5. Documentar la fuente externa que permita resolverlo: ficha de fabricante, catálogo técnico o comprobación del material suministrado.
6. Si no se puede justificar, seleccionar **Necesita más evidencia** y especificar exactamente qué debe verificarse. No consolidar precios ni vincular materiales.
7. Si se demuestra que contiene productos distintos, marcar **Contiene productos distintos** con justificación, sin asumir automáticamente cuál de las descripciones representa el código verdadero.

## Casos ordenados por número de pedidos

| Prioridad | Referencia | Familia sugerida | Pedidos | Contradicciones observadas |
|---:|---|---|---:|---|
| 1 | `CR20` | Tubos/canalizaciones | 142 | Ø mm: 20 / 25 |
| 2 | `H07Z1K1,5NGR` | Cables | 94 | Secciones mm²: 1.5 / 2.5 |
| 3 | `H07Z1K1,5AZR` | Cables | 80 | Secciones mm²: 1.5 / 10 / 2.5 |
| 4 | `H07Z1K1,5GR` | Cables | 75 | Secciones mm²: 1.5 / 10 / 2.5 |
| 5 | `H07Z1K1,5AVR` | Cables | 74 | Secciones mm²: 1.5 / 2.5 |
| 6 | `H07Z1K1,5MR` | Cables | 74 | Secciones mm²: 1.5 / 2.5 |
| 7 | `403585` | Familias mixtas | 46 | Familias: aparamenta / canalizaciones / envolventes_cajas |
| 8 | `A9R60240` | Aparamenta | 18 | Amperios: 25 / 40 |
| 9 | `660191` | Familias mixtas | 8 | Familias: envolventes_cajas / iluminacion |
| 10 | `2217847100` | Iluminación | 5 | Potencias W: 36 / 40 |
| 11 | `113149` | Familias mixtas | 3 | Familias: envolventes_cajas / fijaciones |
| 12 | `5826630` | Familias mixtas | 3 | Familias: cables / fijaciones |
| 13 | `6000750255` | Cables | 3 | Secciones mm²: 1.5 / 2.5 |
| 14 | `864305` | Familias mixtas | 2 | Familias: iluminacion / mecanismos |
| 15 | `ECOSKYC100` | Sin clasificar | 2 | Potencias W: 5 / 7 |
| 16 | `ECOSKYF100` | Sin clasificar | 2 | Potencias W: 5 / 7 |
| 17 | `MICROLIGHT124M4101N170A` | Iluminación | 2 | Potencias W: 114 / 120 |
| 18 | `CLP160APMB4C` | Iluminación | 1 | Potencias W: 38 / 44 |
| 19 | `MICROLIGHT124M4101N170C` | Iluminación | 1 | Potencias W: 102 / 126 / 84 |

**Interpretación:** estos valores proceden de los textos de los pedidos; una misma referencia comercial puede ser un código interno del proveedor, una errata o una identidad real de fabricante. Detectar valores diferentes no resuelve la causa.

## Primeros cuatro expedientes sugeridos

**CR20 — canalizaciones.** Aparece tubo Aiscan-CR Ø20 mm y alguna descripción Ø25 mm bajo el código CR20. Comprobar primero la referencia exacta y el diámetro real facturado en los pedidos de Ø25. No mezclar precios unitarios de Ø20 y Ø25 hasta aclararlo.

**H07Z1K1,5NGR / H07Z1K1,5AZR (familia de cables).** Existen descripciones de 1,5 mm² y de 2,5 mm²; en el caso azul también aparece 10 mm². Separar por sección, color y clase del conductor. Un error en sección distorsiona el presupuesto aunque el código se repita.

**403585 — aparamenta y otras familias.** La mayoría de las líneas describen un magnetotérmico TX3 P+N 10 A, pero otras describen un conducto de chapa y un accesorio. Revisar especialmente los pedidos de las otras familias: puede ser reutilización de código interno por proveedor.

**A9R60240 — diferencial.** Aparecen descripciones de 2P 40 A 30 mA junto a otra de 4P 25 A 300 mA. Además de la corriente nominal, comprobar polos y sensibilidad; son diferencias técnicas relevantes. 

## Seguridad
- Ninguna decisión se ha aprobado automáticamente.
- Los datos se actualizan con nuevas importaciones mediante el trigger de evidencias, pero la aprobación humana no se sustituye.
- El guardado de `ready_for_mapping` queda bloqueado cuando existen alertas técnicas.
- La pestaña de precios y los precios históricos de compras no se modifican.

Fuente técnica de trazabilidad: Supabase, tablas `orders`, `order_lines` y `normalization_review_groups`. Referencia al estado general: [checkpoint V11](checkpoint-2026-10-08-v11.md).
