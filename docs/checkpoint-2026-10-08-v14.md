# PROSOEL Costes — checkpoint V14 (8 octubre 2026)

## Objetivo
Tres mejoras solicitadas después de V13: (1) **Compra más reciente** por defecto, (2) explicar sin alarmismo el estado histórico frente a la identidad normalizada y (3) encontrar cables por características sin recordar referencias ni códigos comerciales. Además, una primera demostración de descripciones ampliadas y sinónimos aprobados que conservan todo el texto de origen.

## Cambios de interfaz
- Orden inicial y al limpiar filtros: `recent`. El usuario puede seguir ordenando por relevancia, pedidos o precios. Las referencias exactas conservan prioridad.
- En la lista se lee **«Compra histórica · sin ficha unificada»**. En la ficha de compra: **«Identidad técnica sin verificar»** y una explicación: el precio histórico puede ser válido y trazable aunque el producto no esté fusionado/validado dentro del catálogo.
- Pestaña «Consultar precios»: nuevo botón **Buscar cable por características**, con campos tipo (RZ1-K/H07Z1-K/RV-K/otros), conductores (1–5), sección (mm²), designación G/X y color. Búsqueda optativa: buscar por texto continúa disponible. Proveedor/año/ordenación funcionan en ambos modos. El botón de búsqueda de texto desactiva el modo guiado.
- Los resultados con **descripción ampliada validada para búsquedas** muestran dicho nombre y también la **descripción original del pedido**. Al abrirlos se visualiza la procedencia y la URL de la documentación de fabricante; siguen sin validación de equivalencia técnica.
- CSS responsivo con los colores corporativos PROSOEL.

## SQL versionado
- `20261008_027_commercial_search_profiles.sql`: tabla con `commercial_item_id` (una ficha **por artículo comercial concreto**, NO alias global por código), `descriptive_name`, sinónimos, evidencia/fuente y estado de publicación. RLS de lectura, sin escritura directa de empleados. Tabla de eventos preparada para posibles revisiones futuras.
- `20261008_028_enriched_search_function.sql`: RPC `search_costs_enriched` con campos adicionales `descriptive_name` y `descriptive_source_url`; búsqueda por descripciones originales, códigos y términos adicionales aprobados. Mantiene el nombre original en el campo `title` para que la consulta de procedencia no pierda la vinculación. La función de búsqueda V13 anterior se conserva.
- `20261008_029_structured_cable_search.sql`: RPC `search_cables_filtered` que interpreta expresiones explícitas como `5G6`, `5x6`, `1x1,5` y conductor H07Z1-K 1,5 mm², sin fusionar variantes. Ambas funciones requieren autenticación y comprobación de acceso; `anon` sin EXECUTE.

## Ejemplo técnico: PINAZO / GRUPO JARAMA
- Se ha comprobado una única compra cuyo código de almacén es `PNZ-CIT 250 IB s/Fus PLET TRAF+CONEX INT`, y su descripción original es `PNZ-CIT 250 IB s/Fus PLET TRAF+CONEX INT. (DER)+MOD 3631 PST`.
- En la base de búsqueda se ha añadido el nombre ampliado: «**Equipo de medida indirecta trifásica PNZ-CIT 250 IB sin fusibles, con pletinas para transformadores, interruptor a la derecha y módulo 3631 PST**».
- Documentación fabricante: https://pinazo.com/410531i250sfpt---302018---pnz-cit-250-ib-sfus-plet.-trafos . La familia declara equipos hasta **198 kW** y TI hasta **300 A**, con variante de interruptor a la derecha.
- **Advertencia:** la configuración exacta conjunta con módulo 3631 PST no está certificada solo por esta ficha; la denominación ampliada es útil para búsqueda, NO es consolidación de fabricantes ni homologación comercial. El texto de origen sigue intacto y se mantiene la condición de compra histórica por revisar.
- El sistema está listo para ampliarse **gradualmente**, caso a caso, cuando esté verificada la información. No se han renombrado automáticamente todos los materiales.

## Pruebas SQL realizadas
- Filtro `RZ1-K`, 5 conductores, sección 6 mm²: **10 variantes de descripción**; con G y X se separan sus grupos.
- Filtro `H07Z1-K`, 1 conductor, 1,5 mm², azul: **7 variantes de descripción**.
- Búsqueda por «equipo de medida indirecta»: muestra primero la compra PNZ-CIT asociada con su nombre ampliado y su descripción de origen.
- Búsqueda por código `PNZ-CIT 250 IB`: la referencia original sigue recuperándose.
- Permisos de búsqueda de cables `anon_execute=false`; permiso de búsqueda enriquecida `anon` revocado.
- La función antigua `search_costs_filtered` y las funciones de procedencia originales no se han sustituido destructivamente.

## Validación del frontend
- `app/static/index.html`: selector de orden por fecha marcado y controles accesibles de cable; caché `v=20261008-v14`.
- `app/static/app.js`: JS compilable y controles existentes de importación, normalización, revisión de compras y buscador presentes. El título original `row.title` se mantiene en llamadas de histórico; `row.descriptive_name` es solo presentación.
- `app/static/styles.css`: diseño responsive de filtros y nota de procedencia.
- Ningún pedido, precio unitario, fuente Excel, corrección o equivalencia ha sido modificado por esta fase.
- Pendiente prueba visual con navegador autenticado, en particular cable selector y ficha ampliada PNZ-CIT.

## Qué probar
1. Abrir https://sergioroqueh.github.io/prosoel-costes/ y pulsar Ctrl+F5.
2. En Consultar precios, confirmar **Ordenar por: Compra más reciente**.
3. Abrir **Buscar cable por características** → Tipo `RZ1-K`, Conductores `5`, Sección `6` → Buscar. Después cambiar G/X para observar los resultados separados.
4. Tipo `H07Z1-K` → 1 conductor → 1,5 mm² → Azul.
5. Volver a la búsqueda normal y escribir `equipo de medida indirecta`. Abrir PNZ-CIT y comprobar nombre ampliado + nombre original + procedencia.
6. Comprobar que una referencia exacta sigue apareciendo primero y que Normalización e Importar pedido funcionan como antes.

## Próxima etapa
- Revisar con el usuario la utilidad del selector antes de introducir más tipos de cable; no confundir nombres comerciales con certificación de prestaciones.
- Permitir gestionar nombres ampliados supervisados desde la app, con evidencia y auditoría, sin aprobación automática ni alteración de las compras originales. No añadir descripciones inferidas masivamente sin documentación.
