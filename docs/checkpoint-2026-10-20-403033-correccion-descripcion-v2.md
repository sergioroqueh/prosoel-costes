# PROSOEL Costes — Corrección v2 de descripción 403033

**Fecha:** 2026-10-20. **Base:** Supabase `kusbndefngttaiytcrui`.

## Petición y cambio efectivo
El usuario ha rectificado expresamente la descripción confirmada anteriormente de la referencia **`403033`**.

**Anterior:** `Diferencial TX3 - 2P - 230V - 30mA - 40A - Tipo AC - Legrand`

**Nueva descripción exacta:** `Diferencial TX3 2P - 40A - 30mA - Tipo AC - Legrand`

## Auditoría y ejecución
- **35 líneas**, **34 pedidos**. La referencia y todos los datos de compra originales quedaron sin cambios.
- Se confirmó el estado anterior: las 35 compras estaban en revisión 1, con la descripción antigua, y había exactamente **4 reglas activas**, IDs 257–260.
- Se comprobó la huella MD5 de las filas fuente originales ordenadas por ID: `cc85a4bff432dd097dff23ee1e3d0f34`.
- Simulación SQL `BEGIN/ROLLBACK` correcta, con **35 correcciones**, **4 reglas** actualizadas y **70 eventos acumulados**, fuente inmutable. Verificación de rollback: 35 líneas siguieron en revisión 1 antes de ejecutar el commit.
- Operación final en una transacción SQL `BEGIN/COMMIT` con bloqueo de las líneas fuente, de los overrides y de las reglas, precondiciones de revisión y hash, y comprobaciones posteriores.
- Se actualizaron las **35** entradas de `public.purchase_line_overrides` a la descripción v2, `revision=2`, conservando `corrected_reference=NULL` y `excluded=false`.
- Se añadieron **35 eventos** a `public.purchase_review_events` que registran la transición de la descripción v1 a v2. Los **35 eventos v1** permanecen conservados.
- Las cuatro reglas existentes en `private.confirmed_import_normalization_rules` (**257, 258, 259 y 260**) conservan su alcance (proveedor + referencia + descripción de origen), sus evidencias y estado activo. Solo se cambió su descripción de destino a v2 y se añadió la aprobación de la rectificación a la información de procedencia.
- Se ejecutó `private.reconcile_review_reference('403033')`.

## Verificación independiente tras commit
- Una sola descripción efectiva en `public.order_lines_effective`: **35 líneas, 34 pedidos, todas en revisión 2**.
- Neto mínimo **17,8542 €/ud**, máximo **21,3225 €/ud**, **125 unidades**, importe histórico **2.496,8976 €**, sin modificaciones.
- Cuatro reglas de importación activas con destino v2.
- Eventos de auditoría: 35 de revisión 1 y 35 de revisión 2.
- Hash original sin cambios: `cc85a4bff432dd097dff23ee1e3d0f34`.

## Alcance
Ninguna modificación de las compras originales, ni de la referencia fuente, ni de las reglas de coincidencia ni de la salvaguarda de precios. No hay modificación del frontend ni se requiere despliegue de GitHub Actions. La prueba se hizo con transacciones SQL y verificaciones de los datos reales; no se ha ejecutado un pedido nuevo autenticado.
