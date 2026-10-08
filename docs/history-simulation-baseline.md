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

## Resultado actual - iteración V11

| Categoría material | Líneas |
| --- | ---: |
| Material conocido | 5.537 |
| Variante comercial | 148 |
| Alias / referencia normalizable | 102 |
| Conflicto detectado | 49 |
| Pendiente | 5.434 |
| **Total material** | **11.270** |

Material resuelto sin conflicto:

- **5.787 líneas**
- **51,35 % del universo material**

Incluyendo conflictos ya identificados:

- **5.836 líneas**
- **51,78 % del universo material**

La iteración V10 estaba en 5.640 líneas resueltas sin conflicto
(50,04 %). Esta ronda ha liberado otras **147 líneas**.

## Por año

| Año | Conocido | Variante | Alias | Conflicto | Pendiente |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2024 | 1.985 | 80 | 51 | 21 | 2.154 |
| 2025 | 1.897 | 34 | 32 | 17 | 1.672 |
| 2026 | 1.655 | 34 | 19 | 11 | 1.608 |

Las líneas no-materiales se mantienen fuera de esta tabla.

## Calidad de precio en material resuelto

Sobre las **5.787 líneas** ya resueltas como material/alias/variante:

- 5.724 tienen precio aritméticamente válido;
- 50 tienen precio incompleto;
- 10 tienen valor cero/no positivo;
- 3 presentan discrepancia aritmética.

La identificación técnica no convierte automáticamente una línea con precio
problemático en referencia válida de coste.

## Lote V11 resuelto

Se han cerrado 20 referencias de alta frecuencia, equivalentes a 147 líneas:

- INDEX 111403 / GPZ201010;
- Schneider A9F79616 y R9F12610;
- Fontana 113574 y 113350;
- JUNG LS990SWM;
- BJC 18516;
- Legrand 069602L, 400405 y 407728;
- Simon 82630-30;
- Temper 0102040;
- ROBLAN JX39136LED y JX39236LED;
- FANAIR MM400 como referencia local estable;
- Legrand Niloé Step 864173;
- Cablecel CCPGSC/A01;
- CP4020 como referencia comercial local estable;
- General Cable 20302900;
- Armengol 020MARM025.

## Pendientes

Quedan **5.434 líneas materiales pendientes**.

A partir de este punto la mayor parte de las referencias pendientes de mayor
frecuencia están en el rango de 6-7 apariciones. La estrategia sigue siendo
resolver por impacto, sin rebajar el umbral de evidencia.

## Política

Una línea sale de pendiente solo cuando existe evidencia suficiente:

1. referencia pública confirmada;
2. referencia local de proveedor con histórico estable;
3. variante comercial demostrada;
4. regla técnica determinista sin contradicción;
5. conflicto respaldado por evidencia.

No se aprueba un material únicamente por similitud textual.
