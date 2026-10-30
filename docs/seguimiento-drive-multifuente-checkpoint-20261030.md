# Seguimiento multifuente de pedidos — checkpoint 2026-10-30

## Descubrimiento real (sin importar pedidos nuevos)
- Raíz de trabajo investigada: 50 elementos directos, 47 carpetas y 3 ficheros.
- Carpetas clasificadas: 37 candidatas a obra, 9 excluidas por ser materiales de administración/servicio, 1 archivo de obras terminadas.
- Fuentes Excel directas identificadas: 37 libros. 1 aprobado (piloto existente), 35 candidatos pendientes de validación y 1 libro de título ambiguo en revisión.
- El inventario de identificadores y títulos **solo vive en Supabase con RLS**. No subir a GitHub listas de IDs de Drive, archivos XLSX ni pedidos de producción.
- La carpeta de obras acabadas queda excluida como raíz de seguimiento; no se recorre recursivamente.
- Los subdirectorios por proveedor o fotos bajo obras no son fuentes de pedidos por sí mismos. La elección depende del tipo, plantilla y autorización explícita.

## Diseño de la interfaz
- Tres vistas: cola global de reclamaciones, agrupación por obra y catálogo de fuentes.
- En todas las vistas operativas se respeta el intervalo de fechas seleccionado. Dentro del intervalo, orden cronológico ascendente por defecto, invertible.
- Filtrar por obra cuando se incorporen fuentes adicionales. Tarjetas muestran exclusivamente materiales pendientes, con detalles recibidos desplegables.
- Catálogo informativo: aprobado, pendiente de validar, revisión manual. No se permite aprobar importaciones desde el navegador todavía.
- Cuentas autorizadas: exclusivamente Sergio (compras@prosoel.es) con RLS. Israel sigue sin acceso.

## Sincronización horaria — diseño, NO ACTIVA
- Estado registrado en `tracking_sync_settings`: 60 minutos, `automatic_sync_enabled=false`, `auth_setup=pending`.
- La conexión Drive↔ChatGPT utilizada para este inventario no se puede reutilizar como credencial del backend de PROSOEL.
- Requiere identidad de Google separada y autorizada por el propietario de Drive (idealmente cuenta de servicio con solo lectura de carpetas de trabajo elegidas o OAuth de cuenta técnica con acceso limitado).
- Para leer .xlsx se necesita contenido, no basta con `drive.metadata.readonly`. En caso de OAuth, `drive.readonly` está clasificado como restringido por Google y puede requerir verificación del consentimiento y evaluación de seguridad según forma de uso. La identidad de servicio debe compartir únicamente los archivos/carpetas permitidos.
- Guardar credenciales solo como secretos del backend (nunca GitHub Pages, `config.js`, base de datos accesible al navegador o repositorio público).
- Una vez verificados acceso + parser + pruebas de aislamiento: programar Supabase Cron `0 * * * *` invocando Edge Function autenticada, con logs, recuperación y control de coste. No crear cron todavía.

## Algoritmo del futuro sincronizador (puertas obligatorias)
1. Consultar únicamente archivos aprobados y habilitados mediante la lista blanca privada; no recorrer Drive indiscriminadamente.
2. Leer metadatos (`modifiedTime`, `md5Checksum`/revisión cuando exista) y saltar archivos sin cambios; registro de últimos resultados.
3. Descargar los XLSX cambiados con credenciales de servicio. Antes de interpretar cada fuente, validar hoja, cabeceras, estilo, color, celdas combinadas M y fechas.
4. `FINALIZADO SI` por MATERIAL, con verde + SI (incluyendo merge); nunca cerrar todo el pedido por un único SI. Las OBSERVACIONES son datos libres; cantidades parciales ambiguas pasan a revisión.
5. Normalizar números y líneas con identidad estable de pedido (source_id + referencia + fecha + proveedor + ocurrencia) y material (referencia + posición estable); **no utilizar únicamente número de fila** ya que insertar una fila desplazaría los registros.
6. Antes de aplicar, calcular un diff: pedidos nuevos, pedidos cerrados, pendientes añadidos, faltantes reducidos, errores y origen. Resolver conflictos de identificadores sin unir pedidos distintos.
7. Confirmar la importación de cada fuente de forma atómica e idempotente. Un fallo no debe borrar el snapshot correcto anterior ni la historia de cierres manuales.
8. Conservar cierres manuales reversibles y su auditoría. Cuando la fuente contradiga una decisión manual, señalarlo para revisión sin inventar un estado.
9. Por seguridad: no eliminar de la base un pedido por desaparición temporal del XLSX; mostrar fuente no disponible o desactualizada.
10. Las alertas globales solo utilizan fuentes con último sync satisfactorio e identifican datos desactualizados.

## Validación exploratoria de estructura
Se descargaron tres XLSX de distintas obras y se comprobó sin modificarlos que incluyen hoja `PEDIDOS`, cabecera `FINALIZADO` en columna M y merges M con SI. Esto acredita compatibilidad preliminar, **no valida todavía la lógica de colores y recepciones para importación**.

## Requisitos antes de habilitar en producción
- La cuenta propietaria autoriza acceso de lectura al backend a carpetas/ficheros específicos.
- Determinar la identidad Google permitida y su método de renovación, configurarla como secreto en Supabase.
- Test negativo: Israel = 0 filas en tablas de catálogo y pedidos.
- Dry-run en mínimo tres libros heterogéneos, comparando manualmente 10 pedidos (incluyendo verdes sin SI, SI combinados y notas ambiguas).
- Prueba de identidad estable ante inserción de filas, reconciliación de cierres y duplicados.
- Logs verificables de una ejecución manual y dos ejecuciones programadas sin cambios.
- Ningún recurso ajeno al seguimiento se copia al repositorio público ni al catálogo de precios.
