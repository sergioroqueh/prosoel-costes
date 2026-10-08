# Corrección supervisada del histórico — CR20 (8 de octubre de 2026)

**Solicitada por el usuario:** sustituir la descripción comercial
`TUBO AISCAN-CR CORRUG.DBL.CAPA d.20 NG ++TUBO AISCAN++` por
`Tubo Aiscan-CR corrugado doble capa diámetro 20 negro` en las compras donde aparezca,
sin perder el origen histórico.

## Alcance exacto
- Se han encontrado **dos líneas**, ambas de **GRUPO RIAS** y referencia comercial `CR20`.
- Pedidos **26/122** (09-02-2026) y **26/078** (28-01-2026).
- En los XLSX originales la abreviatura incluye un **salto de línea** entre `NG` y `++TUBO AISCAN++`; la comparación se efectuó tras normalizar espacios y saltos de línea, sin cambiar otras descripciones.
- Ambas compras registran un **neto unitario histórico 0,167000 €**.
- Se creó un override **por línea** mediante `public.purchase_line_overrides`, con `corrected_description` y `corrected_reference=NULL`. El texto de `public.order_lines.description_original` no se ha modificado y es legible en «Ver origen».
- Se añadió un evento por línea en `public.purchase_review_events` (`id=25` y `id=26`, por conveniencia de auditoría; no dependen de esos IDs para funcionar) con `actor='assistant_on_user_request_2026-10-08'`, justificación, valor anterior y nuevo.
- Se recalculó la referencia `CR20` con `private.reconcile_review_reference('CR20')`, para mantener actualizada la cola de normalización.
- **0 cambios** en referencias, precios, cantidades, pedidos originales, PDFs/Excel, descuentos y datos de proveedor.

## Comprobaciones
- Consulta `public.order_lines_effective`: 2 líneas corregidas, 2 descripciones de origen conservadas, 2 pedidos distintos, mínimo y máximo neto `0.167000`.
- Ambos eventos de auditoría guardados.
- El histórico permite restaurar estos cambios individualmente desde el editor de normalización.
- No se ha añadido un proceso de corrección recurrente a futuros pedidos. Esta actuación alcanza únicamente las dos líneas existentes en el momento de la petición. Si vuelve a importarse la misma descripción abreviada podrá corregirse de nuevo o programarse una regla verificada aparte.

## Principio
El usuario puede encargar correcciones exactas al asistente, quien debe verificar qué compras coinciden, aplicar únicamente overrides auditables, garantizar que el dato de origen sigue accesible y crear este checkpoint en GitHub.
