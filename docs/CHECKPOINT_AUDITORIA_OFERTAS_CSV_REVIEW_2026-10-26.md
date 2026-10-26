# PROSOEL-Costes · Ronda de auditoría CSV recuperador histórico
**Fecha:** 2026-10-26 · **Fuente:** `PROSOEL_Auditoria_Ofertas_Historicas (1).csv`, 2.913 filas.

## Recuento comprobado
| Estado | 2024 | 2025 | 2026 | Otros | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Verificada por archivo (no consolidada) | 532 | 454 | 576 | 0 | 1.562 |
| Oferta no detectada | 570 | 501 | 267 | 4 | 1.342 |
| Revisar SHA/no registrado | - | - | - | 9 | 9 |

- 1.562 candidatas vs 1.518 en CSV previo: +44.
- 26/805 oferta **A 44120** presente y SHA correcto.
- 25/06 oferta **5100012** presente y SHA correcto.
- 26/808 excluido por hash diferente.
- El CSV contiene 1.562 SHA únicos entre las filas Verificada, sin SHA duplicados.
- `Oferta no detectada` NO implica ausencia de oferta; podría ser un formato aún no reconocido.

## Casos de peligro de oferta incompleta en fila Verificada
1. `25/565`: oferta `25` (excesivamente corta).
2. `25/862`: oferta `25/` (termina en barra).
3. `25/403` y `25/454`: oferta `12/06/25-PROSOEL-MADNUM-LS990-SWM-JG-Rev` (sufijo de revisión sin número).
4. `24/964`: oferta `24-000641_Rev.` (sufijo de revisión con punto final y posible valor truncado).

Estos cinco candidatos requieren revisión manual de los XLSX antes de aprobación. No se asume que son incorrectos, pero tampoco se graban automáticamente.

## Nueve incidencias de procedencia
- Nombre de Excel igual pero SHA diferente: `26/782`, `26/785`, `26/787`, `26/788`, `26/789`, `26/792`, `26/808`, `26/822`.
- No coincide SHA ni nombre con el histórico: archivo denominado `Pedido -824- ...` (candidato `26/824` no incorporado).
- Las nueve quedan excluidas de la actualización hasta resolver identidad y procedencia.

## Corrección aplicada
- `app/static/historical_offer_backfill.js`: función pura `offerRequiresManualReview`, filtra ofertas de menos de tres caracteres alfanuméricos, terminadas en separador o sufijo `-Rev` sin revisión. Las propuestas excluidas se agrupan en `result.suspicious`.
- La vista muestra el recuento de ofertas dudosas.
- El CSV completo incorpora nuevas filas `Revisar oferta` con referencia, pedido, hash, archivo y razón.
- La operación de confirmación sólo incluye `result.offers`, por lo que las dudosas no llegan al RPC. Se conserva el cotejo SHA original.
- `tests/offer_review_gate.test.mjs` documenta reproducciones de ofertas completas/dudosas.
- Nueva versión del JavaScript para invalidar caché.
- Sin cambios en Supabase ni en importador de pedidos nuevos. `main` sin cambios.
- Resultado previsto tras el nuevo análisis con los mismos ZIP (si permanecen idénticos): **1.557 ofertas propuestas**, **5 a revisar**, **1.342 no detectadas**, **9 incidencias**. Es una proyección, no una ejecución del nuevo escaneo con ZIP reales.

## Estado Supabase
Consulta read-only: 2.915 pedidos, 11.729 líneas, 0 ofertas guardadas, 0 registros de auditoría (momento de esta ronda).

## Continuidad
1. Desde la web, Ctrl+F5 y nuevo escaneo de los tres ZIP.
2. Descargar informe nuevo y comprobar recuentos y cinco casos dudosos.
3. Revisar el CSV completo y confirmar únicamente si se desea aplicar las ofertas no cuestionadas.
4. Casos ambiguos de pedido/dato original y las nueve discrepancias SHA quedan sin modificar.

Además, hay 12 filas del CSV con pedido `26/00` pese a filenames diferentes. Son identificadores importados que requieren una auditoría separada y NO deben fusionarse por el texto del número de pedido; cotejar por ID y SHA.
