# PROSOEL Costes — sincronización horaria de pedidos (piloto HERMAFER)

## Alcance
- Única fuente habilitable en esta ronda: Excel de HERMAFER BOADILLA, ya validado mediante comparación de 118 pedidos, 488 materiales y diff cero.
- Los otros 36 libros del catálogo no se descargan ni reciben actualizaciones automáticas.
- Trabajo exclusivamente con API Drive de LECTURA y XLSX descargado en memoria. La identidad técnica no escribe en Drive.
- La lista de pendientes conserva los cierres manuales de PROSOEL y las restricciones RLS de Sergio.

## Arquitectura y seguridad
- `drive-hourly-sync`: Edge Function backend `verify_jwt=false`, pero protegida antes de cualquier lectura de datos con header de 256 bits. Su verificación se realiza en una RPC permitida únicamente a `service_role`; el secreto real vive cifrado en Vault.
- `cron.schedule('prosoel-hermafer-drive-every-hour','0 * * * *',...)` ejecuta cada hora, enviando el secreto por encabezado HTTPS. El SQL del cron no contiene ningún secreto literal.
- Para el backend existe `PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON` dentro de Edge Secrets; no se duplica en la base ni se sube a GitHub.
- La función atómica `tracking_apply_pilot_snapshot` requiere `service_role`, cuenta con bloqueo transaccional por fuente, comprueba ambas banderas de habilitación, exige fuente aprobada y rechaza estructura dudosa.
- Tras descarga, compara metadatos, `modifiedTime` y MD5; si son iguales, no vuelve a descargar.
- Si hay cambios, el lector conserva hojas, celdas verdes y rangos M combinados, y compara contra el snapshot. Cada material está recibido SOLO si verde + SI.
- Si se detectan filas trasladadas, pedidos eliminados, nuevas líneas dentro de pedidos ya existentes, cambios de referencia o reversiones de recibido a pendiente, **no se importan cambios** y queda incidencia.
- Sí se permiten cambios coherentes en entregas, notas, albaranes, cantidades y nuevos pedidos al final del Excel. Importación completa por transacción; un fallo revierte todos los cambios.
- El ID de pedidos existentes permanece estable y nunca se elimina ni actualiza `tracking_decisions`. Se mantiene el cierre manual reversible.
- Los cambios importados se auditan en `tracking_sync_events` y cada ejecución en `tracking_sync_runs`.
- Sin secretos ni dumps de pedidos en el repositorio público.

## Pruebas verificadas
- Lector real vía Drive desde la sesión Sergio: 118 / 488 / 390 recibidos, 91 completos, 9 parciales y cero diferencias.
- RPC de aplicación atómica ejecutada sobre los 118 pedidos dentro de transacción ROLLBACK: 0 cambios.
- Simulación de nueva recepción: 1 cambio aceptado con ROLLBACK.
- Simulación de pedido nuevo al final: 1 pedido y 1 material aceptados con ROLLBACK.
- Simulación de reapertura inconsistente de material recibido: rechazada.
- Usuario no autorizado no puede ejecutar RPC.
- Llamadas HTTP al worker sin secreto: 401; con secreto falso: 403.
- Llamada firmada mediante Vault, con el flag apagado: 200, estado disabled, sin tocar datos.

## Operación
- Cron: `0 * * * *` (a cada hora en punto, en el horario del servidor UTC).
- Control de emergencia, inmediatamente reversible, desde SQL Editor:
  `update public.tracking_sync_settings set automatic_sync_enabled=false,updated_at=now() where id=1;`
- Cancelar programador:
  `select cron.unschedule('prosoel-hermafer-drive-every-hour');`
- Catálogo individual puede pausarse:
  `update public.tracking_drive_catalog set automatic_import_enabled=false where source_title='PEDIDOS HERMAFER BOADILLA.xlsx';`
- Historial de últimos intentos desde Seguimiento de pedidos > Fuentes Drive.
- Revisión de fallos: `tracking_sync_runs` y `tracking_drive_catalog.import_error`. Nunca se elimina información por falta de archivo remoto.
- No habilitar Israel ni importar las otras 36 fuentes sin una ronda independiente de comprobación.

## Próximo salto
Comprobar una ejecución real autorizada, verificar registros y datos, y observar el siguiente ciclo horario. Para ampliar: validar otras plantillas y gestionar filas insertadas en mitad mediante conciliación de identidad, sin falsos positivos.
