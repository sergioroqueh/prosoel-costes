# PROSOEL Costes — Auditoría y normalización integral del histórico H07Z1-K

**Fecha:** 2026-10-13  
**Supabase:** `kusbndefngttaiytcrui`  
**Solicitado por:** PROSOEL, durante la revisión histórica de precios.

## Objetivo

Revisar todas las secciones del cable flexible H07Z1-K, contrastando **referencia, sección, color, proveedor, pedidos, cantidades y evolución de precios**, identificando abreviaturas y discrepancias. Descripción efectiva estandarizada:

`Hilo Flexible Libre Halógenos H07Z1-K [seccion]mm2 [color]`

En secciones decimales, usar punto (ejemplo **1.5mm2** y **2.5mm2**), con color en mayúsculas: **AMARILLO VERDE, AZUL, GRIS, MARRON, NEGRO**. No se cambian datos históricos de Excel ni cifras de ninguna compra.

## Alcance real inspeccionado

Primera búsqueda por la palabra H07Z1: **1.069 líneas** y **112 referencias**. Al ampliar la consulta a **todas las compras de esas mismas referencias** (incluyendo textos comerciales que omiten la denominación H07Z1), el universo completo contiene:

- **1.136 líneas** correspondientes a **215 pedidos**.
- **401 líneas** ya revisadas antes de esta actuación.
- Secciones verificadas de unipolares: **1,5; 2,5; 4; 6; 10; 16; 25; 35 y 50 mm²**.
- Diferenciación por sección, color, variante de referencia, proveedor y características comerciales. **No se fusionan indiscriminadamente las referencias propias de distintas marcas**, aunque se normalice su descripción. La agrupación en buscador depende también de las referencias efectivas, y no equivale todavía a disponer de una ficha de material normalizado.

## Revisión de precios y referencias

Se compararon las descripciones y precios por sección y color, también revisando pedidos completos cuando se presentaban discrepancias.

### Correcciones de referencia efectivamente realizadas

**37 líneas** recibieron una referencia efectiva diferente, siempre guardando la referencia fuente de los Excel:

- 2 compras mal codificadas bajo sección de 1,5 mm², pero cuya descripción, precio de **0,312 €/m** y contexto del pedido **26/210-26** indican sección **2,5 mm²**:
  - Línea **11137**, cable MARRON: `H07Z1K1,5MR` → `H07Z1K2,5MR`.
  - Línea **11138**, cable GRIS: `H07Z1K1,5GR` → `H07Z1K2,5GR`.
- **35 líneas** de abreviaturas coherentes de GRUPO RIAS, consolidadas bajo la referencia preexistente del mismo proveedor y cable:
  - `H07Z1K1,5MAR` → `H07Z1K1,5MR`: **8**.
  - `H07Z1K1,5GRI` → `H07Z1K1,5GR`: **8**.
  - `H07Z1K1,5AZ` → `H07Z1K1,5AZR`: **5**.
  - `H07Z1K2,5MA` → `H07Z1K2,5MR`: **4**.
  - `H07Z1K2,5AZ` → `H07Z1K2,5AZR`: **3**.
  - `H07Z1K2,5NR` → `H07Z1K2,5NGR`: **2**.
  - `H07Z1K1,5NR` → `H07Z1K1,5NGR`: **2**.
  - `H07Z1K6AZ` → `H07Z1K6AZR`: **1**.
  - `H07Z1K1,5MA` → `H07Z1K1,5MR`: **1**.
  - `H07Z1K1,5AV` → `H07Z1K1,5AVR`: **1**.

Las demás líneas identificadas se corrigieron únicamente en la **descripción efectiva**; se conserva su referencia efectiva y comercial existente.

### Precios históricos

Todos los campos originales `quantity`, `pvp`, `discount_raw`, `discount_components_raw`, `net_unit_price`, `total_price`, proveedor, fechas y pedido permanecen idénticos. Se comprobó que el historial mantiene importes distintos cuando los precios reales cambiaron con el tiempo. **Nunca se sustituyó un precio por la media o por el precio de otra compra.**

## Aplicación segura

