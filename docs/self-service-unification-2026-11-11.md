# PROSOEL Costes — Unificar referencias desde la interfaz

**Fecha:** 11/11/2026  
**Acceso:** `Herramientas → Normalización → Unificar referencias` (únicamente Sergio, `compras@prosoel.es`, rol `admin` verificado en Supabase).  
**Acceso rápido:** consulta de precios → detalle de un artículo histórico → **Unificar esta referencia**.

## Flujo funcional

1. Buscar **referencia original exacta**, por ejemplo `069801L`. Se muestran hasta 300 compras del código, agrupadas por **proveedor + descripción original**.
2. Marcar las variantes o líneas que se consideren **técnicamente idénticas**. Botones Seleccionar todas / Limpiar selección. Cada grupo puede desplegar sus pedidos, fechas, precio neto y descripción efectiva actual.
3. Escribir la **descripción definitiva** y opcionalmente una observación técnica.
4. Dejar activado **Guardar reglas para futuros pedidos**, o desactivarlo para corregir exclusivamente los históricos seleccionados.
5. Marcar la confirmación de equivalencia técnica. Pulsar **Guardar unificación** y revisar el diálogo final.
6. Se realiza **una transacción atómica**: corrige solamente las descripciones efectivas que cambien, registra su revisión/evento, actualiza candidatos de normalización e inserta/rehabilita reglas de importación exactas.

## Cómo funcionan las reglas futuras

El importador ya existente consume `private.confirmed_import_normalization_rules`. La regla aprobada se delimita por **proveedor + referencia original + descripción original con espacios normalizados**. Al volver a recibir esa combinación, propone el mismo texto definitivo, con el control actual de precios y sin alterar el XLSX original. **No** se generaliza automáticamente a variantes de texto nuevas/desconocidas ni a proveedores distintos: se detectan para revisión. Esta restricción evita fusionar referencias reusedas o productos técnicamente diferentes sin evidencia.

Para activar reglas, se exige que estén marcadas **todas las compras elegibles** de cada variante original/proveedor seleccionado. Si se desean corregir únicamente algunas líneas, desmarcar la creación de reglas futuras.

## Seguridad y trazabilidad

- El acceso se comprueba en la web y **de nuevo dentro de las funciones** en Supabase, verificando `auth.uid()`, JWT firmado con email de Sergio, rol `admin` y cuenta activa.
- La función pública es `SECURITY INVOKER` y delega en una función privada con autorización explícita; no concede acceso a `anon` ni a `PUBLIC`. Las dos RPC tienen permisos únicamente para `authenticated`.
- El backend compara el número de revisión esperado de todas las líneas con el vigente, para rechazar operaciones sobre líneas cambiadas en otra sesión.
- Se impide unificar pedidos excluidos, gastos/portes, líneas ligadas a un `material_id` o referencias originales diferentes.
- Las reglas contradictorias se rechazan; **no** se sustituyen silenciosamente equivalencias anteriores.
- Los `order_lines` originales no se escriben y se verifica su hash antes/después. Se guardan cambios efectivos en `purchase_line_overrides` y eventos de auditoría en `purchase_review_events`.
- Se admite un máximo de 200 líneas por guardado y la búsqueda restringe conjuntos de más de 300 líneas.

## Pruebas

- Comprobación estática de JavaScript, DOM, RPC, permisos y reglas: **5/5 PASS**.
- Ensayo transaccional reversible `BEGIN / ROLLBACK` sobre `069801L`: selección de 12 líneas ya normalizadas con **5 reglas conocidas**, resultado esperado **0 correcciones / 12 correctas / 5 reglas**.
- Ensayo de modificación de 2 líneas y creación de auditoría con reversión: **2 correcciones previstas**, **0 reglas futuras**.
- Rechazo de revisiones obsoletas y rechazo de reglas sobre variantes parcialmente seleccionadas: **PASS**.
- Simulación de otro usuario (Israel) intentando leer o modificar mediante RPC: **rechazado (42501)**.
- Verificados sin cambios los datos históricos después del `ROLLBACK`.

## Implementación

- `app/static/unify_references.js`
- `app/static/index.html`, `app/static/app.js`, `app/static/styles.css`
- `supabase/migrations/20261111_071_self_service_reference_unification.sql`
- `tests/self_service_unification_20261111.test.mjs`

No requiere servicios externos nuevos, ni credenciales en el cliente, ni cambios a los Excel del Drive.
