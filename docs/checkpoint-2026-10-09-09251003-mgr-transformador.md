# Checkpoint PROSOEL Costes — unificación 9251003 / 09251003

Fecha: 2026-10-09

## Solicitud confirmada
El usuario indica que las referencias `9251003` (sin cero inicial) y `09251003` son exactamente el mismo material. Solicita usar **`09251003`** como referencia efectiva, y la descripción literal:

`Transformador MGR 150W 24V DC DALI/PUSH/1-10V`

## Alcance y comprobación de origen
Se identificaron **6 compras** y 6 pedidos del proveedor **RELUZ**, todas a neto unitario **53,900000 €**.
- 5 compras tenían referencia original `09251003`.
- 1 compra, pedido **26/564**, ID línea **10034**, tenía referencia original `9251003`.
- Una de las 6 compras (línea 5474, pedido 25/535) ya tenía exactamente la descripción solicitada y referencia correcta: no se tocó.

| Pedido | Línea | Referencia original | Descripción en Excel | Cantidad | Precio neto |
|---|---:|---|---|---:|---:|
| 24/238 | 4325 | 09251003 | TRANS FORMADOR 1 5 0 S 2 4 V (salto) DALI/PUSH/1-10V | 2 | 53,90 € |
| 25/535 | 5474 | 09251003 | Transformador MGR 150W 24V DC DALI/PUSH/1-10V | 3 | 53,90 € |
| 26/767 | 9884 | 09251003 | Transformador MGR 150W 24V DC (salto) DALI/PUSH/1-10V | 9 | 53,90 € |
| 26/564 | 10034 | **9251003** | Transformador MGR 150W 24V DC (salto) DALI/PUSH/1-10V | 1 | 53,90 € |
| 26/768 | 10042 | 09251003 | Transformador MGR 150W 24V DC (salto) DALI/PUSH/1-10V | 1 | 53,90 € |
| 26/219 | 10359 | 09251003 | Transformador MGR 150W 24V DC (salto) DALI/PUSH/1-10V | 1 | 53,90 € |

## Corrección aplicada
- Se comprobó que el conjunto tenía exactamente 6 líneas no excluidas, sin revisiones previas y sin modificaciones de precio; **5 requerían un cambio**.
- Se ejecutó primero una **simulación** transaccional con `ROLLBACK`: seis referencias y seis descripciones efectivas uniformes; 6/6 precios preservados; código fuente `9251003` intacto.
- Se aplicó después una única transacción con cinco operaciones mediante el mecanismo existente `private.apply_purchase_line_review` bajo sesión de administración, con verificaciones de revisión y estado.
- Los overrides efectivos en `purchase_line_overrides` y los cinco eventos en `purchase_review_events` permiten revisar y revertir cada corrección.
- La compra originalmente `9251003` mantiene ese valor en `supplier_reference_source`, mientras `supplier_reference` efectivo pasa a **`09251003`**, preservando el cero inicial.
- Todas las líneas quedan con descripción efectiva **`Transformador MGR 150W 24V DC DALI/PUSH/1-10V`**.

## Resultado verificado
- Consulta `public.search_costs_enriched('09251003')`: **1 resultado**, 6 pedidos, último neto **53,90 €**, último proveedor RELUZ.
- Consulta `public.historical_price_history_filtered_review`: **6 líneas**, 6 pedidos, 5 textos fuente distintos y el código fuente `9251003` visible en una compra.
- Auditoría: **5 eventos**, revisiones 1 en las cinco compras modificadas. Sexta compra conserva revisión 0.
- Min y max neto: **53,90 €**. No se han modificado importes, cantidades, descuentos, obras, proveedor, fichero de origen ni documentos originales.
- No se requiere una actualización de código ni desplegar GitHub Pages: la web vigente utiliza los datos efectivos.

## Alcance futuro
La unificación solo se aplicó a estas seis compras existentes. Futuras importaciones bajo `9251003` no cambian automáticamente; necesitarán revisión o una regla supervisada aprobada.
