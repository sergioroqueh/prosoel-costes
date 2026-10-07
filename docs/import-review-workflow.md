# Flujo de importación y revisión

## Fase 1: carga histórica

Objetivo: incorporar miles de pedidos sin introducir decisiones irreversibles.

Cada Excel pasa por:

1. validación de plantilla;
2. extracción de cabecera;
3. extracción de líneas;
4. comprobación de totales;
5. detección de duplicado por SHA-256;
6. alta de pedido;
7. alta de variantes comerciales;
8. generación opcional de propuestas de normalización;
9. revisión humana por lotes.

## Bandejas de revisión

### Pedidos con incidencias

- total no cuadra;
- fecha dudosa;
- plantilla desconocida;
- líneas sin precio;
- campos clave ausentes.

### Materiales nuevos

Variantes comerciales todavía no asociadas a material canónico.

### Propuestas de equivalencia

El sistema sugiere una asociación, pero el usuario debe aprobarla.

### Conflictos

Una referencia previamente conocida aparece con datos incompatibles con su
asociación actual.

## Importaciones futuras

Cuando el histórico esté consolidado, el flujo diario será más automático:

- variantes ya aprobadas: asociación automática;
- referencias nuevas pero claras: propuesta rápida;
- casos ambiguos: revisión manual.

La revisión humana no desaparece. Su volumen disminuye a medida que crece el
diccionario de equivalencias aprobado.
