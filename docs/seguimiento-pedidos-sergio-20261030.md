# PROSOEL Costes — Seguimiento de pedidos (piloto Sergio, 2026-10-30)

## Alcance
- Nueva pestaña **Seguimiento de pedidos**, visible exclusivamente cuando `app_users.email = compras@prosoel.es` está activo y se verifica la sesión de Supabase.
- Seguridad real por RLS: tablas `tracking_sources`, `tracking_orders`, `tracking_lines` y `tracking_decisions` limitadas al usuario autorizado. Israel no tiene permisos de lectura ni escritura. Mostrar/ocultar pestañas NO es la barrera de seguridad.
- Primera fuente: `PEDIDOS HERMAFER BOADILLA.xlsx` de Google Drive. Instantánea puntual de 2026-10-30. 118 pedidos, 488 líneas, 100 pedidos marcados SI. Los datos originales de compra, la lógica de precios y el Excel de Drive quedan intactos.
- El snapshot se guarda solo en la base privada con RLS, nunca como Excel, JSON o CSV dentro del repositorio público.

## Reglas funcionales
1. `FINALIZADO = SI` del archivo de Drive siempre significa finalizado, aunque haya cantidades parciales contradictorias.
2. Cierres manuales registrados como eventos inmutables con usuario, motivo y fecha, sin escribir en Drive. La última decisión local prevalece cuando Drive NO está marcado SI. Reapertura reversible.
3. Filtrado por fecha del pedido: 7/30/90 días y rango personalizado; predeterminado últimos 30. Se puede filtrar proveedor, estado, texto y plazo para revisión.
4. **No interpretar arbitrariamente OBSERVACIONES**: el texto original siempre se ve. Una anotación numérica aislada tiene clasificación probable, no recepción confirmada. Todo texto mixto o inconsistente exige revisión. Sin anotación, no se inventan recepciones.
5. Los pedidos pendientes fuera de plazo son **candidatos a revisión**, NO reclamaciones confirmadas. Los históricos no finalizados no irrumpen en el panel del mes vigente.
6. Mientras no exista sincronización autenticada de Drive, se muestra de manera explícita **copia puntual, no en vivo**. Actualizar vista solo vuelve a consultar Supabase.

## Seguridad probada
- La sesión simulada `compras@prosoel.es` leyó 118 pedidos y pudo insertar una decisión dentro de una transacción revertida.
- La sesión `israel@prosoel.es` leyó 0 pedidos y la escritura fue denegada por RLS.
- La cuenta anónima no tiene SELECT sobre estas tablas.
- La tabla de decisiones quedó con 0 eventos tras pruebas (rollback).
- Se comprobaron sintaxis JavaScript, ids de los controles y funciones puras de observaciones y precedencia.
- Security Advisor sin alertas nuevas del módulo; existen advertencias previas globales de configuración, ajenas al piloto.

## Siguiente fase
La conexión ChatGPT↔Drive usada para obtener la muestra no es una autorización de backend para PROSOEL. Para sincronizar automáticamente archivos XLSX en la aplicación deberá configurarse una identidad OAuth/servicio de Google Workspace autorizada, sin exponer secretos en GitHub Pages, y una tarea backend que detecte cambios; tener en cuenta inserción/movimiento de filas y correcciones manuales. Antes de automatizar, probar incremental, idempotencia, discrepancias y logs; nunca actualizar el Excel en esta fase.

## Despliegue
El módulo se introduce como cambio aditivo. No habilitar a Israel hasta autorizarlo explícitamente mediante nueva política RLS revisada y comprobación de interfaz. El estado de cierre local jamás modifica el estado del Excel original.
