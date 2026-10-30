# Corrección tras primer cron de pedidos — 30/10/2026

## Hallazgo
Primera ejecución real: 5 recepciones nuevas, 1 observación en el pedido 26/829 y 146 supuestas diferencias de albaranes.
Se detuvo inmediatamente la sincronización.
- 144 eran el mismo número expresado en notación científica (602101360 frente a 6.0210136E8).
- 2 eran albaranes realmente nuevos del pedido 26/829.
Se corrigieron y auditaron los 146 códigos sin eliminar las recepciones legítimas.
En segunda prueba, 3 albaranes de texto con ceros iniciales (038750, 042918, 043439) se convirtieron en enteros sin ceros.
Se pausó el cron y se restauraron esos 3 valores con auditoría.

## Solución
- Números almacenados en notación científica convertidos a decimal entero.
- Celdas de texto con ceros iniciales conservadas literalmente.
- Comparador de albaranes incorporado a las dos funciones; más de 20 diferencias obliga a revisión.
- Validación del XML en J203, J273 y J274: son sharedStrings que mantienen el cero inicial.
- Los originales de Google Drive no se modificaron.

## Resultado validado
- 118 pedidos, 488 materiales, 395 líneas recibidas, 91 pedidos completos, 10 parciales y 17 sin recepción confirmada.
- Última lectura completa: cero diferencias de cualquier tipo.
- Primer cron real 30/10/2026 a las 12:00 UTC: skipped, no cambios.
- Comprobación manual posterior: skipped, no cambios.
- Solo HERMAFER BOADILLA está autorizada para sincronización horaria.
- Cron programado a 0 * * * *.

## Desactivación segura
SQL: update public.tracking_sync_settings set automatic_sync_enabled=false,updated_at=now() where id=1;
Todas las correcciones y eventos de importación quedan registrados en tracking_sync_runs y tracking_sync_events.