1. Se preparó una clasificación técnica de cables unipolares por descripción de origen (sección/color), comparada con sección inferida de la referencia donde fuera legible.
2. Se excluyeron contradicciones no demostradas, cables multiconductores y posibles errores de unidades/precios.
3. Primera tanda: **486 líneas de 1,5/2,5 mm²**, 36 cambios de referencia y 10 descripciones normalizadas; simulación `BEGIN/ROLLBACK` y aplicación en `BEGIN/COMMIT`.
4. Segunda tanda: **233 líneas** de 4, 6, 10, 16, 25, 35 y 50 mm², un cambio de referencia y 31 descripciones normalizadas; mismo protocolo `ROLLBACK` y `COMMIT`.
5. Se respetaron las **401 revisiones anteriores**. La línea **11135** (2,5 mm² AMARILLO VERDE), cuya referencia había sido corregida previamente, requirió una **segunda revisión**, solo para completar la descripción efectiva; pasó de versión 1 a 2, sin perder la referencia ya corregida.
6. Las transacciones fueron atómicas. Cada una validó la versión anterior, filas esperadas, referencias, descripciones originales, precios, descuentos, cantidad, situación de exclusión y recuento final.
7. Se verificó mediante hash la **identidad de todas las filas originales** de `public.order_lines` y sus pedidos de `public.orders` antes/después de cada transacción.
8. Se usaron `public.purchase_line_overrides`, `public.purchase_review_events` y `private.reconcile_review_reference`. El actor de la auditoría es `asistente-prosoel-costes`; el motivo incluye `H07Z1-AUDIT-20261013`.
9. La función `private.apply_purchase_line_review` requiere un JWT administrador de la web que no dispone el conector SQL. Se usó el mismo modelo de overrides, eventos y versiones dentro de transacciones verificadas, sin suplantar sesión de usuario.

## Resultado final verificado

- **719** líneas sin revisión previa modificadas, con **719 eventos**.
- **1** segunda revisión añadida a línea 11135, con su evento adicional.
- **720 nuevos eventos**, **720 líneas distintas** afectadas durante esta actuación.
- **37 cambios efectivos de referencia**; los eventos que incluyen una referencia corregida son 38 porque el segundo evento de la línea 11135 conserva una corrección de referencia realizada anteriormente.
- **41 descripciones estándar** distintas utilizadas en las nuevas revisiones.
- **1.120/1.136 líneas** del universo ampliado tienen ahora un nombre efectivo que sigue estrictamente el patrón solicitado. La consulta a `public.order_lines_effective` confirmó el resultado.
- Las 16 líneas restantes están identificadas más abajo. No se han reescrito originales ni precios.
- Solo cambios de datos, sin cambios de código ni despliegue web.

## 16 casos deliberadamente pendientes

### 6 anomalías de unipolares, requieren confirmación específica

1. **ID 3473**, `H07Z1K1,5GR`, pedido **24/356**, GRUPO RIAS: descripción original `H07Z1K 10 MM AMARILLO / VERDE`, neto **0,155 €/m**. El precio se aproxima al de 1,5 mm², pero referencia GR sugiere **GRIS** mientras descripción indica **AMARILLO VERDE** y sección 10. **No decidir color ni sección solo por precio.**
2. **ID 9734**, `H07Z1K1,5GR`, pedido **26/210 - 24**, GRUPO RIAS: descripción 1,5 mm² GRIS, pero precio **0,312 €/m**; en ese mismo pedido otros colores de 1,5 cuestan **0,195 €/m**, mientras 2,5 mm² cuesta **0,312 €/m**. Puede ser error de tarifa o sección. **No modificar precio ni reclasificar sin verificar pedido.**
3. **IDs 4838, 6676 y 8111**, `H07Z1K2,5GRI`, GRUPO RIAS: texto `2,5 MM GRIS VERDE`, neto **0,263 €/m**. La referencia apunta a GRIS, pero la descripción mezcla colores. **Confirmar si son GRIS, no fusionar por aproximación.**
4. **ID 10614**, referencia fabricante `20302862`, pedido **26/504**, GRUPO JARAMA: `H07Z1-K (AS) 1x25 AM-VD BOB.`, **7,894 €/m** frente a compras anteriores del mismo modelo típicamente ~**2,8–3,0 €/m**. No se modifica el precio; confirmar unidad, error de importación o tarifa extraordinaria.

### 10 líneas que no deben pasar a unipolar por simple coincidencia de referencia/familia

- **8 líneas** de cables **multiconductores** `AFIREFACIL310`, `AFIREFACIL316`, `AFIREFACIL2251`, `AFIREFACIL225116`: incluyen múltiples conductores y no se deben renombrar como un conductor único.
- **2 líneas** IDs **709 y 1122**, SALTOKI, referencia `6000750255`, descripción **RZ1-K(AS) 3G1,5mm² 0,6/1 kV**, neto **0,7426 €/m**. Su referencia coincide con otras compras `H07Z1-K(AS) 2,5mm² AMARILLO VERDE`, indicando posible **reutilización/colisión de referencia**. Se dejaron sin modificación y requieren revisar cuál es la referencia correcta del cable RZ1-K.

## Observación de buscador y Procedencia

La vista SQL `public.order_lines_effective` y la auditoría confirman agrupaciones y preservación de los datos de origen. Las funciones de búsqueda de la aplicación requieren JWT autenticado, no disponible desde el conector administrativo. Por ello, no se afirma comprobación visual de la web. No se añadió ficha de material ni se modificaron pantallas.
