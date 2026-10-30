# PROSOEL Costes — Identidad técnica Google Drive (piloto)

Fecha: 2026-10-30. Proyecto Supabase: kusbndefngttaiytcrui.

## Permisos mínimos
El acceso debe ser privado. Empezamos con el XLSX aprobado PEDIDOS HERMAFER BOADILLA.xlsx.
Los demás libros candidatos siguen en catálogo sin importar ni sincronizar.

## Google Cloud — configuración por persona autorizada
1. Abrir https://console.cloud.google.com/ y seleccionar o crear proyecto propiedad de PROSOEL (comprobar antes costes y políticas).
2. APIs y servicios > Biblioteca > Google Drive API > Habilitar.
3. IAM y administración > Cuentas de servicio > Crear cuenta: prosoel-pedidos-reader.
4. NO asignar roles de propietario/administrador de Google Cloud ni delegación de todo el dominio.
5. Copiar el correo de la cuenta, terminación iam.gserviceaccount.com.
6. Si la política permite claves: Cuenta de servicio > Claves > Agregar clave > Crear clave nueva > JSON. Si las prohíbe, NO sortear la política; estudiar Workload Identity Federation u OAuth.
7. Compartir SOLO el XLSX de HERMAFER BOADILLA con el correo de servicio como Lector, sin publicar el archivo ni compartir la carpeta raíz.

## Supabase Edge Function Secrets
Acceder al Dashboard de Supabase > proyecto kusbndefngttaiytcrui > Edge Functions > Secrets.
Crear el secreto PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON cuyo valor es el contenido completo del archivo JSON de credenciales.
NUNCA pegar ese JSON en ChatGPT, GitHub, un issue, una hoja de Drive ni config.js.

El verificador drive-connection-check obtiene un token temporal RS256 con alcance drive.readonly.
Consulta únicamente los metadatos de una fuente aprobada, no descarga el XLSX ni lo modifica.
Solo funciona desde un JWT de Sergio válido + cuenta activa en app_users + políticas RLS; Israel está denegado.

## Prueba desde PROSOEL Costes
Sergio > Seguimiento de pedidos > Fuentes Drive > Comprobar conexión a Drive.
Resultados:
- pending_credentials: aún no hay clave segura configurada.
- google_auth_failed: token rechazado, clave inválida o Drive API sin habilitar.
- permission_missing: falta compartir el Excel autorizado con la identidad de servicio.
- download_not_allowed: la identidad puede ver, pero no descargar el Excel.
- connected: lectura autorizada de metadatos del XLSX. NO significa que haya sincronización automática.

## Pendiente de autorización
Antes de activar la sincronización horaria: validar parser de colores y celdas combinadas en varias obras, hacer diff incremental independiente de la fila física, proteger cierres manuales, probar ejecuciones y logs. Mantener automatic_sync_enabled=false hasta entonces.

Referencias:
https://developers.google.com/workspace/guides/create-credentials
https://docs.cloud.google.com/iam/docs/keys-create-delete
https://supabase.com/docs/guides/functions/secrets
https://supabase.com/docs/guides/functions/auth
https://supabase.com/docs/guides/functions/schedule-functions
