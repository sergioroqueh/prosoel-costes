# PROSOEL Costes — libros históricos recientes, cierre 03/11/2026

## Decisión
Prioridad exclusiva del usuario desde el 1 de julio de 2026 para cinco archivos problemáticos. No destruir ni modificar originales, no reconstruir históricos de 2022–2023 para resolver errores irrelevantes.

## Resultado ejecutado
- LYMA: 15 pedidos seguros, 48 líneas; 4 pedidos sin entrega confirmada.
- MORALOBO-VARIOS: 6 pedidos seguros, 26 líneas; todos figuran completados.
- TALLER: 20 pedidos seguros, 49 líneas; 2 sin entrega confirmada.
- VARIOS: 10 pedidos seguros, 31 líneas; 2 sin entrega confirmada.
- Total incorporado: 51 pedidos + 154 materiales, todos fechados desde 01/07/2026.
- Un pedido de Taller 26/822 (cantidad '300 uds (2 CAJAS)') queda en tracking_legacy_review y no puede generar reclamación hasta su comprobación.
- CUBAS ELECNOR: 0 pedidos fechados desde 01/07/2026 en la hoja examinada, queda sin importar y fuera del trabajo prioritario.

## Seguridad e identidad
- El lector legacy se usa sólo en cuatro fuentes aprobadas con priority_from=2026-07-01 y política defer_before_priority.
- No mezcla 'PEDIDOS' con 'PEDIDOS ANTIGUOS': el lector exige una hoja de pedidos válida y comprueba que las hojas secundarias catalogadas como antiguas no contengan pedidos de 2026-07-01 en adelante.
- Cualquier pedido con cantidad/fecha/identidad ambigua queda fuera de tracking_orders, en tabla separada de revisión. No existe cálculo numérico inventado ni cierre engañoso por omitir la línea problemática.
- Revisión almacenada con motivo, fila, referencia y texto original. RLS restringe su lectura a Sergio. Israel devuelve 0 filas.
- La importación es transaccional: tracking_import_legacy_recent llama a tracking_initial_import y guarda la cuarentena en la misma transacción.
- Trigger adicional impide cualquier inserción/actualización de fecha anterior a la fecha prioritaria en estas fuentes.

## Sincronización
- Las cuatro fuentes se habilitaron de una en una y se forzó una lectura real desde Google con la cuenta de servicio.
- MORALOBO, Taller, LYMA y VARIOS devolvieron 0 cambios. En Taller se comprobó también la permanencia de su pedido en cuarentena.
- El worker comprueba el contenido de la cuarentena antes de actualizar. Si la fuente cambia un pedido en revisión, registra incidencia y bloquea esa importación sin sobreescribir la decisión.
- Total operativo después de incorporación: 36 libros, cron rotativo cada 2 minutos, un ciclo completo en 72 minutos.
- Google Drive es estrictamente de solo lectura. Continúan los cierres manuales y la auditoría de cambios.

## Interfaz
- Tarjetas con obra (cambio publicado aparte en PR #16).
- Eliminada la leyenda técnica repetitiva de recepciones.
- Fuentes Drive incluye 'Pedidos con datos por revisar' con el único caso 26/822 y cantidad original.
- Contenido normal de pedidos sigue mostrando solo fuentes verificadas para las reclamaciones.

## Pendiente si el usuario desea resolver el último caso
Confirmar desde albarán/origen si '300 uds (2 CAJAS)' significa 300 unidades totales y no otra relación de embalaje, así como el estado de recepción antes de desbloquearlo. No asumir esa equivalencia.