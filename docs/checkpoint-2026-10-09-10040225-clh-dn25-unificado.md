# Checkpoint PROSOEL Costes — unificación de tubo CLH DN25 gris RAL 7035 (2026-10-09)

## Petición
Unificar los cinco resultados de búsqueda de tubo corrugado CLH DN25 Gris RAL 7035, actualmente repartidos entre referencias `10010225` y `10040225`, bajo:

- Referencia efectiva definitiva: **`10040225`**
- Descripción efectiva exacta: **`Tubo corrugado CLH libre de halógenos, DN25 en color Gris RAL 7035`**

Regla: **unificar solamente referencia y descripción; conservar cada precio neto real, cantidad, proveedor, origen y descuento del pedido**.

## Inventario antes de ejecutar
**14 líneas**, cada una correspondiente a un pedido distinto. 6 de GRUPO RIAS y 8 de GRUPO JARAMA.

- GRUPO RIAS (6): netos unitarios: `0,239` (1 pedido), `0,240` (4 pedidos), `0,300` (1 pedido).
- GRUPO JARAMA (8): `0,361` (6 pedidos), `0,373` (2 pedidos).
- Una línea, ID **9899**, pedido **26/555** de GRUPO RIAS, tenía la referencia original y efectiva **`10010225`** con `TUBO CLH DN25 GRIS 7035`, neto 0,239 €/ud. La referencia se corrigió a **`10040225`**, sin borrar el valor de origen.
- Existían diferencias de texto entre pedidos (abreviación `TUBO CLH DN25 GRIS 7035`, saltos de línea ante 7035, texto `RAL7035.` sin espacio, y descripción extensa sin punto).
- **2 compras de JARAMA** (IDs **1652 y 1865**) ya tenían exactamente el título solicitado y referencia 10040225: no se generaron eventos nuevos sobre ellas.
- Ninguna de las 14 líneas presentaba overrides previos al inicio.

## Simulación y operación
1. Una primera simulación transaccional cancelada detectó correctamente que las dos líneas ya coincidentes no necesitaban corrección. No produjo escrituras.
2. Nueva simulación **con ROLLBACK** para las **12 líneas que realmente requerían cambios**: validó 14/14 bajo la misma referencia y descripción, el código original de la línea 9899 conservado, todos los netos y revisiones correctos.
3. La transacción definitiva repitió comprobaciones estrictas de IDs, referencias originales, proveedor, descripciones fuente, precios y ausencia de revisiones anteriores, y aplicó **12 correcciones mediante `private.apply_purchase_line_review`**.
4. La operación guardó overrides y eventos individuales en `purchase_review_events` para las 12 líneas. La tabla `public.order_lines` (originales del Excel) no se modificó.

**IDs modificados:** `980, 1078, 1797, 2462, 5776, 5888, 5895, 6066, 6421, 6643, 7717, 9899`. **IDs que ya estaban bien:** `1652, 1865`.

## Verificaciones posteriores
- `public.search_costs_enriched('10040225')`: **un solo resultado**, título exacto, referencia 10040225, **14 pedidos y 14 líneas**, último neto **0,239 €/ud**, último proveedor **GRUPO RIAS**.
- `public.historical_price_history_filtered_review('10040225', descripción, ...)`: **14 líneas/14 pedidos**, mínimo neto **0,239 €/ud**, máximo **0,373 €/ud**; se conservan **4 descripciones originales distintas** y la referencia original `10010225` en 1 línea.
- Conteo efectivo de netos: 0,239 € × 1; 0,240 € × 4; 0,300 € × 1; 0,361 € × 6; 0,373 € × 2.
- 12 revisiones con auditoría (revisión 1); 2 líneas existentes sin intervención.
- No se tocaron descuentos, importes, cantidades, códigos de origen, fechas, proveedores, documentos Excel ni medidas de otras secciones de tubo.

## Alcance
La corrección es sobre los registros existentes, no es una regla para importaciones futuras. No se necesitó desplegar código: la web ya utiliza las vistas y funciones SQL con correcciones efectivas.
