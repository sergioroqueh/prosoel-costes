# PROSOEL Costes — V12b: corrección de selección parcial (8 octubre 2026)

## Incidencia reportada
En **Normalización → CR20 → Revisar las líneas de origen**, con una sola casilla marcada la interfaz mostraba «1 seleccionadas» pero el botón **Corregir selección** permanecía deshabilitado. El motivo era una condición `selected.length < 2` pensada exclusivamente para la corrección múltiple. El usuario necesita poder seleccionar **una, varias o todas** las líneas que considere erróneas.

## Solución implementada
- La elegibilidad se concentra en `reviewCorrectionSelectionState(selection)` dentro de `app/static/app.js`.
- **Una línea**: botón habilitado **Revisar esta línea**; abre el mismo editor individual auditado `openPurchaseReviewEditor`. Permite corregir/excluir/restaurar según proceda.
- **2–30 líneas con idéntica referencia y descripción originales**: botón habilitado **Corregir N líneas**; abre `openPurchaseBulkEditor`; solo modifica las marcadas, con auditoría individual y operación atómica de Supabase.
- **Cero seleccionadas**: botón deshabilitado e indicación de marcar una o varias.
- **Más de 30 o selección con orígenes heterogéneos**: botón deshabilitado y explicación. No forzar un lote peligroso de referencias distintas.
- **Seleccionar las líneas visibles** queda como opción rápida; no hace falta activarla para corregir subconjuntos.
- El texto de estado distingue singular y plural.
- HTML con versión de caché `v=20261008-v12b`; sin nuevas migraciones SQL ni cambios de permisos.

## Pruebas
- Sintaxis de JS PASS.
- Prueba de elegibilidad con 0/1/2 compatibles/2 incompatibles/30/31 líneas: PASS (false, true, true, false, true, false).
- Verificación estática: selección individual llama al editor existente; selección múltiple usa RPC de lote solo para grupos homogéneos; todos los elementos existen.
- No se han modificado pedidos ni correcciones reales durante esta mejora.

## Validación pendiente
Abrir la web → Ctrl+F5 → Normalización → CR20 → Descripción Ø25 → «Revisar estas 7 líneas».
Marcar **solo una casilla**: debe aparecer **Revisar esta línea** habilitado.
Marcar dos o tres: debe aparecer **Corregir 2 líneas** / **Corregir 3 líneas**, sin seleccionar las siete.
Comprobar el formulario, sin guardar todavía correcciones no verificadas.
