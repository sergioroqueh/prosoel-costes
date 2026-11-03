# Seguimiento PROSOEL — alcance de los 5 libros conflictivos (03/11/2026)

Decisión del usuario: priorizar pedidos desde el **01/07/2026**. Los anteriores siguen disponibles en Drive y no se borran, pero se pospone su reconstrucción exhaustiva.
Esta política SOLO afecta a los cinco libros históricos que aún están en estado candidate: LYMA, Taller, Varios, MoraloBo-Varios y Cubas Elecnor. Los 32 libros actuales siguen sincronizándose como hasta ahora.

## Revisión preliminar de la hoja principal exportada por Drive
- Taller: 21 cabeceras de pedido con fecha explícita >= 01/07/2026.
- LYMA: 15.
- VARIOS: 10.
- MORALOBO-VARIOS: 6.
- Cubas Elecnor: 0 (contenido examinado hasta 2022).
- Total de registros fechados: 52. Estas son cabeceras de pedido con fecha explícita, no líneas de material ni garantía de captura completa de todas las hojas.

## Reglas a conservar en la próxima importación
1. Aplicar filtro de fecha por pedido, no por fecha de albarán, de recepción ni por fecha de modificación del archivo.
2. Incluir TODAS las líneas que pertenecen a cada pedido elegible, incluso las que tienen B vacía porque la fecha se comparte por celdas combinadas.
3. Nunca asociar un nuevo pedido sin número/fecha al anterior; debe pasar a revisión documental.
4. Si un material del período tiene cantidad o identidad ambigua, conservar texto original y celda en bandeja de revisión; no generar reclamación ni declarar finalizado por omisión de esa línea.
5. Priorizar los cuatro libros con pedidos desde julio; Cubas Elecnor, sin pedidos recientes en la hoja examinada, queda fuera del trabajo urgente.
6. Antes de autorizar cada libro, comparar recuentos y estados de una muestra real contra el XLSX incluyendo celdas combinadas y colores.
7. Nunca reimportar ni limitar por fecha las 32 fuentes que ya están operativas.

## Cambio aplicado
Se registraron en la tabla privada tracking_drive_catalog los campos priority_from=2026-07-01 y historical_review_policy=defer_before_priority para esos cinco libros.
NO se han importado todavía, no tienen automatic_import_enabled=true y no generan alertas. El cron de 32 fuentes no cambió.