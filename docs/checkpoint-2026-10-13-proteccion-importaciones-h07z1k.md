# PROSOEL Costes — protección de importaciones futuras y reglas H07Z1-K

**Implementado:** 13/10/2026  
**Supabase:** `kusbndefngttaiytcrui`  
**Ámbito inicial:** H07Z1-K; extensible a otras familias sin modificar datos de origen.

## Estado real

La ruta pública de importación `public.import_new_prosoel_order(jsonb)` ahora hace, en una **única transacción**:

1. Importa el nuevo pedido mediante la función existente `private.insert_new_prosoel_order`, que valida administrador, hash de archivo, numeración, cantidades e importes. La línea original se guarda sin cambios.
2. **Solo cuando el resultado es `imported`**, ejecuta `private.apply_confirmed_import_rules(imported_order_id)`.
3. La normalización busca coincidencia por **proveedor + referencia original exacta + descripción original con espacios normalizados**.
4. Cada regla aprobada contiene referencia y descripción efectiva de destino, con trazabilidad de cuántas compras verificadas la respaldan.
5. Antes de aplicar, compara el precio neto del pedido nuevo con el histórico del **mismo proveedor, referencia efectiva y descripción normalizada**. Si hay al menos tres comparables y se aleja de la mediana más del 55 % por encima o del 40 % por debajo, se genera una alerta. Con uno o más comparables se detectan también extremos superiores al doble del mínimo histórico o inferiores a la mitad. **Nunca se cambia el precio**.
6. Si hay coincidencia segura, llama a **`private.apply_purchase_line_review`** (función oficial existente): control de versión, motivo, actor administrador, `purchase_line_overrides`, `purchase_review_events` y reconciliación de cola.
7. Si no hay regla o hay precio anómalo, la compra queda con sus datos originales, sin normalizar. La decisión queda en `private.import_normalization_results` para revisión.
8. La función pública mantiene su **misma estructura de retorno** (`result, imported_order_id, imported_lines, detail`) y no requiere cambiar el código de la web. Los resultados de normalización no están todavía mostrados en la UI, pero se pueden consultar con el conector administrativo.
9. Las importaciones duplicadas/no aceptadas no vuelven a aplicar ninguna revisión.

## Reglas activadas

- **146 reglas activas**, derivadas de **1.103 compras previamente revisadas**, **seis proveedores** y **41 descripciones estándar**, con coincidencias fuente exactas.
- Excluidos errores ya detectados de sección, códigos de producto incompatibles y multiconductores, aunque hayan recibido una revisión manual puntual.
- Las abreviaturas autorizadas de proveedor GRUPO RIAS quedan cubiertas, incluyendo la regla confirmada `H07Z1K2,5GRI` → `H07Z1K2,5GR` (GRIS de 2,5 mm²), respaldada por 3 compras.
- Los textos nuevos o combinaciones no conocidas no generan una regla nueva automáticamente; deben ser revisados y aprobados.

## Migraciones GitHub y Supabase

- `database/migrations/20261013_confirmed_h07z1k_import_rules.sql`
  - Migración Supabase: `confirmed_h07z1k_import_normalization_rules`.
  - Tablas privadas de reglas y decisiones por línea, semilla segura de reglas y enlace con el importador existente.
- `database/migrations/20261013_h07z1k_sparse_price_guard.sql`
  - Migración Supabase: `h07z1k_sparse_price_outlier_guard`.
  - Refuerza alertas de precios extremos cuando solo existe una o dos compras comparables.

## Pruebas realizadas

- Las dos migraciones fueron aplicadas correctamente en Supabase y figuran en el esquema.
- Recuento real posterior: **2.874 pedidos, 11.570 líneas y 1.210 revisiones antiguas**, sin variaciones; **0 resultados de importación automática previos**, pues aún no se ha importado un pedido real con este motor activo.
- Los permisos mantienen la importación restringida a administradores autenticados; la comprobación de autorización se repite también en la normalización y limita la acción al pedido importado por la sesión.
- Los casos testados contra compras históricas incluyen:
  - **ID 4838**: la variante `GRIS VERDE` coincide con la regla correcta para `2.5mm2 GRIS`.
  - **ID 9734**: cable GRIS marcado como 1,5 mm² pero con precio 0,312 €/m → **alerta de precio**.
  - **ID 10614**: cable 25 mm² a 7,894 €/m → **alerta de precio incluso con historial escaso**.
  - **ID 3473**: descripción contradictoria 10 mm amarillo/verde sobre referencia 1,5 GRIS → **sin regla**, pendiente. Su corrección manual anterior no se llegó a guardar y no fue alterada aquí.
  - **IDs 709 y 1122**: RZ1-K 3G1,5 con referencia reutilizada para H07Z1-K → **sin regla**, no se mezcla con el unipolar.
  - **IDs 11137 y 11138**: errores de sección de origen 1,5 / real 2,5 → **sin regla generalizable**, no convertir automáticamente todas las compras.
  - **ID 4844**: descripción original que mezcla AZUL y NEGRO → **sin regla**.
- QA formal comprueba 146 reglas, equivalencia GRIS confirmada, ausencia de reglas para textos conflictivos, y que pedidos/líneas/revisiones originales no han cambiado.

## Pendiente de comprobación operativa

**Todavía no se ha realizado un pedido nuevo real desde el navegador con la versión modificada del RPC**. La validación del flujo completo bajo una sesión JWT auténtica debe hacerse con el próximo Excel legítimo de PROSOEL; no se ha suplantado ninguna sesión para simularlo. Tras su importación, comprobar `private.import_normalization_results`, la revisión de cada línea en `public.order_lines_effective`, la procedencia en la web y los precios. En caso de advertencia, la revisión puede hacerse con las herramientas existentes.

## Importante

Este sistema **no altera ni actualiza pedidos históricos anteriores** y **no se autoentrena** con nuevos textos dudosos. Las reglas nuevas se activan solo tras comprobación y autorización. Se pueden desactivar de forma selectiva (`active=false`) conservando toda la auditoría.
