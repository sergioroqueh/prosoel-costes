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
capa separada del catálogo de materiales.

En la carga actual:

- 143 líneas son RAEE/ecotasa;
- 70 son portes/transporte;
- 55 son servicios explícitos.

El universo activo de materiales queda en **11.270 líneas**.

## Resultado actual - iteración V10

| Categoría material | Líneas |
| --- | ---: |
| Material conocido | 5.398 |
| Variante comercial | 148 |
| Alias / referencia normalizable | 94 |
| Conflicto detectado | 49 |
| Pendiente | 5.581 |
| **Total material** | **11.270** |

Material resuelto sin conflicto:

- **5.640 líneas**
- **50,04 % del universo material**

Incluyendo conflictos ya identificados:

- **5.689 líneas**
- **50,48 % del universo material**

La iteración anterior estaba en 5.520 líneas resueltas sin conflicto
(48,98 %). Esta ronda ha liberado otras **120 líneas** y cruza por primera vez
el 50 % del histórico material.

## Por año

| Año | Conocido | Variante | Alias | Conflicto | Pendiente |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2024 | 1.940 | 80 | 51 | 21 | 2.199 |
| 2025 | 1.843 | 34 | 28 | 17 | 1.730 |
| 2026 | 1.615 | 34 | 15 | 11 | 1.652 |

Las líneas no-materiales se mantienen fuera de esta tabla.

## Calidad de precio en material resuelto

Sobre las **5.640 líneas** ya resueltas como material/alias/variante:

- 5.582 tienen precio aritméticamente válido;
- 45 tienen precio incompleto;
- 10 tienen valor cero/no positivo;
- 3 presentan discrepancia aritmética.

La identificación técnica no convierte automáticamente una línea con precio
problemático en referencia válida de coste.

## Pendientes

Quedan **5.581 líneas materiales pendientes**.

La cabecera de pendientes ya ha bajado a referencias de unas 7-8 apariciones,
además de **133 líneas sin referencia**, que no se forzarán a una referencia por
similitud textual.

Siguiente bloque por impacto:

- 111403
- A9F79616
- 113574
- 113350
- LS990SWM
- 18516
- 069602L
- 400405
- 407728
- 82630-30
- 0102040
- JX39136LED
- JX39236LED
- MM400
- 864173
- R9F12610
- CCPGSC/A01
- CP4020
- 20302900
- 020MARM025

## Política

Una línea sale de pendiente solo cuando existe evidencia suficiente:

1. referencia pública confirmada;
2. referencia local de proveedor con histórico estable;
3. variante comercial demostrada;
4. regla técnica determinista sin contradicción;
5. conflicto respaldado por evidencia.

No se aprueba un material únicamente por similitud textual.
