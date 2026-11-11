# PROSOEL Costes — Unificación confirmada de 069692L

**Fecha:** 11/11/2026  
**Referencia:** `069692L`  
**Proveedor:** GUARCONSA (supplier_id=2)  
**Descripción efectiva confirmada por el usuario:** **Marco de empotrar Plexo modular, 1 elemento, blanco**

## Compras identificadas y precios intactos

| Pedido | Fecha | Línea | Descripción original | Precio neto €/ud |
|---|---|---:|---|---:|
| 26/848 | 06/11/2026 | 11799 | Marco de empotrar Plexo modular blanco - 1 elemento | 7,20 |
| 26/733 | 25/09/2026 | 10934 | Marco de empotrar Plexo modular, 1 elemento, blanco | 7,20 |
| 25/143 | 03/03/2025 | 8162 | Marco de empotrar Plexo modular, 1 elemento, blanco | 5,6540 |

## Actuación ejecutada y verificada

- Una corrección de descripción efectiva sobre la **línea 11799** en `purchase_line_overrides`, revisión 1, sin cambiar referencia ni marcar exclusión.
- Evento asociado en `purchase_review_events` con motivo, actor y estados anterior/posterior.
- Las líneas 10934 y 8162 ya usaban el texto canónico: **no se alteraron**.
- Dos reglas específicas de importación confirmada (`private.confirmed_import_normalization_rules`, IDs 639 y 640) limitadas a GUARCONSA + 069692L + cada una de las dos descripciones originales observadas. No se crean equivalencias para otro color, modelo ni proveedor.
- Actualizado el estado de la cola de revisión de esta referencia sin editar arbitrariamente candidatos.
- Comprobación posterior: **1 única descripción efectiva**, **3 pedidos históricos**, **3 líneas**, última fecha 06/11/2026, último neto **7,20 €/ud**; se preservaron los tres precios, cantidades, descuentos, PVP, importes y textos de procedencia.
- La búsqueda agrupa por `supplier_reference` + descripción efectiva normalizada, por lo que presenta **una sola tarjeta** con 3 pedidos.
- La regla de importación futura solo aplica a la combinación exacta de proveedor, referencia y descripción origen. El motor mantiene sus controles de precio y el Excel original no se modifica.

**No se alteró** `public.order_lines`, `public.orders` ni los precios registrados; no hizo falta actualizar archivos estáticos de la aplicación.
