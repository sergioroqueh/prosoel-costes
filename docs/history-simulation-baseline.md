# Simulación histórica de clasificación 2024-2026

Ejecución conservadora sobre los **2.863 pedidos** y **11.538 líneas** del
histórico 2024-2026.

La simulación no modifica pedidos, referencias, descripciones ni precios. Solo
aplica la evidencia pública aprobada, decisiones de referencia local de
proveedor, clasificación de líneas no-materiales y comprobaciones técnicas
deterministas.

## Resultado global

| Categoría | Líneas | % |
| --- | ---: | ---: |
| Material conocido | 3.322 | 28,79 % |
| Variante comercial | 148 | 1,28 % |
| Alias / referencia normalizable | 51 | 0,44 % |
| Servicio / portes / RAEE | 238 | 2,06 % |
| Conflicto detectado | 47 | 0,41 % |
| Pendiente | 7.732 | 67,01 % |
| **Total** | **11.538** | **100 %** |

Se consideran ya clasificadas **3.806 líneas (32,99 %)** si incluimos los
conflictos detectados. De ellas, **3.759 líneas (32,58 %)** están resueltas sin
conflicto.

En el subconjunto material:

- material conocido + variante + alias: **3.521 líneas**;
- de ellas, **3.500** tienen precio neto/total aritméticamente válido;
- 17 tienen precio incompleto;
- 2 tienen valor cero/no positivo;
- 2 presentan discrepancia aritmética.

## Por año

| Año | Conocido | Variante | Alias | No material | Conflicto | Pendiente |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2024 | 1.084 | 80 | 26 | 125 | 20 | 3.105 |
| 2025 | 1.139 | 34 | 15 | 70 | 16 | 2.450 |
| 2026 | 1.099 | 34 | 10 | 43 | 11 | 2.177 |

## Líneas no-materiales

La clasificación explícita ha detectado:

- 143 líneas de RAEE/ecotasa;
- 70 líneas de portes/transporte;
- 25 líneas de servicio explícito.

El clasificador sigue siendo deliberadamente conservador. Una línea dudosa no
se excluye del catálogo por similitud de texto.

## Conflictos

Se han marcado **47 líneas** con contradicción suficientemente demostrada.

Incluyen, entre otros:

- diámetros AISCAN CR incompatibles con la referencia;
- secciones/colores H07Z1-K incompatibles;
- referencias Simon/Legrand/Pinazo arrastradas a descripciones de otro producto;
- variantes de cable con número de conductores o sección incompatible;
- embalajes o atributos explícitos contradictorios.

La simulación no corrige ninguna de ellas.

## Pendientes

Quedan **7.732 líneas** pendientes, correspondientes a unas **3.153 referencias
observadas**. Pendiente significa únicamente "todavía no autoaprobado".

La siguiente prioridad debe ser por frecuencia, ya que unas pocas referencias
pueden resolver cientos de líneas.

Tras la primera iteración de simulación se verificaron públicamente varios de
los mayores pendientes (DUPLOGEL 46015000, Legrand 403587/403588/403589,
AISCAN BGE20, Solera 6625, JUNG 501U/506U y LS990, Cembre PKE612,
Famatel 3011, Schneider A9R61240 y Televés 5226/5276) y se repitió la
simulación. Los números de esta página corresponden a esa segunda ejecución.

## Política

Una línea solo sale de `pending` si existe una de estas bases:

1. referencia pública suficientemente confirmada;
2. referencia local de proveedor con histórico estable;
3. regla técnica determinista que no contradice la descripción;
4. clasificación explícita de servicio/portes/RAEE;
5. conflicto concreto respaldado por evidencia.

No se usa similitud textual por sí sola para aprobar materiales.
