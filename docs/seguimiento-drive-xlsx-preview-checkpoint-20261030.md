# PROSOEL Costes — Ronda Drive: comparación segura de pedidos (30/10/2026)

## Verificación de identidad Google
El usuario obtuvo el resultado "Conexión verificada: Google permite leer el Excel aprobado".
Se ha marcado `tracking_sync_settings.auth_setup = validated`; **automatic_sync_enabled sigue false** y se mantiene frecuencia prevista de 60 minutos. No existe importación ni sincronización horaria automática activada en esta ronda.

## Excel de referencia
Se contrastó el XLSX `PEDIDOS HERMAFER BOADILLA.xlsx` real, mediante inspección de OOXML (ZIP/XML) y los registros actuales:
- 118 pedidos.
- 488 materiales.
- 390 líneas con verde + SI (incluidos SI en M combinada).
- 91 pedidos completamente recibidos.
- 9 con entrega parcial.
- 18 sin recepción confirmada.
- Ejemplos comprobados: 26/784 (7 pendientes), 26/795 (3), 26/809 (CU35), 26/812 (ref. 6534510261).
- Incluye subseries como 26/210-18.

## Componentes implementados
- Supabase Edge Function `drive-sync-preview`, con JWT obligatorio, verificación de Sergio y `app_users.active`, consultas bajo RLS al catálogo `status=approved`.
- Obtiene token temporal de la cuenta técnica guardada en Secret `PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON` sin exponerlo.
- Descarga solo el XLSX aprobado en memoria, límite estricto 12 MB, y lee `PEDIDOS`, estilos verdes, celdas combinadas M y SI por material. La observación nunca cuenta como SI confirmado.
- Compara en memoria con el snapshot de Supabase sin efectuar operaciones de escritura. Detecta cambios de estado/cantidad/observaciones y modificaciones estructurales.
- Nuevos controles en **Seguimiento de pedidos > Fuentes Drive > Comparar con Drive (prueba)**.
- Si hay filas desplazadas, materiales desaparecidos, pedidos desaparecidos o referencias cambiadas, exige revisión; no modifica datos ni borra cierres manuales.

## Verificaciones realizadas
- Parser de referencia local sobre OOXML auténtico reproduce todos los totales.
- Chequeos de sintaxis estáticos en código de la nueva Edge Function y JS de interfaz.
- Pruebas del comparador ante cambios de estado y desplazamiento de filas.
- Backend `drive-sync-preview` desplegado y activo con `verify_jwt=true`.
- **Pendiente prueba end-to-end en la sesión real del usuario:** pulsar "Comparar con Drive (prueba)" y observar resultado del nuevo servicio. Desplegar con éxito no prueba por sí solo que el runtime lea y compare el Excel.

## Siguiente puerta antes de activar cada hora
1. Confirmar respuesta efectiva de `drive-sync-preview` con credenciales y XLSX reales desde cuenta Sergio. Objetivo: 118 / 488 / 390 y diff cercano a cero, salvo cambios reales desde la instantánea previa.
2. Implementar clave lógica de pedidos/materiales, no basada solo en número de fila; proteger integridad referencial y cierres manuales.
3. Preparar importador transaccional e idempotente con registro de diffs, bloqueos, fallos y cambios reales (cuando cron se active).
4. Validar un segundo XLSX de obra heterogénea antes de ampliar fuentes.
5. Configurar cron seguro cada 60 minutos y comprobar dos ejecuciones, manteniendo aislamiento de Israel.

## Estado de privacidad
Sin cambios en los originales de Google Drive ni en la base histórica de precios. Israel sigue sin acceso; no se almacena ninguna clave de servicio en GitHub.
