# CHECKPOINT — referencia de oferta opcional en pedidos (2026-10-26)

## Solicitud
Mostrar, junto al número de pedido, el número de oferta del proveedor **solo cuando conste**, tanto al buscar por número como en los pedidos desplegables de una obra. No mostrar etiqueta/hueco para pedidos sin oferta.

## Hallazgo crucial: los originales ya importados no guardaban oferta
- Comprobado `public.orders` antes del cambio: no tenía ningún campo `offer`, `oferta` o `quote`.
- 2.915 pedidos en el histórico, incl. `26/820` (LYMA / CADIELSA), con nombre de archivo y SHA-256, pero **sin XLSX originales almacenados en Supabase**.
- Los nombres históricos de los 2.915 archivos no incluían una oferta inequívoca. No se intenta extraerla del número de pedido ni del filename.
- El histórico seguirá con `supplier_offer_reference = NULL` hasta reabrir los Excel originales y recuperar el dato, verificando el hash y la procedencia. **No se han rellenado ofertas ficticias**.

## Implementación
1. Supabase: columnas `public.orders.supplier_offer_reference text NULL` y `supplier_offer_label text NULL`; migración `database/migrations/20261026_supplier_offer_reference.sql`.
2. `private.insert_new_prosoel_order(jsonb)` (administrador con control de autenticación previo) ampliada para persistir ambos campos opcionales; validación de longitud <=120. Se conservó el resto de su lógica, RLS y permisos.
3. `app/static/offer_reference.js`: extracción explícita de etiquetas del encabezado en columna A y valor en C (B alternativa cuando C vacía), antes de la tabla de líneas; conserva caracteres, ceros iniciales, y omite marcadores como SIN OFERTA, N/A, PRECIO DE REFERENCIA y vacío.
4. `app/static/order_import.js`: conserva `supplier_offer_reference` y la etiqueta original en el payload de futuros pedidos.
5. `app/static/app.js`: vista previa del importador muestra oferta del proveedor solo si existe.
6. `order_lookup.js` y `project_lookup.js`: consultas ampliadas a la columna opcional y etiqueta inline «Oferta: [referencia]» junto al número de pedido con escape HTML; ninguna etiqueta para NULL.
7. `index.html` incluye versionado nuevo de CSS y app para invalidar caché.
8. `tests/offer_reference.test.mjs` reproduce formatos, nulos, seguridad y las dos vistas.

## Auditoría realizada
- 19/19 pruebas del analizador puro (formatos positivos/negativos, sin oferta, ceros).
- 24/24 comprobaciones adicionales del JavaScript de las vistas, importador y escape HTML.
- 4/4 verificaciones de interfaz de obra con datos simulados (con y sin oferta, HTML escapado, filtro obra).
- SQL migración validada dentro de una transacción con `ROLLBACK`, antes de aplicarla. Luego aplicada y comprobada.
- Tras SQL: **2.915 pedidos**, **11.729 líneas** (conteo al momento de comprobación), 2 columnas nuevas, función actualizada, 0 ofertas históricas rellenadas.
- `authenticated` conserva SELECT de la columna, no UPDATE; RLS de `orders` habilitado.
- Sin prueba de navegador autenticado en producción ni importación real posterior a migración: este último requiere un XLSX de pedido verdadero con campo de oferta. No inferir «end-to-end validado» antes de esa prueba.

## Continuidad
- La nueva aplicación está lista para mostrar ofertas solo cuando Supabase tenga una referencia.
- Para poblar el histórico, recuperar archivos XLSX originales (no disponibles en GitHub/Supabase), verificarlos contra `source_sha256`, extraer únicamente etiquetas explícitas y revisar antes de escribir en BD.
- No tocar `main` ni instalar flujos propios GitHub Actions.
