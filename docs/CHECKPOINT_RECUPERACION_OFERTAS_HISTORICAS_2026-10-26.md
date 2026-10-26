# CHECKPOINT PROSOEL-Costes — Recuperación de ofertas de pedidos históricos
Fecha: 2026-10-26

## Petición
Recuperar los números de oferta de los pedidos antiguos (2024–2026) y mostrarlos en las dos vistas de Buscar pedido: por número y por obra. No inventar una oferta cuando no conste. Mantener íntegros PVP, descuento, neto, cantidad, referencias, proveedor, fecha, número de pedido e identidad histórica. Sin GitHub Actions propios.

## Fuentes originales
Los originales de la carga inicial se habían recibido en una conversación de 08/10/2026 como 2024.zip, 2025.zip y 2026.zip, con aproximadamente 1.104, 957 y 802 XLSX. El repositorio y la base conservan las huellas SHA-256 y nombres de archivo, pero NO almacenan los bytes de los XLSX. La búsqueda en archivos actuales del proyecto y en Library no encontró los ZIP originales. Los nueve libros multihora anexados al proyecto son agrupaciones de PRESUPUESTOS, no estos pedidos. Por tanto, no es posible afirmar que el histórico haya sido completado ni atribuir ofertas a sus pedidos sin recuperar esos ZIP.

## Implementación entregada
- Módulo \`app/static/historical_offer_backfill.js\`:
  - Abre 1–4 ZIP locales, hasta 600 MB/archivo, usando el descompresor propio ya presente.
  - Recupera en páginas de 1.000 el índice de pedidos con \`id\`, \`source_sha256\`, \`source_filename\`, \`supplier_offer_reference\`.
  - SHA-256 original EXACTO y comparación del nombre base de cada XLSX; divergencias quedan fuera y auditables.
  - Solo tras el match se extrae \`Nº OFERTA\` o \`REFERENCIA OFERTA\` de la cabecera \`HOJA PEDIDO\`.
  - Separa ofertas verificadas, Excel sin oferta explícita, existentes, hash ajeno, nombre distinto, archivo ilegible.
  - Vista previa con hasta 50 ofertas; nunca se suben ZIP/XLSX.
  - Botón Descargar auditoría completa (CSV), incluyendo todas las ofertas propuestas y las incidencias; celdas protegidas frente a fórmulas peligrosas.
  - Casilla de aprobación humana; sin casilla no hay cambios.
  - RPC de escritura en lotes de 50; solo campos de metadatos, sin precios ni materiales.
- \`app/static/order_import.js\` exporta el índice ZIP y el lector de oferta de cabecera, sin modificar la importación habitual.
- La sección solo aparece en la pestaña Importar pedido, reservada a administradores.
- Migración \`database/migrations/20261026_verified_offer_backfill.sql\` aplicada tras ensayo SQL con ROLLBACK.
  - Tabla \`public.order_offer_backfill_audit\`: con RLS y SELECT únicamente a administrador; ningún cliente tiene INSERT.
  - \`private.apply_verified_order_offers(jsonb)\` exige JWT autenticado + email habilitado como administrador; coteja ID, archivo, SHA y ausencia de conflictos antes de actualizar ÚNICAMENTE \`orders.supplier_offer_reference\`/\`supplier_offer_label\`.
  - RPC público invocador a la función privada. Rechaza sesiones sin administrador.
  - Registro de auditoría (qué oferta se añadió, fuente SHA, archivo, usuario, fecha).
- \`tests/historical_offer_backfill.test.mjs\` reproducible en Node 22 sin CI.
- Vista actual \`order_lookup.js\` y \`project_lookup.js\` ya muestran oferta únicamente si en BD aparece no nula, por el trabajo de la ronda anterior.

## Comprobaciones
- 17/17 verificaciones JavaScript iniciales y 15/15 verificaciones de regresión de un escenario sintético en motor JS: índice, 5 archivos (hash coincidente/ajeno, sin oferta, ya existente, nombre cambiado), no escritura durante previsualización, bloqueo sin confirmación, RPC tras aprobación, exclusión de cualquier campo de precio.
- SQL migration ensayo BEGIN/ROLLBACK PASS, aplicación en Supabase PASS.
- Negativa SQL: \`public.apply_verified_order_offers('[]')\` sin JWT devuelve 42501 «Solo administradores autorizados», PASS.
- Contrato DB: 2.915 pedidos y 11.729 líneas, 0 ofertas históricas, 0 auditorías registradas en ese momento. RLS activado; cliente autenticado no tiene INSERT en tabla de auditoría.
- No se ejecutó Node sobre los archivos GitHub por falta de conectividad a GitHub desde el contenedor. Se creó el test Node para reproducción futura. No se ha realizado el escaneo real ni un navegador autenticado con ZIP original, porque los archivos no están disponibles en esta sesión.

## Siguientes acciones con originales
1. Entrar en PROSOEL Costes con cuenta de administrador → Importar pedido → Recuperar ofertas de pedidos antiguos.
2. Seleccionar 2024.zip, 2025.zip y 2026.zip desde el ordenador y pulsar «Comprobar originales».
3. Revisar ofertas recuperables y las incidencias. Al confirmar, se guardarán solo las coincidencias exactas con auditoría; después aparecen en las dos vistas.
4. Analizar los casos restantes sin forzar asignaciones.
5. Si los ZIP no están disponibles, conservar TODO en modo preparado: no ejecutar rellenos presuntos.

## Publicación
- Publicación desde raíz de rama \`gh-pages\`; no se han añadido workflows de Actions.
- \`main\` intacta, sin merges. El trabajo se guarda en PR #1 de desarrollo y en rama independiente de respaldo.
