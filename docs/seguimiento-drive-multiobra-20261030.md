# PROSOEL Costes — Ampliación multiobra de pedidos (30/10/2026)

## Alcance completado
- Descubrimiento de 37 archivos Excel potenciales en las carpetas de trabajo de Drive.
- Lector técnico compartido con Google: solo acceso de Lector; no se modifica un XLSX.
- Auditoría individual del contenido OOXML, colores de recepción y celdas combinadas en la columna FINALIZADO.
- **26 archivos candidatos compatibles importados**, más el Excel piloto de HERMAFER: 27 fuentes / 1.176 pedidos / 4.587 líneas de material. El paso de importación fue transaccional e idempotente; no se reimportó la fuente existente.
- 7 libros no compatibles por variaciones del formato, 2 archivos sin autorización técnica y 1 libro con nombre/estructura sin clasificar como pedidos. Estos 10 quedan SIN importar y SIN generar reclamaciones; no se habilitan por defecto.
- 10 carpetas no operativas excluidas antes del rastreo.
- Todos los registros siguen bajo políticas RLS solo para Sergio (compras@prosoel.es); Israel no tiene lectura ni escritura de seguimiento.

## Sincronización aproximadamente horaria de los 27 libros
- Antes: un cron en el minuto 0 para HERMAFER solamente.
- Ahora: un único cron con `*/2 * * * *`. Por cada ejecución, calcula índice modular del conjunto aprobado/habilitado, ordenado por `file_id`, y pasa un slot al worker. Son **27 libros x 2 minutos = 54 minutos por vuelta**.
- El backend solo descarga **un** Excel por ejecución: evita picos de CPU/memoria que provocaron WORKER_RESOURCE_LIMIT en la auditoría concurrente de prueba.
- Todos los 27 archivos importados tienen `automatic_import_enabled=true`. Los restantes quedan excluidos.
- El parser usa verde + SI por material, incluido SI en celda combinada. Observaciones de texto jamás se contabilizan automáticamente como recepciones confirmadas.
- La actualización es atómica por obra, requiere source_id aprobado, detecta cambios de estructura y no destruye decisiones manuales. Si hay cambios potencialmente peligrosos, bloquea solo esa obra.
- `tracking_sync_runs` registra cada ejecución, `tracking_sync_events` los cambios reales. Se salta la descarga cuando la versión remota no ha cambiado.
- Los archivos más antiguos no se mezclan en la lista por defecto: la interfaz mantiene últimos 30 días y orden antiguo→reciente, con vistas de reclamaciones, por obra y fuentes Drive.

## Revisiones y restricciones
- Rechazados por la plantilla estricta: referencias de pedido no estándar (CUVEE 3000, MORALOBO-VARIOS), cantidad no numérica (ENGIL Mesoncillos, Taller), fecha ausente (LYMA), libro sin pedidos detectables (Cubas Elecnor), libro con estructura de hojas diferente (Varios).
- Compartir no autorizado desde herramienta para COPROMA R4 Alberto Aguilera y ENGIL Izalco Boadilla: servicio sin permisos de lectura. No repetir la operación en bucle; lo puede autorizar manualmente el propietario cuando corresponda.
- BAYÓN Y AZA Obras Varias continúa en revisión por identificador ambiguo.
- Ningún libro rechazado se trata como pedido pendiente; no inferir o inventar fechas/cantidades.
- Los documentos originales y los precios históricos no han sufrido cambios.

## Puertas de ampliación
Antes de intentar leer un libro incompatible: revisar el formato original y la semántica de la unidad/fecha, extender la plantilla con pruebas negativas, revalidar individualmente, importar transaccionalmente y solo después habilitar auto-sincronización.

## Emergencia
- Pausar todas las actualizaciones:
  `update public.tracking_sync_settings set automatic_sync_enabled=false,updated_at=now() where id=1;`
- Pausar obra individual: `update public.tracking_drive_catalog set automatic_import_enabled=false where file_id=...;`
- Parar programador: `select cron.unschedule('prosoel-tracking-rotation-every-2min');`
Los datos importados no se borran al detener la sincronización.

## Componentes
- Supabase Edge: drive-audit-candidates, drive-import-validated, drive-hourly-sync (rotación), drive-sync-preview (comparación genérica).
- SQL: tracking_source_validation, tracking_initial_import, tracking_rotate_all_approved.
- Frontend: vista por obra + catálogo de estados por fuente.
