# Auditoría de ofertas 2026 — ZIP original del 03/11/2026

## Alcance y resultados reales

Fuente local del usuario: `2026(2).zip`, 868 archivos `.xlsx` (todos legibles). No se ha subido el ZIP ni ninguna observación de pedido a GitHub.

- 591 Excel con al menos una referencia de oferta explícita en `OBSERVACIONES (D4)`.
- 620 referencias individuales extraídas.
- 26 Excel contienen múltiples referencias.
- 248 Excel no mencionan "oferta" en D4.
- 29 mencionan "oferta" sin un código reconocible. Algunos solo contienen `OFERTA Nº` vacío.
- 22 archivos difieren entre número del nombre y el número interno de C11.
- 1 Excel se denomina `ANULADO` y 3 presentan fechas de nombre que requieren revisión.
- Tras aplicar exclusiones de identidad/anulación/fecha, 574 Excel y 603 códigos forman el lote preliminar conservador para cotejo SHA.

## Huellas y riesgos

Los 868 SHA-256 del ZIP **no** coinciden como conjunto con los 868 registrados en `public.orders` de 2026. Son muestras/versión diferentes pese a tener igual cardinalidad.

Por ello, nunca se actualizan pedidos por coincidencia del nombre, número o proveedor. La nueva RPC administrativa `record_2026_supplier_offer_references` exige simultáneamente `source_sha256`, `source_filename` y `order_year=2026`, además de comprobar el número de oferta dentro del texto original. Cada lote devuelve conteos de Excel sin coincidencia y referencias descartadas.

**No** se ha ejecutado la migración en producción, no se han importado las 603 referencias, no se ha alterado ningún precio ni realizado despliegue.

## Flujo de producción previsto

1. Aplicar migraciones `066` (documentos PDF verificados) y `067` (referencias múltiples), en ese orden, tras revisión.
2. En `Importar pedido`, usar el panel desplegable «Recuperar números de oferta de pedidos 2026» y cargar el lote JSON preparado a partir de los originales. Se exige confirmación expresa.
3. Comprobar los resultados por lote: registros insertados, ya existentes, SHA sin coincidencia y rechazados. Registrar las excepciones para revisión humana.
4. Verificar con sesiones autorizadas de Sergio, Israel e Ignacio: `Consultar precios` y `Buscar pedido` (por número y obra).
5. Para nuevos Excel, el importador busca ofertas en D4 y registra todas las reconocidas mediante la misma RPC tras importar el pedido. Si el segundo paso falla, ofrece reintentar solo las referencias sin duplicar el pedido.
6. Los PDF de las ofertas siguen siendo un vínculo documental separado que **no** se deduce a partir de albaranes.

## Pruebas

- Prueba local del parser: 16 formatos reales y casos negativos PASS.
- Verificación local del lote JSON: 574 entradas y 603 referencias superan sintaxis de código, SHA, estructura y comprobación de que el código figura en la observación original.
- Tests de regresión versionados `tests/supplier_offer_refs_2026.test.mjs` y `tests/offer_documents_2026.test.mjs`; pendientes de CI/ejecución completa sobre la rama de integración.
- No se han probado aún las políticas de RLS ni una importación real en Supabase.

## Principios

- Las ofertas son N:1 respecto al pedido; una oferta puede también reutilizarse en varios pedidos.
- Una referencia de oferta puede cubrir más de una partida, por lo que no se asigna automáticamente a una única línea de material.
- Los códigos se guardan como texto literal (p. ej. `O26/9`, `AL/734394`, `A 44120`), sin eliminación de ceros ni conversiones numéricas.
- Mantener `orders.supplier_offer_reference` sin sobrescribir y permitir lectura retrocompatible.
