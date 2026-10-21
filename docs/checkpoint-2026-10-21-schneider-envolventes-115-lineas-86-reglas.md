# Checkpoint — Schneider envolventes, puertas y accesorios — 2026-10-21

## Autorización
El usuario aprobó todas las descripciones propuestas de `PROSOEL_Revision_Envolventes_Schneider_2026-10-21.xlsx` y ordenó dejar las advertencias para resolverlas una a una. No se extrapolan correcciones a referencias fuera del lote.

## Estado de aplicación verificado en Supabase
- Catálogo objeto de revisión: 72 referencias de origen, 136 líneas históricas.
- Aplicadas: 115 líneas, 54 referencias de origen (53 completas y `LVSXG424` aplicada en 5 de sus 6 líneas).
- Reglas de importación insertadas y activas: 86, en `private.confirmed_import_normalization_rules`; cada una usa coincidencia exacta de proveedor, referencia de origen y descripción original.
- Se realizó `INSERT` de 115 filas en `public.purchase_line_overrides`, indicando descripción canónica sin cambiar referencia (mientras no se verifique alias).
- Los originales en `public.order_lines` no se modificaron, tampoco cantidades, proveedores, pedidos, PVP, descuentos o precios netos.
- Auditoría posterior: 115/115 descripciones visibles `public.order_lines_effective` iguales al texto aprobado; 0 diferencias; 86/86 reglas activas.
- La interfaz `search_costs_enriched` agrupa los resultados históricos sin ficha material mediante referencia y descripción efectivas, por lo que los productos con misma referencia y descripción quedan agrupados.
- El procesador actual `private.apply_confirmed_import_rules` conserva comprobaciones de precio y conflicto para nuevos pedidos: las reglas no autorizan saltarlas.
- No se modificó ninguna función RPC, esquema, RLS, importador ni UI.

## Referencias aplicadas (54)
### Envolventes y cajas (33 referencias, 74 líneas)
LVSXE313, LVSXE318, LVSXE418, LVSXG318, LVSXG324, LVSXG424 (5 de 6 líneas),
LVSXG524, LVSXG624, LVSXL224, LVSXL324, LVSXL413, LVSXL418, LVSXL424,
LVSXL524, LVSXL624, LVSST624, LVSST724, LVSST824, 13182, 13979,
13981, 13983, 13986, 13987, NSYCRN75250, NSYDBN1010,
NSYDBN2015, NSYDBN2520, NSYPLM43G, NSYPLM64G,
NSYPLM64VG, NSYPLM75G, NSYPLM75VG.

### Puertas (8 referencias, 16 líneas)
LVSXDP418, LVSSDP624, LVSSDP724, LVSSDP824, LVS08254, PRA16418,
PRA16424, PRA16524.

### Accesorios (13 referencias, 25 líneas)
LVS03002, LVS03006, LVSXF4, LVSXS2, LVSXX7, NSYDLA88G,
NSYMB43, NSYMB64, NSYMB75, NSYMM75, NSYPFCR, NSYPFXPLM, NSYTL405PLM.

## Pendientes de resolver: 19 casos, 21 líneas
- `13978` (1 línea): 18 módulos en histórico frente a 8 en fabricante.
- `LVSXG424` **línea 3302** (1 línea), pedido `24/10`, GRUPO JARAMA: descripción `SIN PUERTA`; no corregida. Las otras cinco líneas sí aplicadas.
- `LVSCG624` (1 línea), RELUZ pedido `24/604`: probable errata `LVSXG624`, no fusionar sin confirmar.
- `MIP20212` (1): histórico Mini Pragma vs propuesta Resi9 MP.
- `LVS08244` (2): detalles técnicos y configuración sin confirmar.
- `LVSSDD8` (1): especificación puerta de pasillo.
- `LVS03203` (1) y `LVS03216` (2): mismo nombre genérico, SKU diferentes; pendiente discriminar.
- `NSYDLA48PG` (1) y `NSYDLA66G` (1): capacidad y compatibilidad pendientes.
- `13948` (1): confirmar referencia de cerradura/kit.
- Alias de distribuidor reservados (8 líneas): `LIVCSST624`, `LIVCSXG424`,
`LIVCSXG524`, `LIVCSXL524`, `8390516611`, `8390581042`,
`8390581044`, `SEELVSXDP418`. NINGUNO normalizado todavía.
- No mezclar `NSYPLM64G` con `NSYPLM64VG` ni `NSYPLM75G` con `NSYPLM75VG`: se normalizaron las descripciones **con referencias separadas**; diferencia de cierre.
- Puertas `PRA16418`, `PRA16424`, `PRA16524`: se normalizaron con SKU separados, **sin** fusionar por compatibilidad.

## Excel de control
`PROSOEL_Envolventes_Schneider_Normalizacion_Aplicada_2026-10-21.xlsx`.
Incluye las mismas categorías, estados `Aplicada`, `Aplicada parcialmente (5/6)`, `Pendiente de revisión`, pestaña de auditoría de ejecución y pestaña `Pendientes 21-10` con 19 casos en orden de revisión.

## Siguiente etapa
Revisar advertencias **una por una** en el siguiente turno, empezando por `13978` o por una línea de compra que el usuario señale.
