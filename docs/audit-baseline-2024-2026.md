# Auditoría base de pedidos 2024-2026

Auditoría técnica completa de los tres ZIP históricos recibidos el 7 de octubre de 2026.

## Volumen

| Año | Excel | Procesados | Líneas detectadas |
| --- | ---: | ---: | ---: |
| 2024 | 1.104 | 1.104 | 4.440 |
| 2025 | 957 | 957 | 3.724 |
| 2026 | 802 | 802 | 3.374 |
| **Total** | **2.863** | **2.863** | **11.538** |

No se han encontrado duplicados binarios por SHA-256.

La extracción completa, sin conservar los Excel, ocupa aproximadamente 3,34 MB
en una base SQLite de staging. Esto confirma que la base de datos estructurada
puede mantenerse muy pequeña frente a los aproximadamente 710 MB comprimidos de
los tres ZIP.

## Diversidad observada

- 3.497 referencias distintas con valor.
- 4.512 descripciones distintas.
- 67 nombres de proveedor distintos tal como aparecen escritos.
- 651 referencias aparecen asociadas a más de una descripción.
- 87 descripciones aparecen asociadas a más de una referencia.
- 184 líneas no tienen referencia.

Estos números confirman que la normalización debe ser revisada y no puede
basarse en una relación simple referencia = material.

## Plantillas

Se han podido procesar los 2.863 Excel.

La plantilla dominante usa:

UDS. | REFERENCIA | MATERIAL | PVP | DTO. | PRECIO NETO | PRECIO TOTAL

También aparecen METRO y METROS como unidad de cabecera.

Se ha localizado una variante histórica de 2024 con dos descuentos:

UDS. | REFERENCIA | MATERIAL | PRECIO | DTO. 1 | DTO. 2 | PRECIO NETO | PRECIO TOTAL

El importador ya contempla ambas estructuras.

## Numeración

La referencia interna de la hoja no es siempre fiable. Hay plantillas copiadas
que conservan un número o año anterior y también fechas internas erróneas.

Se han marcado 65 pedidos con conflicto de identidad para revisión humana.

Con el nombre de fichero como candidato principal:

- 2024: máximo principal 1153; 52 huecos aparentes.
- 2025: máximo principal 962; 6 huecos aparentes.
- 2026: máximo principal 774; 9 huecos aparentes.

En 2026 los huecos aparentes son:

101, 110, 222, 270, 340, 480, 500, 740 y 763.

Un hueco no implica automáticamente que falte un archivo: puede ser un pedido
anulado o un número no utilizado.

2026 incluye una serie especial 210-x y una revisión 315.1. Estas variantes no
hacen avanzar el contador principal.

Por tanto, una vez validada la carga actual:

- último pedido principal registrado: 26/774;
- siguiente esperado: 26/775.

## Calidad de precios

De las 11.538 líneas:

- 11.037 tienen precio positivo y coherencia aritmética cantidad x precio neto = total;
- 413 tienen precio incompleto;
- 85 tienen valores cero o no positivos;
- 3 tienen discrepancia entre cantidad x precio neto y total.

Las tres discrepancias aritméticas no se corrigen automáticamente. Dos de ellas
parecen usar una base comercial distinta, por ejemplo precio por 100 unidades,
pero esa interpretación requiere revisión humana.

También se ha comprobado que en 64 líneas el precio neto es superior al campo
PVP. Por ello PVP no se usará como fuente de verdad para el coste: se conserva
como dato histórico y la referencia de precio se apoyará en el precio neto
validado.

## Totales de pedido

- 2.756 pedidos cuadran con la suma de sus líneas.
- 47 tienen diferencia entre total declarado y suma de líneas.
- 45 tienen líneas con precios incompletos.
- 15 no tienen importe declarado.

Un pedido con incidencia no se elimina. Se conserva y entra en una bandeja de
revisión.

## Conclusión

La carga histórica puede automatizarse con una tasa de lectura del 100 %, pero
la normalización y las incidencias deben mantener revisión humana.

El orden de trabajo recomendado es:

1. persistir todos los pedidos y líneas sin modificar el dato original;
2. resolver incidencias de identidad y precio;
3. consolidar proveedores;
4. construir variantes comerciales;
5. proponer equivalencias a materiales canónicos;
6. aprobar equivalencias por lotes antes de usarlas en presupuestos.
