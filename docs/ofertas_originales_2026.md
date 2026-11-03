# Ofertas originales de proveedor, solo pedidos 2026

La tabla `order_offer_documents` es una **capa adicional**: no altera `orders`, `order_lines`, las RPC de precios, ni la sincronización de albaranes.

## Vinculación segura
1. Buscar **la oferta comercial del proveedor**, no el albarán, factura o pedido PROSOEL.
2. Confirmar en el documento el proveedor, el pedido/obra o referencia de oferta y, si procede, la línea/material.
3. Añadir su ID real de Google Drive al pedido de 2026, inicialmente como `pending`.
4. Solo después de la revisión documental marcar `verified`, anotando `verified_by` y `verified_at`. La web **solo muestra los verificados**.
5. Si una oferta incluye varias líneas del pedido, se muestra un único enlace por pedido en «Buscar pedido» y el mismo PDF desde cada compra correspondiente en «Consultar precios». Si hay dos ofertas válidas, se muestran ambas.
6. Verificar que Sergio, Israel e Ignacio tienen permisos de lectura sobre esos archivos en Drive. La RLS de Supabase protege el índice, pero **Google Drive controla la lectura del PDF**.

## Evidencia y falsos positivos
La carpeta `ALB. 2026` contiene albaranes. Por ejemplo, `RIAS 26-830.pdf` figura como **Albarán** en su propio contenido. No se vincula como oferta. El nombre `CABLECEL 26-828.pdf` tampoco acredita por sí solo que sea una oferta.

## Ejemplo (no ejecutar sin revisar el documento original)

```sql
insert into public.order_offer_documents
  (order_id,drive_file_id,filename,offer_reference,review_status)
select o.id, '<ID_DE_DRIVE_VERIFICADO>', '<NOMBRE_REAL>.pdf', '<REF_PROVEEDOR>', 'pending'
from public.orders o
where o.order_year=2026 and o.order_reference='26/828';
```

Tras verificar contenido y acceso, pasar el registro específico a `verified` mediante una revisión administrativa controlada. Nunca marcarlo por coincidencia de nombre.

## Despliegue
- Aplicar la migración **antes** de publicar la interfaz para evitar avisos de tabla ausente.
- No cargar ofertas 2024/2025.
- Probar pedidos con oferta, sin oferta, con múltiples PDFs, búsquedas por obra y comparativa de materiales; comprobar perfiles de acceso y el retorno a producción.
- Si se retira la interfaz, ninguna compra histórica cambia. No borrar la tabla sin conservar antes su trazabilidad.
