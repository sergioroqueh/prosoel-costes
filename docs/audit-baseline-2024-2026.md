# Auditoría base de pedidos 2024-2026

Primera pasada técnica sobre los tres ZIP históricos recibidos.

## Volumen

| Año | Excel | Procesados | Líneas detectadas |
| --- | ---: | ---: | ---: |
| 2024 | 1.104 | 1.100 | 4.434 |
| 2025 | 957 | 957 | 3.724 |
| 2026 | 802 | 802 | 3.374 |
| **Total** | **2.863** | **2.859** | **11.532** |

No se han encontrado archivos binariamente duplicados por SHA-256.

## Diversidad observada

- 3.497 referencias distintas con valor.
- 4.512 descripciones distintas.
- 67 nombres de proveedor distintos tal como aparecen en los pedidos.
- 651 referencias aparecen asociadas a más de una descripción.
- 87 descripciones aparecen asociadas a más de una referencia.

Estos números confirman que la normalización debe ser revisada y no puede basarse
en una relación simple referencia = material.

## Plantillas

La gran mayoría mantiene las hojas:

`HOJA PEDIDO | OBRAS | MATERIALES`

Existen algunas variantes con hojas adicionales o copias de HOJA PEDIDO. En
2024 hay cuatro ficheros que requieren revisión específica porque la primera
pasada no encontró la cabecera estándar de líneas.

## Numeración

La referencia interna de la hoja no es siempre fiable: existen ficheros cuyo
nombre y referencia interna no coinciden, además de casos con año interno
arrastrado de una plantilla anterior.

Por ello la identidad del pedido será un dato revisable y conservará la fuente
de la que fue obtenida.

Con el nombre de fichero como candidato principal:

- 2024: máximo principal 1153.
- 2025: máximo principal 962.
- 2026: máximo principal 774.

2026 incluye una serie especial `210-x` y revisiones como `315.1`, que no deben
hacer avanzar el contador principal.

## Precios y totales

Hay líneas sin referencia y líneas todavía sin precio en los tres años. También
existen pedidos cuyo total necesita revisión.

La importación conservará esos registros, pero no los tratará como precios
válidos hasta superar las validaciones correspondientes.

## Conclusión de esta pasada

El conjunto es suficientemente consistente para automatizar la extracción, pero
no para auto-normalizar materiales sin revisión. La prioridad es construir:

1. importación robusta;
2. bandeja de incidencias;
3. revisión de identidad de pedidos;
4. catálogo de variantes comerciales;
5. propuestas de normalización asistidas.
