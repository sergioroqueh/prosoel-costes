# PROSOEL Costes — unificación downlight NEW DISC, referencia 10101240

Fecha: 2026-10-09.

## Solicitud

Unificar los dos materiales mostrados en el buscador bajo la misma referencia comercial `10101240`, con descripción efectiva exacta:
`Downlight NEW DISC 12W 4000K Blanco IP44 Deluxe`.

La denominación «NEW DISC», «IP44» y «Deluxe» ha sido **indicada por PROSOEL**; las descripciones históricas originales solo mencionaban disco de 12 W y 4000 K blanco, por lo que no se debe presentar ese detalle comercial como una ficha de fabricante verificada automáticamente.

## Compras y precios originales

- Pedido **24/1093**, 2024-12-05, GRUPO RIAS, línea **2684**, referencia fuente `10101240`; descripción fuente `DOWNLIGHT EMPOTRAR DISCO 12W 4000KBLANCO /E`; **4 unidades**, neto **7,580000 €/ud**.
- Pedido **24/824**, 2024-08-30, GRUPO RIAS, línea **3872**, referencia fuente `10101240`; descripción fuente `DOWNLIGHT EMPOTRAR DISCO 12W 4000K\nBLANCO /E`; **18 unidades**, neto **7,580000 €/ud**.

## Procedimiento

1. Se comprobaron las dos líneas originales, proveedor, referencias, cantidad, precio neto, revisión 0 y ausencia de correcciones previas/exclusiones.
2. Simulación con transacción `ROLLBACK`: 2/2 bajo la nueva descripción, 2/2 precios originales preservados, 2/2 textos de Excel conservados, 2/2 revisiones auditadas.
3. Transacción definitiva usando `private.apply_purchase_line_review` para corregir **solo la descripción efectiva** en ambos artículos. Referencia efectiva permanece en `10101240`. No se modificó `public.order_lines`, ni precio, cantidad, PVP, descuentos, fecha o pedido.
4. Se grabaron **2 eventos** en `public.purchase_review_events`, con justificación, para posibilitar auditoría y reversión.

## Verificación posterior

- `public.search_costs_enriched('10101240')`: **un único resultado** con el título solicitado; **2 pedidos**, **2 líneas**, último precio neto **7,58 €/ud**, último proveedor GRUPO RIAS.
- `public.historical_price_history_filtered_review`: **2 líneas/2 pedidos**, ambos precios 7,58 €/ud y **2 textos de origen distintos** aún accesibles.
- Auditoría: **2 eventos** asociados a los IDs 2684 y 3872.
- No se cambió la aplicación ni el esquema de Supabase: las correcciones son datos efectivos y pueden verse recargando PROSOEL Costes.

## Futuro

Estas dos compras quedan agrupadas, sin implementar una regla automática para nuevas importaciones. Cualquier nueva variante deberá comprobarse antes de unificarla.
