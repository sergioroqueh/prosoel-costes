# MVP web - buscador de costes PROSOEL

## Objetivo

Convertir el histórico de pedidos en una herramienta diaria de consulta para
presupuestos.

La interfaz no exige conocer la referencia exacta. La búsqueda trabaja sobre:

- nombre canónico;
- fabricante;
- referencia de fabricante;
- referencias comerciales observadas;
- descripciones históricas;
- texto aproximado mediante trigramas PostgreSQL.

Ejemplos válidos:

- `diferencial 4P 40A 300mA`
- `RZ1-K 5G6`
- `toma RJ45 Cat 6`
- `403585`

## Funcionalidades del primer MVP

### Buscador global

Los resultados mezclan:

1. materiales ya consolidados;
2. líneas históricas todavía pendientes de normalización.

Nunca se presenta un pendiente como si fuese un material verificado.

Cada resultado muestra:

- descripción;
- referencia;
- fabricante cuando se conoce;
- último precio neto;
- último proveedor;
- **número de pedidos distintos en los que aparece**.

El contador de compras es deliberadamente visible porque ayuda a distinguir el
material habitual de PROSOEL de una compra aislada.

### ¿De dónde sale este precio?

Es un requisito principal del producto.

Todo precio debe poder abrir su línea de origen con:

- pedido;
- proveedor;
- fecha;
- obra/proyecto;
- cantidad;
- referencia usada en la compra;
- descripción original;
- PVP;
- descuento;
- precio neto;
- total;
- nombre del archivo histórico de origen.

La web no devuelve un precio opaco.

### Histórico de precios

La ficha de material muestra:

- número de pedidos;
- número de líneas;
- cantidad total comprada;
- último precio;
- mínimo histórico;
- mediana;
- máximo;
- tabla cronológica completa de compras.

RAEE, ecotasas, portes y transporte quedan fuera de estas estadísticas.

### Resultados todavía pendientes

Una referencia no normalizada también puede consultarse.

Se muestra como `Pendiente de normalizar` y mantiene acceso a todas sus líneas
de pedido y precios. Esto permite usar la aplicación mientras continúa la
consolidación del catálogo.

### Contador de pedidos

La cabecera muestra:

- último pedido cargado del año;
- siguiente número esperado;
- huecos históricos pendientes.

## API inicial

- `GET /api/search?q=...`
- `GET /api/materials/{id}`
- `GET /api/materials/{id}/prices`
- `GET /api/historical/prices?reference=...&description=...`
- `GET /api/orders/counter?year=2026`
- `GET /api/health`

## Arranque local

1. Crear PostgreSQL.
2. Aplicar `database/schema.sql`.
3. Configurar `DATABASE_URL`.
4. Cargar históricos:

   `python -m database.load_archives /ruta/2024.zip /ruta/2025.zip /ruta/2026.zip`

5. Iniciar:

   `uvicorn app.main:app --reload`

La carga es idempotente por SHA-256: volver a pasar el mismo fichero no duplica
el pedido.

## Siguiente bloque técnico

Después de cargar PostgreSQL:

1. materializar en base de datos las decisiones de normalización ya auditadas;
2. validar el buscador contra consultas reales de PROSOEL;
3. añadir autenticación;
4. desplegar para acceso remoto;
5. añadir importación desde la propia interfaz.
