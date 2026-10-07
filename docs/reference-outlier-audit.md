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


## Tercera pasada: evitar falsos positivos

La revisión pública también ha permitido descartar varios aparentes errores.

### Colisión real de referencia entre fabricantes

La referencia corta `5363` no identifica un producto único:

- TELEVES 5363 = central amplificadora MiniKom "F" VHF/UHF-FI;
- SOLERA 5363 = caja empotrable para tabique hueco 164x106 mm.

Las dos descripciones históricas son compatibles con productos reales. Este caso
no debe entrar en la bandeja de "referencia mal asociada"; debe resolverse por
namespace fabricante/proveedor.

### Una referencia, varias descripciones públicas válidas

FAMATEL `3015` aparece en fuentes públicas con descripciones de dimensiones
diferentes: la nomenclatura comercial 310x240 PG29-36 y la ficha/tarifa
250x320x135 con tapa de 1/4 de vuelta IP55. Por tanto, no se separan
automáticamente en dos materiales.

TELEVES `215501` también aparece como "T100 CU/CU polietileno clase A" y como
"T100plus 16PRtC Fca clase A"; ambas expresiones describen el mismo cable.

### Terminología histórica

FERMAX `3305` figura oficialmente como monitor LOFT VDS color 3,5", pero
también existe uso histórico/comercial de la denominación ADS y el soporte de
FERMAX trata VDS/ADS como terminología relacionada en sistemas heredados.
No se crea un material distinto solo por ADS frente a VDS.

### Outliers confirmados

ROBLAN `ECOSKYC100` y `ECOSKYF100` están documentados en fichas de distintas
fechas como lámparas ECO SKY GU10 de 5 W. Las líneas históricas que indican 7 W
se mantienen como incidencias de descripción.

### Especificaciones que pueden cambiar con revisiones

`LHMO15740` está publicado actualmente como módulo LED 7 W, 4000 K, 600 lm,
CRI95, 60° e IP54. El histórico contiene 650 lm y otra ficha textual con CRI90.
Estas diferencias se tratarán como posibles revisiones de especificación:
no se dividen ni corrigen automáticamente hasta revisar fecha/documentación.

### No inferir especificaciones a partir del nombre del modelo

`LRS-100-24` entrega 24 V, 4,5 A y 108 W máximos. El "100" del nombre de la
serie no equivale necesariamente a 100 W exactos. Las comprobaciones de
consistencia no deben deducir potencia a partir del nombre del modelo salvo que
el fabricante documente expresamente esa codificación.
