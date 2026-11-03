# Seguimiento PROSOEL — UX compacta, alta de obras y sincronización manual (2026-11-03)

## Cambios visibles
- Se elimina la pestaña **Por obra**: el selector Obra ya cumple esa función.
- Se muestra **Almacén / proveedor** con todos los valores presentes en las fechas cargadas; aplica filtro exacto a `tracking_orders.supplier`.
- El panel de filtros tiene cuatro columnas en escritorio y distribución responsiva, con controles de menor altura.
- Botones separados: **Actualizar vista** consulta el snapshot de Supabase; **Sincronizar Drive** hace una solicitud segura al backend.
- La insignia BETA se mantiene hasta la revisión final y autorización de difusión del usuario.

## Sincronización manual
- Usuario Sergio solamente: RPC `tracking_request_manual_refresh(p_file_id)` comprueba JWT, cuenta activa y permiso, y encola fuentes ya aprobadas para sincronización. Israel rechazado por pruebas RLS.
- Con una obra seleccionada, se prioriza su actualización. Con **Todas las obras**, se encolan hasta 60 fuentes aprobadas.
- Cron auxiliar cada 30 segundos, únicamente cuando hay pendientes; selecciona UNA fuente de la cola. No hay descargas simultáneas masivas.
- Worker `drive-hourly-sync` soporta `manual_queue:true` y comprueba ese archivo con `forceCheck`, omitiendo el atajo por `modifiedTime`/MD5 para comprobar de forma explícita.
- Se mantiene el cron existente cada 2 minutos para la sincronización normal. No se modifica la lógica de recepción, cierres manuales, líneas ambiguas o comparación de estructura.
- Una solicitud global con 36 fuentes puede tardar varios minutos (aproximadamente 18 minutos al ritmo de una cada 30 segundos); no implica actualización inmediata y se indica al usuario que refresque la vista para ver el progreso.
- No se expone cron secret, service role ni credenciales Drive al navegador. El servicio original sigue sin escribir en Drive.
- La cola es idempotente con cooldown de 3 minutos: peticiones repetidas no duplican pendientes.

## Alta de nuevas obras
- En **Fuentes Drive → Registrar nueva obra** se introducen nombre de obra y URL a un archivo XLSX (docs.google.com/spreadsheets/d/… o drive.google.com/file/d/…).
- RLS solo Sergio en `tracking_new_work_requests`. El navegador extrae `file_id` de la URL y lo almacena con `status=pending`.
- El registro no inserta pedidos, no aprueba fuentes ni activa la sincronización automáticamente. La validación estructural y el permiso Lector de la cuenta de servicio siguen siendo puertas previas.
- En caso de duplicado en catálogo o solicitudes, el registro se rechaza. Un revisor deberá validar el archivo y luego pasar por la importación transaccional como cualquier obra nueva.

## Pruebas ejecutadas
- Simulación autenticada Sergio: creación de solicitud y petición manual dentro de transacciones ROLLBACK, aprobadas.
- Simulación Israel: acceso a solicitudes y cola 0 filas, intento de insertar y pedir sincronización denegados.
- Intento de reclamar la cola sin service_role denegado.
- Test real de `manual_queue`: HERMAFER 80 VIV. CUBAS, status `success`, 1 pedido/1 material, cero cambios; la solicitud de QA se eliminó tras la comprobación.
- Función backend `drive-hourly-sync` V7 desplegada. El cron programado original no se ha eliminado.

## Pendiente antes de retirar BETA
- Verificar filtros compactos, almacén y botones en navegador con sesión Sergio.
- Dar de alta una obra de prueba REAL o simular la solicitud con un enlace autorizado, revisar su aceptación, asignarle permiso Google, validar estructura e incorporarla.
- Confirmar que la cola automática completa una petición real del usuario y que Israel sigue sin acceso.
- No quitar BETA ni habilitar Israel sin aprobación explícita.