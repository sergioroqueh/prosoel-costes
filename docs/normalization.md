# Estrategia de normalización de materiales

## Objetivo

Separar el hecho histórico de compra de la identidad técnica del material.

Una línea de pedido conserva siempre exactamente la referencia y descripción con
la que fue comprada. Esa línea puede apuntar después a un material canónico.

Ejemplo:

- RIAS / H07Z1K1,5AZR
- otro proveedor / otra referencia comercial
- otro fabricante / otra descripción

pueden apuntar a:

H07Z1-K 1x1,5 mm² azul

si sus atributos técnicos demuestran que son equivalentes para nuestro uso.

## Jerarquía de resolución

1. Asociación aprobada existente por proveedor + referencia.
2. Referencia de fabricante inequívoca ya conocida.
3. Regla técnica estructurada sobre descripción y referencia.
4. Búsqueda de candidatos compatibles.
5. Revisión humana si no se supera el umbral de confianza.

Nunca se agrupan materiales únicamente por similitud textual.

## Tres conceptos distintos

### Material canónico

Identidad técnica usada para histórico de precios y costes.

### Variante comercial

La forma concreta en que un proveedor o fabricante vende ese material. Conserva
marca, referencia y descripción comercial.

### Familia presupuestaria

Agrupación más amplia que podrá usarse en presupuestos cuando varios productos
no son idénticos pero sí válidos para cumplir una partida.

La familia presupuestaria se implementará en una fase posterior.

## Regla inicial: H07Z1-K

La primera regla extrae designación, número de conductores, sección, color,
condición libre de halógenos y tensión nominal.

Ejemplo de clave canónica:

CABLE|H07Z1-K|1X|1,5|AZUL

La marca y la referencia de proveedor no forman parte de esta clave.
