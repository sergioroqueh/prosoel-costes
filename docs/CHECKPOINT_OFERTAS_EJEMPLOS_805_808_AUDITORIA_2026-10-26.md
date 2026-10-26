# PROSOEL-Costes — auditoría de seis formatos reales de oferta
**Fecha:** 26/10/2026 · **Modo:** inspección de XLSX reales, CSV descargado y consultas de solo lectura en Supabase.

## CSV aportado
`PROSOEL_Auditoria_Ofertas_Historicas(1).csv`: 1.518 filas «Verificada», 7 columnas, 1.518 SHA-256 únicos, todas con origen `OBSERVACIONES (D4)`; 498 pedidos 2024, 451 pedidos 2025, 569 pedidos 2026. **Este fichero NO reflejaba ofertas no detectadas ni archivos con SHA distinto**, solo ofertas candidatas que superaron el filtro de la herramienta. «Verificada» aquí significa cotejo de fichero, no revisión humana ni guardado en base.

## Casos comprobados contra el XLSX adjunto
| Pedido | Proveedor | Oferta literal en D4 | Resultado CSV | SHA del Excel vs. Supabase | Decisión |
|---|---|---|---|---|---|
| 26/805 | TODO EXTINTOR | `A 44120` | Ausente | Igual, pedido ID 2900 | **Falso negativo**, corregir identificador con prefijo y espacio |
| 26/808 | KOMTES | `256OF4966` | Ausente | **Distinto**, ID 2903 | Mantener en revisión, NO asociar este archivo al pedido registrado |
| 26/811 | RELUZ | `6102636` | Incluido | Igual, ID 2907 | Correcto |
| 26/814 | FANDUCT | `6002057` | Incluido | Igual, ID 2910 | Correcto |
| 26/816 | GUARCONSA | `6363838` | Incluido | Igual, ID 2912 | Correcto |
| 26/821 | GRUPO JARAMA | `6309096` | Incluido | Igual, ID 2917 | Correcto |

- SHA actual 26/808 adjunto: `3028b3b3a291f56f0fee77d9bdc5dd0803ef8783ada0f156842c3ce7cfbf9e9a`.
- SHA en Supabase para el pedido 26/808: `5659419205a8aaa243352e84ae3bb697b9c7bbc0eb53b24868b7cd838b5df9a8`. **La diferencia no prueba una modificación de contenido comercial, pero impide atribución automática y debe investigarse.**
- SHA 26/805: `1127cbbade8d1303d8e9989dc3eb0881b0ea67068be8c1436a4078a46bdc1687`, coincide con BD.
- Los seis XLSX contienen la referencia de oferta en `HOJA PEDIDO!D4` precedida de `PEDIDO SEGÚN OFERTA Nº`.

## Correcciones del lector y la auditoría
1. `offer_reference.js`: reconoce prefijo alfabético corto separado por espacio: `A 44120` **sin perder el espacio**, conservando `256OF4966` y códigos con guiones. No captura la siguiente palabra libre (p.ej. `ENTREGAR`).
2. `historical_offer_backfill.js`: añade índice por nombre **solo para diagnosticar**, nunca para aceptar una oferta. Si coincide el nombre pero no el SHA-256, se indica explícitamente la incidencia en pantalla/CSV y se excluye de la escritura.
3. La auditoría CSV exporta también las filas de pedidos verificables en archivo pero **sin oferta detectada**, con denominación «Oferta no detectada», porque no equivale a «no existe oferta». Se conservan incidentes de Excel ajenos al histórico.
4. Versionado nuevo de módulos y HTML para invalidar caché.
5. Test `tests/offer_variants_805_808.test.mjs` y refuerzo de `tests/historical_offer_backfill.test.mjs` cubren los seis formatos y casos negativos.

## Pruebas y límites
- 12/12 comprobaciones de formatos de referencia y observaciones, incluidas negaciones, contradicciones y espacios.
- 15/15 verificaciones de integración con las seis cabeceras y sintaxis de módulos.
- 5/5 escenarios de recuperador sintético (hash/nombre, no detectados, ajenos, incidentes).
- SQL leído al terminar: **2.915 pedidos, 11.729 líneas, 0 ofertas guardadas, 0 auditorías**. **Ninguna oferta se ha escrito en BD durante esta ronda**.
- Los XLSX originales no se guardan en GitHub ni en Supabase. El flujo de recuperación exige consentimiento del administrador.
- `main` queda intacta; publicación estática exclusivamente por `gh-pages`, sin workflow propio de GitHub Actions.

## Siguiente acción
Actualizar web con Ctrl+F5, volver a escanear ZIP `2026.zip`, revisar «Oferta no detectada» y el nuevo CSV de incidencias. Comprobar que `26/805` muestra `A 44120`. `26/808` solamente puede asignarse cuando se disponga del XLSX **con SHA igual al registrado** o mediante una revisión manual autorizada con un procedimiento de corrección de procedencia separado.
