# Estrategia de normalización de materiales

## Principio rector

La normalización debe ser conservadora.

La muestra inicial no representa todo el histórico de PROSOEL, así que las
primeras reglas se consideran **asistentes de clasificación**, no autoridad.

Durante la carga histórica masiva, ninguna familia nueva debe quedar
auto-normalizada solo porque una descripción "parezca" coincidir.

## Flujo recomendado

1. Importar el pedido sin tocar el dato original.
2. Detectar si existe una equivalencia previamente aprobada.
3. Si no existe, generar una propuesta técnica.
4. Mostrar al revisor:
   - descripción original;
   - referencia;
   - proveedor;
   - precio;
   - material canónico propuesto;
   - atributos detectados;
   - nivel de confianza;
   - motivos de la propuesta.
5. El revisor decide:
   - aprobar;
   - corregir;
   - crear un material nuevo;
   - dejar pendiente.
6. La decisión aprobada se reutiliza en futuras importaciones.

## Qué puede automatizarse con seguridad

### Asociación ya aprobada

Si una combinación proveedor + referencia ya fue revisada y aprobada, se puede
resolver automáticamente en importaciones futuras.

### Referencia inequívoca conocida

Si existe una referencia de fabricante previamente validada, también puede
reutilizarse.

### Regla técnica

Las reglas pueden extraer atributos y proponer equivalencias, pero no deben
convertirse en verdad por sí solas durante la fase inicial del proyecto.

## Separación de conceptos

### Línea histórica

Dato original de compra. Nunca se reescribe para "limpiarlo".

### Variante comercial

Forma concreta de compra: proveedor, referencia, fabricante y descripción.

### Material canónico

Identidad técnica aprobada para consolidar histórico de precios.

### Familia presupuestaria

Agrupación más amplia para construir partidas. Se definirá más adelante y no
debe confundirse con identidad técnica.

## Regla inicial H07Z1-K

La regla actual solo demuestra el mecanismo de extracción:

- designación;
- sección;
- color;
- tensión nominal;
- condición libre de halógenos.

Ejemplo de propuesta:

CABLE|H07Z1-K|1X|1,5|AZUL

Esa clave no implica aprobación automática. Sirve para agrupar candidatos y
acelerar la revisión humana.

## Política anti-sobreajuste

- No crear reglas demasiado específicas a partir de pocos ejemplos.
- No usar nombres de proveedor como señal técnica salvo para resolver una
  equivalencia previamente aprobada.
- No suponer fabricante si no está demostrado.
- No inferir atributos ausentes.
- No fusionar materiales por similitud textual.
- Mantener categoría "pendiente" cuando haya duda.


## Referencias con namespace

Una referencia numérica o alfanumérica **no es globalmente única**.

La auditoría pública ha encontrado colisiones reales. Por ejemplo, el código
`56130` aparece públicamente en Schneider Electric como un relé de fuga RH10M,
mientras que en pedidos históricos de PROSOEL aparece asociado a un
"CONMUTADOR SERIE REAL". Por tanto, no se puede resolver un material usando solo
el texto de la referencia.

La identidad comercial debe usar, por este orden:

1. fabricante + referencia de fabricante, cuando estén confirmados;
2. proveedor + referencia de proveedor, para el histórico;
3. descripción y atributos técnicos como contexto adicional.

Nunca se hará una unión automática entre dos líneas de fabricantes/proveedores
distintos solo porque compartan el mismo código corto.
