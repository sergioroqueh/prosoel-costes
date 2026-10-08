# PROSOEL Costes — checkpoint V15 (8 octubre 2026)

## Petición original
- En las búsquedas enriquecidas, mantener **referencia original del almacén** como título principal (ej. `PNZ-CIT 250 IB s/Fus PLET TRAF+CONEX INT`), y colocar la descripción técnica ampliada como contenido secundario para ayudar a comprender y localizar.
- Mantener nombre abreviado original y texto completo del Excel para búsquedas y procedencia.
- No obligar al responsable de presupuestos a documentar manualmente cada nuevo artículo tras importar pedidos.

## Cambios frontend
- `app/static/app.js`:
  - Título principal cuando hay nombre enriquecido: `row.reference || row.title`; sin enriquecimiento se mantiene la descripción original.
  - Tarjeta de resultados: descripción de ayuda + descripción observada en pedido como metadatos.
  - Ficha de detalle: encabezado con código original y bloque separado «Descripción de ayuda / búsqueda» con nombre ampliado, texto fuente y, únicamente cuando hay URL guardada y validada, enlace a documentación del fabricante.
  - Vista Importar pedido: indicador de cola de enriquecimiento mediante RPC `material_enrichment_overview`, refrescado al consultar importaciones y después de registrar nuevos pedidos. No afirma documentación externa automática.
- `app/static/index.html`: resumen de enriquecimiento antes de subir Excel. Recursos `v=20261008-v15`.
- `app/static/styles.css`: diseño del resumen responsive.

## Migraciones SQL guardadas
- `20261008_030_auto_enrichment_queue.sql`:
  - `public.material_enrichment_queue`, con un registro por `commercial_item_id`, descripción y código de origen, estado, señales técnicas derivadas y campo opcional para evidencia externa; RLS de lectura.
  - `private.extract_material_search_signals(text,text)`: extrae únicamente datos observables de cable (familia, G/X, conductores, sección) e IP, sin inventar prestaciones ni verificar fabricante.
  - Trigger `trg_queue_new_commercial_material` AFTER INSERT en `public.commercial_items`. Por eso cada material **nuevo** importado crea automáticamente su registro de preparación; compras repetidas conservan su ficha existente.
  - Backfill de la base histórica previa, excepto conceptos claramente RAEE, ecotasas, portes, transporte o servicios.
- `20261008_031_enrichment_overview.sql`: `public.material_enrichment_overview()`, consulta segura de métricas autenticadas.

## Datos al cerrar
- **5.032** artículos comerciales en cola de enriquecimiento.
- **5.031** en estado `waiting_for_evidence`, **1** perfil ampliado publicado (Pinazo).
- **590** con algunas señales técnicas extraídas automáticamente del pedido, entre ellas **277** con familia de cable detectada.
- No se han editado pedidos, precios, datos originales ni aprobado equivalencias.
- No se guardan documentos Excel ni se sustituye ningún código comercial.

## Test reversible
- Se introdujo temporalmente, dentro de una transacción con `ROLLBACK`, un artículo comercial ficticio `TEST-QUEUE-RZ1-K`, descripción `CABLE RZ1-K 0,6/1kV 5G6 BOBINA`.
- El trigger creó automáticamente un candidato con familia `RZ1-K`, 5 conductores, designación `G`, sección 6 mm², y conservó la descripción original.
- Después del rollback, `fake=0`. Se ha probado además el acceso a las métricas desde contexto autenticado.
- Todos los candidatos continúan localizables en la búsqueda histórica como siempre, aunque no tengan descripción ampliada.

## Limitación explícita — DOCUMENTACIÓN DE FABRICANTES
**La cola no es un investigador autónomo**: registra y prepara las nuevas referencias, y clasifica algunas señales de los textos. No busca ni verifica fichas web por sí sola.

Para cubrir cientos/miles de artículos sin trabajo manual habrá que implementar en otra fase un enriquecedor externo programado (p. ej. GitHub Actions + proveedor de búsqueda/IA o Supabase Edge Function + buscador). Este agente debe:
1. Detectar fabricante/referencia, distinguir código de almacén de referencia oficial.
2. Consultar solo fuentes verificables, priorizando la web oficial y el PDF del fabricante.
3. Guardar URL, fecha, prestaciones contrastadas y estado de confianza.
4. Publicar descripción técnica ampliada únicamente con una identidad sustentada; si hay ambigüedad, dejar pendiente, nunca inventar equivalencia.
5. Mantener originales intactos y auditar la incorporación.

Este servicio **todavía no existe/está conectado**. Puede requerir claves de servicio y coste externo y no se promete su ejecución en segundo plano hasta instalarlo.

## Prueba de importación end-to-end (transaccional)
- Se ejecutó la RPC real `public.import_new_prosoel_order` con un pedido ficticio 27/98976 y una línea de cable `H07Z1-K 1,5 MM AZUL`, dentro de una transacción con `ROLLBACK`.
- El importador creó automáticamente el registro de cola en estado `waiting_for_evidence` y detectó familia `H07Z1-K`, 1 conductor, 1,5 mm².
- Confirmación posterior fuera de la transacción: **0 pedidos ficticios y 0 candidatos ficticios**. Ningún pedido de prueba persiste.
- En la UI, las métricas distinguen `Sin ficha externa contrastada` de `Nombres de ayuda publicados`, para no atribuir investigación que aún no se ha realizado.
