# PROSOEL Costes — Unificación latiguillo RJ45 CAT.6 negro, referencia 027250106

**Fecha:** 20/10/2026. **Supabase:** `kusbndefngttaiytcrui`.

## Confirmación expresa del usuario
Unificar las compras con referencia de origen **`027250106`** en la descripción efectiva exacta:

**Latiguillo RJ45-RJ45 UTP 0,5 m CAT.6 Negro**

La confirmación incluye explícitamente el texto de origen con sufijo **SLIM**. No se ha verificado de forma independiente la identidad técnica/comercial del producto: la normalización se efectúa por autorización del usuario sobre las compras indicadas.

## Compras auditadas

| ID línea | Pedido | Fecha | Proveedor | Texto fuente | Cantidad | PVP € | Descuento | Neto unitario € | Total € |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | ---: |
| 7732 | 25/822 | 2025-11-05 | CABLE CEL (proveedor ID 3) | LATIG. RJ45-RJ45 UTP 0,5 MT CAT.6 NEGRO | 40 | 0,770 | NETO | 0,770 | 30,80 |
| 9243 | 26/749 | 2026-09-30 | CABLE CEL (proveedor ID 3) | LATIG. RJ45-RJ45 UTP 0,5 MT CAT.6 NEGRO SLIM | 40 | 0,862 | NETO | 0,862 | 34,48 |

Total histórico preservado: **65,2800 €**; cantidad total: **80 unidades**. Las dos líneas tenían revisión 0 y no existían reglas para esta referencia y proveedor antes de esta operación.

## Aplicación y auditoría
1. Comprobadas las dos compras y pedidos mediante datos vivos de Supabase. Se obtuvo hash MD5 de las dos filas originales de `public.order_lines`, ordenadas por ID: `2d06e9f78b298a20a64b21dc8680f75d`.
2. Simulación transaccional real con `BEGIN/ROLLBACK`: 2 descripciones efectivas corregidas, 2 eventos, 2 reglas futuras, sin modificar datos fuente. Verificada posteriormente la ausencia de efectos de la simulación.
3. Transacción definitiva `BEGIN/COMMIT`, con bloqueos y comprobaciones de IDs, proveedor, referencia exacta, importes, descuentos, fecha, pedido, exclusiones y ausencia de revisiones/reglas previas.
4. Insertados dos registros en `public.purchase_line_overrides` con `corrected_reference=NULL`, `corrected_description` canónica, `excluded=false`, `revision=1` y motivo de confirmación del usuario.
5. Añadidos dos eventos en `public.purchase_review_events`, con estados antes/después y actor `asistente-prosoel-costes`.
6. Creadas dos reglas activas en `private.confirmed_import_normalization_rules`: **IDs 233 y 234**, familia `LATIGUILLOS UTP CAT6`. Coinciden por proveedor **CABLE CEL** (3), referencia **`027250106`** y cada uno de los dos textos de origen con espacios normalizados; destino común `027250106` y la descripción indicada.
7. Invocado `private.reconcile_review_reference('027250106')`.
8. Lecturas posteriores al commit: 2 compras efectivas agrupadas bajo una única descripción, 2 eventos de auditoría, 2 reglas futuras activas, hash original de `public.order_lines` idéntico y total original **65,2800 €**. Total de reglas activas tras la operación: 203.
9. Simulación en SQL de la coincidencia de reglas y de los filtros de alerta de precio vigentes, utilizando cada compra como ejemplo y la otra como histórico comparable: ambas entradas dan `rule_match_price_ok`, sin sustituir los precios.

## Alcance de las importaciones futuras
El importador actual `private.apply_confirmed_import_rules`, invocado por `public.import_new_prosoel_order`, reconoce **estas dos variantes exactas de CABLE CEL** con referencia `027250106`. El emparejamiento no se hace solo por referencia: proveedor y texto de origen confirmado forman parte de la condición de seguridad. Una descripción nueva, otro proveedor o un precio atípico quedan sujetos a revisión; el proceso no fuerza nuevas equivalencias ni reemplaza ningún precio. La prueba real bajo JWT de administrador se efectuará cuando se importe un nuevo pedido legítimo con uno de esos textos.

La pantalla puede seguir mostrando **«Identidad técnica sin verificar»** porque esta tarea normaliza las compras de la referencia sin crear una ficha certificada en `public.materials`. No se ha modificado el código de la web ni se ha lanzado un despliegue de GitHub Actions.
