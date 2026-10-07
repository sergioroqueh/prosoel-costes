# Auditoría de contradicciones referencia-descripción

El histórico completo 2024-2026 se ha revisado buscando contradicciones
**explícitas** en familias cuya referencia codifica atributos técnicos.

Esta comprobación no usa similitud textual y no corrige pedidos. Solo crea
incidencias.

## Primera pasada

Se localizaron 16 líneas con contradicciones técnicas explícitas:

- 7 líneas con referencia AISCAN `CR20` y descripción de diámetro 25 mm;
- 5 líneas H07Z1-K cuya referencia interna codifica 1,5 mm² y cuya descripción
  indica 2,5 mm²;
- 2 líneas H07Z1-K cuya referencia codifica 1,5 mm² y la descripción indica
  10 mm²;
- 2 líneas H07Z1-K cuya descripción contiene simultáneamente colores azul y
  negro aunque la referencia codifica negro.

## Uso del precio como evidencia secundaria

El precio histórico se utiliza únicamente para priorizar la revisión, no para
autocorregir.

En el lote de cinco contradicciones 1,5/2,5 mm² de 2026, el PVP registrado es
0,312 €/m. En el histórico 2026 de las mismas referencias internas:

- H07Z1-K 1,5 mm²: mediana aproximada 0,195 €/m;
- H07Z1-K 2,5 mm²: mediana aproximada 0,312 €/m.

Esto hace probable que en esas cinco líneas la **referencia interna** sea la que
quedó arrastrada desde 1,5 mm².

En las dos contradicciones 1,5/10 mm² de 2024 ocurre lo contrario: el PVP es
0,155 €/m, muy próximo a la mediana de 1,5 mm² de ese año (0,163 €/m) y muy
alejado de 10 mm² (1,02 €/m). Ahí la **descripción** es la candidata principal a
error.

La aplicación debe mostrar este razonamiento como evidencia, nunca aplicarlo
como corrección automática.


## Segunda pasada: referencias ancla

Se cruzaron referencias repetidas con producto fabricante confirmado y con sus
otras apariciones históricas. Se detectaron **11 líneas de alta prioridad** cuyo
texto no es compatible con la referencia observada:

- 1 línea con referencia `02281062` descrita como RAEE, mientras esa referencia
  corresponde a cable paralelo 2x0,50 mm²;
- 1 línea con referencia `180064` descrita como repartidor Schneider
  `LGY412548`, cuando `180064` es un peine QRB bipolar 63A 54P;
- 2 líneas con referencia `403585` descritas respectivamente como accesorio de
  cofret y conducto de chapa, cuando `403585` es un magnetotérmico Legrand TX3
  P+N 10A;
- 1 línea con referencia `41059102500B00` descrita como una central PNZ-M,
  cuando Pinazo identifica la referencia como CGP PNZ-CGP 10-250 BUC IB;
- 2 líneas con referencia `50010432-037` descritas como embornamiento a
  tornillo; Simon publica esa referencia como 1Click y reserva
  `50010472-037` para la versión a tornillo;
- 3 líneas con referencia `51010103-030` descritas como cajetín o base Schuko,
  aunque Simon confirma que es el marco/bastidores de 3 elementos dobles;
- 1 línea `TP6KG` descrita como alta eficacia 34A 233B, variante que aparece
  separadamente como `TP6KGAE`.

Estas incidencias no se corrigen automáticamente. Se registran como candidatos
de revisión con evidencia de fabricante y contexto histórico.

## Reutilización de referencias del proveedor

También se confirmó un caso estructural importante: la referencia `P1` se usa
en pedidos del mismo proveedor para productos completamente distintos
(emergencia, canaleta, tapa y pica).

Esto demuestra que incluso **proveedor + referencia** puede no identificar de
forma única un artículo histórico. La base necesita una huella de variante
comercial basada en referencia observada + descripción normalizada, conservando
después la posibilidad de fusionar variantes mediante revisión.
