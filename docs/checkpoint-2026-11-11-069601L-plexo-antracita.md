# PROSOEL Costes — Unificación confirmada de 069601L

**Fecha:** 11/11/2026  
**Referencia:** `069601L`  
**Proveedores:** GRUPO RIAS (ID 9) y GRUPO JARAMA (ID 1)  
**Descripción efectiva solicitada:** **Caja con membranas Plexo modular - 1 elemento - Antracita**

## Alcance histórico verificado

- **10 pedidos distintos**, de los cuales 9 son de GRUPO RIAS y 1 de GRUPO JARAMA.
- **11 líneas**, debido a que el pedido 26/294 de RIAS tiene dos líneas de la misma referencia.
- Último pedido: **26/853**, GRUPO RIAS, **10/11/2026**.
- Último precio neto RIAS: **2,7200 €/ud**.
- Precio neto del pedido 26/386 de JARAMA, 13/05/2026: **2,9920 €/ud**.
- Compra más antigua de RIAS 26/266 del 26/03/2026: **2,6050 €/ud** (PVP anterior de 5,21 €).
- Referencia comercial de ambos proveedores: **069601L**; no se han fusionado otras variantes de Plexo.

## Operación transaccional efectuada

Se validaron y bloquearon las 11 filas originales, sus referencias, el número de pedidos y la ausencia de revisiones preexistentes. Se preservaron todas las filas de `public.order_lines`, verificadas con hash del estado original previo y posterior.

Se registraron **3 correcciones efectivas** en `public.purchase_line_overrides` (revisión 1) para las líneas:
- 10941, pedido 26/386 de JARAMA: descripción abreviada `PL-COMP SUP CAJA 1 ELE ANTRACITA 069601L`.
- 10234, pedido 26/519 de RIAS: salto de línea en medio de `1 elemento`.
- 10876, pedido 26/294 de RIAS: salto de línea después de `1 `.

Las **8 líneas que ya tenían la descripción canónica** no se revisaron innecesariamente. Tres eventos de auditoría en `public.purchase_review_events` conservan motivo, actor y versiones anterior/posterior.

Se incorporaron **2 reglas de importación futuras** en `private.confirmed_import_normalization_rules`, limitadas por proveedor + referencia original exacta + descripción original con espacios normalizados, una por cada proveedor. No extrapolar a otros artículos ni colores.

Se ejecutó `private.reconcile_review_reference('069601L')` y se verificó que la referencia aparece agrupada en **un único texto efectivo**, **10 pedidos**, **11 líneas**, **2 proveedores** y **2,7200 €/ud** como último precio.

## Seguridad y alcance

- No se alteraron los Excel de pedidos, precios unitarios, PVP, descuentos, cantidades, ni importes.
- Las diferencias de precio entre proveedores se mantienen y están disponibles en el histórico.
- La cola técnica de Normalización puede mantener la referencia como candidata por participar dos proveedores, aunque `description_count=1`; no implica duplicidad en la búsqueda.
- No se necesitó modificar el frontend: la consulta de precios ya agrupa por descripción efectiva y referencia.
