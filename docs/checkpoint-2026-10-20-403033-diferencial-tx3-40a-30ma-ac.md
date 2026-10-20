# PROSOEL Costes — Unificación diferencial Legrand TX3 referencia 403033

**Fecha:** 2026-10-20. **Supabase:** `kusbndefngttaiytcrui`.

## Confirmación del usuario

Unificar todos los resultados mostrados para la referencia `403033` bajo la descripción **exacta**:

**Diferencial TX3 - 2P - 230V - 30mA - 40A - Tipo AC - Legrand**

El usuario ha incluido expresamente la variante de origen «(no accesoriable)». El historial conservará esa particularidad en la descripción fuente de la compra; el texto normalizado no constituye una certificación sobre accesorios compatibles.

## Estado previo validado

- **35 líneas** en **34 pedidos**, de 3 proveedores.
- 3 variantes literales de descripción fuente:
  - `Diferencial TX3 2/40/30AC`: 32 líneas (9 GRUPO JARAMA, 12 GRUPO RIAS, 11 GUARCONSA).
  - `DIFERENCIAL TX3 2/40/30AC`: 2 líneas (GRUPO RIAS).
  - `DIFERENCIAL TX3 2/40/30AC (no accesoriable)`: 1 línea (GRUPO JARAMA).
- Las dos variantes de GRUPO RIAS difieren solo en mayúsculas, por lo que se cubren con **una** regla `source_description_key`, no dos.
- 2024-01-02 a 2026-09-11; **125 unidades**; total histórico registrado **2.496,8976 €**; netos unitarios entre **17,8542 €** y **21,3225 €**.
- Todas las líneas tenían `line_review_revision=0`, `price_validation_status=valid` y no estaban excluidas.
- No existían overrides, eventos ni reglas de importación para la referencia.
- Hash MD5 de los 35 registros originales en `public.order_lines`, concatenados por ID: `cc85a4bff432dd097dff23ee1e3d0f34`.

## Ejecución

1. Se realizaron consultas previas por referencia y proveedor y se verificaron los 35 registros.
2. Una simulación preliminar detectó un recuento de reglas incorrectamente esperado (5) porque dos descripciones difieren solo en mayúsculas. Se abortó esa simulación de manera segura sin modificaciones.
3. Ajustado el recuento esperado a **4 reglas** y comprobada simulación `BEGIN ... ROLLBACK`: 35 líneas normalizadas, 35 eventos y 4 reglas; fuente intacta. Se verificó que la simulación no persistió revisiones ni eventos.
4. Transacción definitiva con bloqueo y comprobación de hash, recuentos, importes, ausencia de revisiones y reglas previas, y campos económicos originales:
   - 35 `public.purchase_line_overrides` de revisión 1, `corrected_reference=NULL`, `corrected_description` canónica, no excluidas.
   - 35 `public.purchase_review_events`, estados antes y después, actor `asistente-prosoel-costes`.
   - 4 reglas activas en `private.confirmed_import_normalization_rules`, familia `PROTECCIONES LEGRAND TX3`:
      - Regla **257**: GRUPO JARAMA, texto estándar, evidencia 9 líneas.
      - Regla **260**: GRUPO JARAMA, texto `(no accesoriable)`, evidencia 1 línea.
      - Regla **258**: GUARCONSA, texto estándar, evidencia 11 líneas.
      - Regla **259**: GRUPO RIAS, texto estándar sin distinguir mayúsculas, evidencia 14 líneas.
5. Se invocó `private.reconcile_review_reference('403033')`.
6. Tras confirmar `COMMIT`, se consultó de nuevo `public.order_lines_effective`: **35 líneas en 34 pedidos bajo una sola descripción efectiva**, 125 unidades, 2.496,8976 €, netos unitarios conservados y última compra 2026-09-11.
7. La consulta de `normalization_review_groups` devuelve `description_count=1`; `candidate_active=true` puede continuar porque hay tres proveedores, sin implicar que las descripciones sigan separadas.
8. Verificación de la simulación del importador: las **35/35 líneas históricas emparejan una de las 4 reglas**; **0 alertas de precio** con las comprobaciones vigentes. No se ha importado un nuevo Excel real.

## Futuras importaciones y conservación

El motor existente `private.apply_confirmed_import_rules` reconoce automáticamente las combinaciones conocidas **proveedor + referencia original exacta + descripción fuente normalizada en espacios y mayúsculas**. El control de precio sigue activo. Las combinaciones nuevas o precios anómalos exigen revisión humana. Los datos originales de `public.order_lines` y `public.orders` permanecen intactos: el hash de compra verificado al confirmar la transacción fue idéntico al previo.

No se ha modificado el frontend ni el motor SQL del importador. No hay despliegue de GitHub Actions asociado a la aplicación de las reglas, solo documentación en el repositorio.
