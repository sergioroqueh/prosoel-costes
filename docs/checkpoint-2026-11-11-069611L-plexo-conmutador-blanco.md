# PROSOEL Costes — Unificación de la referencia 069611L (blanco)

**Confirmación:** 11/11/2026  
**Proveedor:** GUARCONSA (supplier_id=2)  
**Descripción efectiva solicitada literalmente:** **Conmutador Plexo modular - IP55- IK08 - 10AX - 250V - Blanco**

## Historial preservado

| Pedido | Fecha | Línea ID | Descripción original | Neto unitario | Cantidad |
|---|---|---:|---|---:|---:|
| 26/848 | 06/11/2026 | 11800 | Conmutador Plexo modular - IP55- IK08 - 10AX - 250V - Blanco | 8,2300 € | 2 |
| 25/517 | 21/07/2025 | 6685 | Conmutador Plexo modular, 10AX, blanco | 6,0060 € | 1 |

Dos pedidos, dos líneas originales y dos variantes textuales del proveedor con la misma referencia `069611L`.

## Cambio aplicado en Supabase

Se realizó una operación transaccional con comprobación cerrada de ambas líneas, proveedor, referencia, ausencia de revisiones anteriores y comparación de hash de las filas originales antes y después.

- **1 corrección efectiva:** línea 6685, mediante `public.purchase_line_overrides`, revisión 1, referencia intacta, solo descripción corregida.
- **1 evento de auditoría:** `public.purchase_review_events`, con el motivo, actor y estado previo/posterior.
- La línea 11800 ya tenía exactamente el texto solicitado, por lo que no se revisó artificialmente.
- **2 reglas futuras** en `private.confirmed_import_normalization_rules`, IDs **648** y **649**, específicas de GUARCONSA + `069611L` + cada descripción origen exacta (espacios normalizados).
- Se ejecutó `private.reconcile_review_reference('069611L')` para actualizar la cola técnica.
- Verificación final sobre `public.order_lines_effective`: **una única entrada**, **dos pedidos**, **dos líneas**, fecha más reciente **06/11/2026** y último neto **8,23 €/ud**.

**Intactos:** textos originales de pedidos, referencias de origen, precios, PVP, descuentos, cantidades, totales e históricos. Tampoco se modificó Drive ni se necesitó despliegue frontend: la búsqueda agrupa por referencia y descripción efectiva.

## Alcance de la regla

No extender esta equivalencia por coincidencia parcial a otros colores o referencias. Las reglas se aplican únicamente cuando coinciden proveedor, referencia y descripción origen, y mantienen los controles de precio del importador.
