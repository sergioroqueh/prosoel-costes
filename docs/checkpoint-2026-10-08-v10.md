# PROSOEL Costes — checkpoint V10 (08-10-2026)

## Estado comprobado en Supabase

- Histórico: **2.868 pedidos**, **11.546 líneas**.
- Importaciones mediante pestaña web V9: **5 pedidos** (26/775 a 26/779), **8 líneas**.
- Los cinco pedidos nuevos tienen `validation_status=valid`, y sus ocho líneas `price_validation_status=valid`.
- Clasificación: 7 líneas pendientes de clasificar como material, 1 línea de `environmental_fee` (RAEE).
- Normalización supervisada: los candidatos continúan en la cola para revisar sin aprobar equivalencias automáticas.
- Ejemplo comprobado: pedido 26/778 tiene 8 farolas STREET PRO a 152,60 €/ud (1.220,80 €) y RAEE 8 × 0,50 € (4,00 €), total **1.224,80 €**.

## Hallazgo de conciliación

- El contador anterior mostraba `Huecos: 0`, pero ese valor procede de `order_sequence_exceptions` (avisos registrados previamente); no es un recuento automático de números faltantes.
- En el tramo **26/680–26/779** existen dos posibles números sin pedido asociado: **26/740** y **26/763**.
- **No** se ha concluido que sean pérdidas o errores: podrían ser pedidos anulados, reservados o todavía no incorporados.
- La cabecera web dice ahora **«Avisos anotados»** en lugar de «Huecos», y añade explicación al pasar el cursor.

## Implementación V10

- Se amplía la pestaña administrativa **Importar pedido** con **Control de importaciones**.
- Resumen con:
  - pedidos y líneas de todos los años;
  - pedidos del año seleccionado, último número y siguiente;
  - pedidos con incidencias de validación de importes;
  - grupos de normalización pendientes;
  - altas realizadas a través de la web y posibles huecos numéricos recientes.
- Comprobación de **los últimos 100 números** del año seleccionado sin tratar variantes/subpedidos como huecos adicionales.
- Tabla de las **últimas 20 importaciones web** del año elegido: fecha de importación, número, fecha del pedido, proveedor, archivo de origen, líneas, importe declarado y validación.
- Selector de año (2024/2025/2026) y botón Actualizar; datos obtenidos desde las tablas y RPC existentes.
- Admin exclusivamente: el panel forma parte de la sección protegida Importar pedido. Ninguna nueva función de escritura ni migración SQL.
- Al guardar un pedido nuevo, el panel se actualiza junto con el contador.
- Archivos versionados: `app/static/index.html` (revisión `v=20261008-v10`), `app/static/app.js`, `app/static/styles.css`.

## Pruebas

- JavaScript principal: **sintaxis PASS**; controles del panel presentes en HTML y JS; estilos responsivos comprobados.
- Simulación de consulta con datos de ejemplo: detecta **26/740 y 26/763**, renderiza el detalle y la fila de importación, mantiene el botón Actualizar funcional; comprobación de la lógica **PASS**.
- SQL real: confirmados los dos números ausentes en el tramo 680–779 y los cinco pedidos con su clasificación y validación.
- Sin modificaciones de compras originales ni materiales canónicos.
- Pendiente **prueba visual manual** en navegador: confirmar que el panel carga las últimas importaciones con sus proveedores y que su consulta no da error PostgREST.
- Antes de la siguiente fase, investigar con el usuario si 26/740 y 26/763 están anulados/reservados o se deben localizar en archivos de pedidos.

## Continuación propuesta

1. Verificar en web `Importar pedido → Control de importaciones` con el año 2026.
2. Confirmar la naturaleza de los posibles huecos 740 y 763, sin registrar decisiones precipitadas.
3. Añadir clasificación supervisada de huecos (anulado / reservado / pendiente / justificable), con justificación y auditoría, si resulta útil.
4. Avanzar el catálogo normalizado por familias técnicas priorizadas (iluminación, aparamenta, tubos, cables) y la comprobación de equivalencias con fabricante, sin aprobación automática.

La política de usuarios permanece igual: solo las cuentas ya autorizadas.
