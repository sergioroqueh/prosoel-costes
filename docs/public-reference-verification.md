# Verificación pública de referencias

## Objetivo

Reducir la carga de revisión humana contrastando referencias dudosas contra
fuentes públicas fiables, preferentemente del fabricante.

La evidencia pública ayuda a decidir si dos códigos son:

- el mismo producto con referencia antigua/nueva;
- variantes comerciales del mismo material técnico;
- referencias de fabricante frente a alias de proveedor;
- errores de transcripción;
- productos técnicamente distintos.

## Prioridad de fuentes

1. fabricante;
2. ficha técnica o tarifa oficial;
3. distribuidor profesional reconocido;
4. catálogo técnico sectorial.

Una coincidencia en un marketplace genérico no basta por sí sola para corregir
el histórico.

## Tipos de relación

- `current_of`: referencia actual de una referencia histórica;
- `legacy_of`: referencia antigua del mismo producto;
- `supplier_alias_of`: código observado del proveedor para una referencia de fabricante;
- `typo_of`: error de transcripción con evidencia suficiente;
- `commercial_variant_of`: mismo material técnico, distinto formato/embalaje;
- `technical_variant_of`: misma familia pero atributo técnico diferente;
- `distinct_product`: no deben fusionarse.

## Regla de seguridad

La línea histórica nunca se reescribe. Se conserva la referencia observada y se
añade una resolución separada con:

- referencia canónica;
- tipo de relación;
- confianza;
- razonamiento;
- URL de evidencia;
- fecha de comprobación.

Los casos de confianza alta pueden proponerse para aprobación por lotes. Los
casos sin evidencia suficiente permanecen pendientes.

## Hallazgos representativos

La auditoría pública ya ha confirmado, entre otros:

- Legrand 069558 -> 069558L como referencia histórica/actual;
- Schneider A9F79440 frente a la transcripción A9799440;
- Schneider NU320318 frente al alias observado NICU320318;
- Televés 5226 y 5276 como variantes con/sin garras, no como error;
- General Cable 20302902 y 20302939 como variantes comerciales del mismo RZ1-K 3G6;
- General Cable 20302940 (4G1,5) y 20302944 (5G1,5) como productos distintos;
- Simon 51020103-039 (cajetín) y 51010103-030 (marco) como piezas distintas.

La hoja VERIFICACION_WEB del informe de auditoría conserva las URLs concretas
usadas en cada comprobación.
