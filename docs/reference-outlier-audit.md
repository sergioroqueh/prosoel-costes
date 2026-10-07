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
