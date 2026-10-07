# Simulación histórica de clasificación 2024-2026

Simulación conservadora sobre **2.863 pedidos** y **11.538 líneas**.

No modifica el histórico. Aplica evidencia pública, referencias locales de
proveedor, variantes comerciales, reglas técnicas deterministas y detección de
conflictos.

## Alcance activo

Por decisión de PROSOEL, **RAEE/ecotasas y portes/transporte quedan fuera del
trabajo de normalización de materiales y fuera del KPI de avance**.

Se siguen detectando únicamente para apartarlos del catálogo y preservar la
trazabilidad del pedido. Los servicios explícitos también se mantienen en una
cola separada del catálogo de materiales.

En la carga actual:

- 143 líneas son RAEE/ecotasa;
- 70 son portes/transporte;
- 55 son servicios explícitos.

El universo activo de materiales queda en **11.270 líneas**.

## Resultado actual - iteración V7

| Categoría material | Líneas |
| --- | ---: |
| Material conocido | 4.908 |
| Variante comercial | 148 |
| Alias / referencia normalizable | 94 |
| Conflicto detectado | 49 |
| Pendiente | 6.071 |
| **Total material** | **11.270** |

Material resuelto sin conflicto:

- **5.150 líneas**
- **45,70 % del universo material**

Incluyendo conflictos ya identificados:

- **5.199 líneas**
- **46,13 % del universo material**

La simulación anterior estaba en 4.597 líneas resueltas sin conflicto. Esta
ronda ha liberado otras **553 líneas**.

## Calidad de precio en material resuelto

Sobre las 5.150 líneas ya resueltas como material/alias/variante:

- 5.096 tienen precio aritméticamente válido;
- 41 tienen precio incompleto;
- 10 tienen valor cero/no positivo;
- 3 presentan discrepancia aritmética.

La identificación técnica no convierte automáticamente una línea con precio
problemático en referencia válida de coste.

## Pendientes

Quedan **6.071 líneas materiales pendientes**.

La prioridad sigue siendo frecuencia x fiabilidad. Después de resolver los
bloques de 10-25 apariciones, la cabecera de pendientes ya ha bajado a familias
de unas 8-9 apariciones por referencia, además de 133 líneas sin referencia.

Ejemplos del siguiente bloque:

`82005-30`, `6618`, `27432-65`, `20302926`, `411524`,
`411664`, `CCBFO24SCAS`, `403606`, `3251`,
`20000930-039`, `27000610-090`, `864007`, `50000089-030`,
`5825`, `2247-3`, `A9C20732`, `BT1438`, `09250083`,
`NSYS2535` y `EHF25`.

## Política

Una línea sale de pendiente solo cuando existe evidencia suficiente:

1. referencia pública confirmada;
2. referencia local de proveedor con histórico estable;
3. variante comercial demostrada;
4. regla técnica determinista sin contradicción;
5. conflicto respaldado por evidencia.

No se aprueba un material únicamente por similitud textual.
