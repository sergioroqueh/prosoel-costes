# Verificación externa de referencias

La base de PROSOEL no debe asumir que dos referencias distintas son un error.

Antes de decidir una relación entre referencias se intenta contrastar con:

1. fabricante oficial;
2. ficha técnica o catálogo oficial;
3. distribuidor profesional fiable;
4. otras fuentes públicas solo como apoyo secundario.

## Tipos de relación

- canonical: referencia fabricante vigente.
- legacy_of: referencia antigua sustituida por otra.
- supplier_alias_of: código interno/comercial de proveedor.
- typo_of: error de transcripción confirmado.
- equivalent_variant: mismo uso técnico, pero variante comercial o de embalaje.
- distinct_product: parecen similares, pero son productos distintos.
- pending_review: evidencia insuficiente.

## Regla de seguridad

Una referencia nunca se reemplaza en el histórico. La línea original se conserva.
La verificación añade una relación hacia la referencia canónica o clasifica la
relación entre ambas.

Ejemplos ya confirmados en la auditoría:

- AISCAN CR25 es Ø25; CR20 es Ø20: distinct_product.
- Legrand 069711 -> 069711L: legacy_of.
- Legrand 069537 -> 069537L: legacy_of.
- Tecsoled 8463001 -> 08463001: typo_of/alias sin cero inicial, solo cuando
  fabricante y descripción coinciden.
- Cablecel CCAR0019 y CCAR0031A: distinct_product.
- Televés 209901 y 209992: ambas referencias existen; se mantienen como
  variantes comerciales bajo una familia técnica común hasta estudiar su
  equivalencia exacta.

La evidencia pública se guarda con URL y resumen para que cualquier corrección
sea justificable posteriormente.
