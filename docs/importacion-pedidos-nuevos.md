# Importar pedidos nuevos en PROSOEL Costes (V9)

## Para qué sirve
Dar de alta **un pedido XLSX cada vez**, desde el navegador y sin Git/Python en el ordenador del trabajo. Solo puede confirmar la importación el usuario con rol **admin**.

**La primera prueba recomendada es con un Excel ya importado:** se debe reconocer como duplicado y no permitir confirmar. No hace falta subir ni guardar nada para esa prueba.

## Procedimiento
1. Abrir https://sergioroqueh.github.io/prosoel-costes/ e iniciar sesión.
2. Entrar en la pestaña **Importar pedido**.
3. Elegir el fichero **.xlsx** original (no un ZIP ni un .xls; límite 15 MB).
4. Esperar a que se muestre la vista previa: número/año, fecha, proveedor, obra, líneas, PVP, descuento, precio neto, totales y advertencias.
5. Comprobar especialmente el **número de pedido** y el **importe** antes de confirmar. La vista previa muestra hasta 50 líneas; se importan todas (máximo 250 líneas por pedido).
6. Marcar la casilla de comprobación y pulsar **Confirmar importación** solamente si todo es correcto.
7. Revisar el mensaje final. Las nuevas compras estarán disponibles en el buscador y sus referencias se incorporarán a la cola de revisión si aparecen códigos repetidos/variantes.

## Qué protege el proceso
- El fichero XLSX original **no se envía ni almacena** en Supabase: se descomprime y lee localmente en el navegador. Tras la confirmación se envían únicamente los datos extraídos para la base de precios.
- El SHA-256 de todo el archivo identifica **duplicados exactos**. Si la misma hoja se guarda otra vez y cambian bytes pero conserva el número, se detecta **conflicto de año/número/subnúmero** y se bloquea. Se requiere revisión manual, no sobrescritura silenciosa.
- SQL backend solo admite el rol admin autorizado; la operación es **atómica**, registra una auditoría, y no cambia pedidos históricos ni materiales consolidados.
- Los conceptos de RAEE, transporte y servicios se conservan en pedidos, pero quedan excluidos del catálogo técnico según las reglas existentes.
- La cola de Normalización se actualiza solo para referencias afectadas, sin aprobar equivalencias ni modificar decisiones previas.

## Alcance y limitaciones de la versión
- Diseñada para los Excel de PROSOEL con hoja **HOJA PEDIDO**, estructura actual o histórica de **dos descuentos**.
- Usa APIs modernas de navegador: ZIP/Deflate, DOMParser y WebCrypto. Recomendado **Chrome/Edge actualizados**.
- Requiere que Excel guarde los resultados calculados de sus fórmulas antes de subir. Si falta un cálculo, el importador lo advierte.
- No reconoce PDFs, .xls binarios ni plantillas ajenas a PROSOEL; no intentar incorporarlas como si fueran pedidos de PROSOEL.
- Precio histórico inválido/descuadrado no se corrige automáticamente. **Hay que revisar la vista previa**.
- El primer flujo web completo con un XLSX debe verificarse con la cuenta autorizada antes de incorporar un pedido nuevo. Las pruebas previas cubren SQL, bloqueos, extracción de cabeceras y fechas; falta la prueba manual de navegador con un archivo real.

## Decisiones de normalización asistida
En **Normalización**, cada referencia muestra la ayuda preliminar de PROSOEL Costes:
- diferencias de potencia o longitud explícitas ⇒ sugerir **no fusionar**;
- variaciones meramente de espacios/tildes ⇒ recomendar comprobación documental;
- mismo código entre proveedores ⇒ comprobar fabricante y modelo.
El botón **Preparar justificación para revisar** copia un borrador al formulario, **nunca guarda ni marca la casilla**. Solo una revisión humana sustentada autoriza una decisión.

También hay filtro por estado: Todos, Pendientes, Necesitan evidencia, Contienen productos distintos y Pendientes de vincular.

## Si aparece un error
- **Archivo duplicado:** ya existe y no debe importarse otra vez.
- **Número reutilizado:** abrir el pedido existente, comprobar si es una revisión del mismo fichero, una subnumeración legítima o un error. No cambiar el nombre solo para saltarse la comprobación.
- **Plantilla no compatible:** comprobar que es un XLSX válido y contiene HOJA PEDIDO con las cabeceras de referencia/material/precios.
- **Faltan precios / no cuadran los totales:** recalcular y guardar desde Excel o revisar la fuente; **no** forzar datos incorrectos.
- **Otro error en la lectura:** conservar el XLSX original y compartir el mensaje exacto para adaptar el lector de forma segura.

## Fuente de verdad y control de cambios
- Migraciones SQL: `supabase/migrations/20261008_010_browser_order_import.sql`, `20261008_011_import_refresh_review_queue.sql`, `20261008_012_review_queue_status_filter.sql`.
- Parser local: `app/static/order_import.js`; pantalla: `app/static/index.html`, lógica `app/static/app.js`, estilos `app/static/styles.css`.
- Checkpoint de evolución: `docs/checkpoint-2026-10-08.md`.
