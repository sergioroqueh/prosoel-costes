# PROSOEL-Costes — corrección del lector de ofertas en OBSERVACIONES (26/10/2026)

## Evidencia original
Archivo adjunto: `Pedido -06- HERMAFER CALLE SIERRA (repartidores) 2-01-25 RIAS xlsx.xlsx`.

Inspección de `HOJA PEDIDO`:
- D4 (celda completa): `OBSERVACIONES\n\n\n\n\nPEDIDO SEGÚN OFERTA Nº  5100012\n\n\nENTREGAR PEDIDO EN DIRECCION DE OBRA`.
- Cabecera de la tabla de partidas: fila 17.
- Referencia del pedido en A11/C11: `25/` + `06`.
- Proveedor: GRUPO RIAS; obra: HERMAFER CALLE SIERRA.
- SHA256 original: `eb471112091adfac96d52fa5b91c46fb3d9eb02031a341f3ce17f274b613febd`.
- Registro Supabase de solo lectura: `public.orders.id=1976`, referencia `25/06`, mismo SHA-256 y mismo nombre de archivo; oferta actualmente `NULL` antes de recuperación.
- CSV adjunto `PROSOEL_Auditoria_Ofertas_Historicas.csv`: solo fila de cabecera, sin ofertas ni incidencias, compatible con la falta de reconocimiento de este formato.

## Incidencia
La versión previa de `app/static/offer_reference.js` detectaba `Nº OFERTA` solo como etiqueta en columna A con valor C/B. No inspeccionaba el campo `OBSERVACIONES` en D4, por lo que omitía la oferta real 5100012.

## Corrección
- Nuevo `extractOfferFromObservations` que extrae referencias **solo** tras frases explícitas como `SEGÚN OFERTA Nº`, `OFERTA Nº` y `Nº DE OFERTA`.
- `extractSupplierOfferReference` busca además en las columnas D:G de las primeras 16 filas de la cabecera, siempre que la celda contenga la palabra `OBSERVACIONES`.
- Preserva los ceros iniciales y códigos alfanuméricos, verifica un único valor consistente, no inventa para `SIN OFERTA`, `PRECIO DE REFERENCIA` ni cifras ajenas.
- Se conserva la lectura de ofertas explícitas antiguas A/C. No se leen las partidas como oferta.
- Reglas compartidas por la importación de futuros pedidos y el recuperador por ZIP histórico.
- Versionado de imports JavaScript y app para evitar caché vieja.
- Test `tests/offer_observaciones_25_06.test.mjs` con D4 y casos negativos.
- No se modifican precios, cantidades, números de pedido, archivos originales ni sus SHA.

## Publicación y situación de datos
Se publica en `gh-pages` tras pruebas aisladas. `main` sin cambios y no se crean GitHub Actions propios. No se atribuye la oferta a otros pedidos sin cotejo de archivo.
Esta corrección **no rellena por sí sola** el registro 1976: la actualización debe pasar por el módulo de recuperación con consentimiento de administrador y su auditoría obligatoria. Volver a escanear los ZIP originales con Ctrl+F5.
