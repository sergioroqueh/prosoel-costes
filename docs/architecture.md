# Arquitectura inicial

## Flujo de datos

1. El usuario selecciona o arrastra uno o varios Excel.
2. El backend calcula SHA-256 antes de importar.
3. Si el hash ya existe, el archivo se marca como duplicado y no se reimporta.
4. Se identifica la plantilla.
5. Se extraen cabecera y líneas.
6. Se valida el total calculado contra el importe declarado.
7. Se persiste el pedido y sus líneas.
8. La normalización de materiales se resuelve en una capa separada.

## Qué almacenamos

- Datos estructurados de pedido y líneas.
- Descripción original y referencia original.
- Precios tal como aparecen en el pedido.
- Nombre del archivo de origen.
- Hash SHA-256.
- Fecha y usuario de importación.
- Estado de validación.

## Qué NO almacenamos

- El fichero Excel original.
- PDFs generados desde el Excel.
- Copias binarias de documentos de pedido.

## Separación fundamental

### Histórico de compras

Es evidencia. No debe modificarse para "limpiar" descripciones o precios.

### Catálogo normalizado

Es conocimiento editable. Permite agrupar distintas referencias y descripciones bajo
un mismo material canónico sin alterar el histórico.

## Objetivo de despliegue

Aplicación web privada y multiusuario con una base PostgreSQL central. El importador
debe permanecer desacoplado de la interfaz para poder ejecutarse también por lote.
