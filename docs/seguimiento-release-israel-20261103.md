# PROSOEL Costes — Liberación de Seguimiento para Israel (03/11/2026)

## Alcance publicado
- Retiradas las dos etiquetas visibles BETA del seguimiento (pestaña y cabecera).
- Cabecera «LOGISTICA / CONTROL INTERNO» en naranja corporativo accesible sobre azul oscuro.
- Ambas cuentas activas `compras@prosoel.es` (Sergio) e `israel@prosoel.es` (Israel) pueden consultar el seguimiento, sus fuentes, historiales y decisiones.
- Israel puede registrar cierres/reaperturas reversibles; `tracking_decisions.actor_uid` conserva identidad autenticada. También puede solicitar actualización manual, con cola backend.
- «Registrar nueva obra» continúa solo visible y permitido a Sergio, tanto por interfaz como por RLS.
- Importación y Normalización siguen ocultas para Israel por permisos ya existentes; no se amplían a otros usuarios.
- Los demás usuarios no tienen acceso por las políticas RLS ni aparece la pestaña.

## Pedido Taller 26/822
- Fuente real original: `PEDIDOS TALLER.xlsx`, hoja `PEDIDOS`, fila XLSX 928.
- Referencia `9ZG635M6BTSH`, 300 uds `(2 CAJAS)`: **300 unidades**, sin multiplicación por cajas.
- Pedido de 26/10/2026 en GUARCONSA, entregado/terminado el 27/10/2026, con color verde y SI en el Excel.
- Se verificó por descarga/lector OOXML privado desde Drive y se incorporó como pedido finalizado; el texto original se conserva en la revisión histórica marcada `resolved`, no eliminada.
- Auditoría trazable mediante un run de importación supervisada y eventos de nueva orden/nueva línea.
- Sincronización posterior real 03/11/2026: 21 pedidos, 50 líneas, 46 recibidas, 19 completos, cero cambios y ninguna incidencia de revisión.
- La excepción del lector se restringe estrictamente a 26/822, fila 928, referencia exacta y expresión de cantidad exacta. Otras cajas/cantidades ambiguas siguen en cuarentena.

## Cubas Elecnor
- Catalogado pero no importado; archivo histórico sin pedidos recientes confirmados desde julio 2026.
- No se modifica, ni se habilita la sincronización ni se crean reclamaciones; revisar cuando aparezcan pedidos nuevos.

## Verificaciones y seguridad
- RLS: Israel ve 1321 pedidos y el catálogo de 37 fuentes; un usuario no autorizado ve 0.
- RLS: Israel puede insertar una decisión auditada en transacción ROLLBACK; no puede registrar nuevas obras.
- La petición manual de Israel pasó prueba en ROLLBACK, sin peticiones reales de prueba persistidas.
- 36 libros continúan con cron regular rotativo; original Google Drive no se modifica.
- Comparación y comprobación de conexión Drive habilitadas para las dos cuentas, tras validación de sesión y perfil activo.
- Tests estáticos de sintaxis del frontend y edge functions aprobados; suite de regresión extendida.
- Se retiró/deshabilitó la función temporal de inspección del pedido y se eliminaron sus archivos de la rama antes de fusionarla.
- La función de refresco manual es SECURITY DEFINER intencional por requerir escritura en cola privada. Su entrada verifica cuenta activa, JWT y lista cerrada de correos.
- No ampliar el módulo a más usuarios sin aprobarlo expresamente.

## Comprobación visual recomendada
- Login Israel: pestañas Consultar precios, Buscar pedido, Seguimiento; no Normalización ni Importar.
- Login Sergio: administración de nuevas obras sigue disponible.
- Ambos: color del encabezado naranja, sin BETA, filtro almacén, botón de sincronizar y pedido Taller 26/822 ya no aparece en revisión.

Entregables: PR de liberación y migraciones 063 (permisos) y 064 (TALLER).
