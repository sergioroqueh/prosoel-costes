# Contador de pedidos

La aplicación mostrará un contador por año basado en los pedidos importados y
validados.

## Indicadores

- Último pedido registrado: por ejemplo `26/774`.
- Siguiente número esperado: por ejemplo `26/775`.
- Huecos anteriores detectados.
- Pedidos con conflicto entre nombre de fichero y referencia interna.
- Subpedidos/revisiones, que no incrementan el contador principal.

## Regla importante

El contador no se obtiene únicamente de la celda "REFERENCIA PEDIDO" del Excel.

La auditoría histórica ha demostrado que algunas plantillas fueron copiadas y
conservan referencias internas antiguas. Durante la carga inicial se comparan:

1. año del lote;
2. número del nombre del fichero;
3. referencia interna de la hoja;
4. fecha interna.

Si hay desacuerdo, el pedido se importa pero su identidad queda en estado
`conflict` hasta revisión.

## Huecos

Un hueco no significa automáticamente que falte una subida. Puede corresponder a
un número anulado, no utilizado o a una variante histórica del nombre.

Por eso la interfaz permitirá marcar cada hueco como:

- pendiente de localizar;
- anulado/no utilizado;
- resuelto por pedido importado.

## Estado inicial 2026

En el lote recibido el 7 de octubre de 2026, el mayor número principal encontrado
es `26/774`. Por tanto, una vez validada la carga, el siguiente número esperado
será `26/775`.
