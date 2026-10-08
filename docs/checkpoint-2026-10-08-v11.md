# PROSOEL Costes — checkpoint V11 (8 de octubre de 2026)

## Resumen de la fase
Se consolida una **cola de revisión por familias técnicas y alertas reales**, manteniendo el histórico original inmutable y sin fusionar ningún material. Se da prioridad a las diferencias de características, no solo a las de potencia.

## Estado comprobado
- Pedidos históricos: **2.868**; líneas: **11.546**.
- Altas web V9: **5 pedidos** (26/775–26/779).
- Candidaturas de normalización: **891** (una más que en V7, después de las cinco importaciones).
- Decisiones de normalización guardadas: **0**.
- Referencias con alertas técnicas tras depuración: **19** (inicialmente 21; se eliminaron 2 falsos positivos).
- Familias sugeridas tras la última clasificación: sin clasificar 346, mecanismos 128, aparamenta 104, cables 99, envolventes/cajas 82, tubos/canalizaciones 59, iluminación 28, telecomunicaciones 21, fijaciones 18, mixta 5, puesta a tierra 1.
- Familias **orientativas** basadas en descripciones originales; no equivalen a una identidad certificada.

## Hallazgos comprobados con datos originales

| Referencia de compra | Familia sugerida | Alerta | Evidencia observada |
|---|---|---|---|
| `CR20` | Canalizaciones | Diámetros 20 / 25 mm | Tubo Aiscan-CR, compras de ambos diámetros bajo el código CR20; 142 pedidos |
| `H07Z1K1,5AZR` | Cables | Secciones 1,5 / 2,5 / 10 mm² | Cable azul H07Z1K, descripciones incompatibles; 80 pedidos |
| `403585` | Mixta | Aparamenta / canalizaciones / envolventes | Principalmente magnetotérmico TX3 10 A, pero aparece conducto de chapa y accesorio cofret; 46 pedidos |
| `A9R60240` | Aparamenta | Intensidades 25 / 40 A | Diferenciales con descripciones distintas |
| `CLP160APMB4C` | Iluminación | 38 / 44 W | Luminaria 1.685 mm / 1.965 mm |
| `CU35` | Puesta a tierra | Sin alerta tras depurar | Cobre desnudo, una descripción incluye instrucciones de envío en bobina |
| `PX-0520-INO` | Iluminación | Sin alerta tras depurar | Potencia 6,2 W / 6.2 W: mismo valor con separador decimal distinto |

**Las alertas identifican inconsistencias de descripción, no prueban por sí solas dos productos diferentes.** Pueden deberse a errores de captura. Las aprobaciones quedan reservadas al usuario autorizado.

## Datos y lógica SQL versionados
- `20261008_013_review_family_columns.sql`: añade columnas de familia provisional, familias observadas, alertas estructuradas y fecha de actualización a `normalization_review_groups`.
- `20261008_014_review_technical_evidence.sql`: categoriza y analiza **todas las descripciones históricas** de cada código de compra; analiza potencias W, diámetros mm, secciones mm² e intensidades A. Índice de referencia normalizada; trigger recalcula metadatos cuando un nuevo pedido cambia un grupo.
- `20261008_015_review_queue_v3_and_guards.sql`: RPC de solo lectura `normalization_review_queue_v3` con filtros `p_family`, `p_alerts_only`, `p_sort`, además de búsqueda/estado/riesgo y paginación. Refuerza el trigger de decisiones para bloquear `ready_for_mapping` si hay cualquier contradicción técnica (no solo potencias).
- `20261008_016_refine_evidence_false_positives.sql`: normaliza los separadores decimales `6,2`/`6.2`, prioriza cobre desnudo como puesta a tierra, reconoce ciertos empotrables LED y recalcula alertas. 21 → 19 casos.
- Se mantienen `private.has_app_access()`, RLS y las dos cuentas autorizadas. `anon` sin permiso de ejecución del RPC V11.
- El trigger de auditoría de decisiones sigue activo y registra cada cambio humano autorizado. No se ha añadido ninguna confirmación automatizada.

## Interfaz
La pestaña Normalización permite:
- filtrar por **familia probable**: aparamenta, cables, canalizaciones, iluminación, mecanismos, telecom, envolventes, puesta a tierra, fijaciones, familias mixtas y sin clasificar;
- activar **Solo referencias con alertas técnicas detectadas**;
- ordenar por **alertas + frecuencia**, más pedidos, más proveedores o compras recientes;
- ver junto a cada tarjeta su familia provisional, número de pedidos y tipo de contradicción;
- abrir una ficha para consultar los valores técnicos distintos encontrados en compras originales y sus proveedores;
- recibir una justificación sugerida, orientativa, nunca aprobada automáticamente;
- registrar decisiones con auditoría, salvo `ready_for_mapping` cuando existan contradicciones.

La consulta anterior de precios, el buscador, la importación XLSX y el control V10 se mantienen.

## Pruebas
- SQL autenticado: **891** candidatos totales; **19** con alertas; **59** del filtro canalizaciones; `CR20` primero por prioridad; `anon` sin EXECUTE.
- SQL verificó datos concretos: `CR20` Ø20/25; H07Z1K 1.5/2.5/10; `403585` en tres familias.
- Aprobación indebida a través de la base de datos rechazada para: `CR20` (diámetro), `H07Z1K1,5AZR` (sección), `403585` (familias), `CLP160APMB4C` (potencia).
- JavaScript sintaxis PASS. Prueba de render aislada de tres fichas: alertas visibles, textos legibles, "Ver origen" disponible, opción de vincular deshabilitada.
- Supabase Security Advisor: sin avisos nuevos; siguen el INFO de staging y WARN preexistente de protección de contraseñas filtradas.
- No se ha confirmado todavía la interacción completa en navegador autenticado del usuario (incluida V10). Probarlo tras refrescar la página.

## Próxima validación manual
1. Abrir `https://sergioroqueh.github.io/prosoel-costes/`, pulsar Ctrl+F5.
2. Ir a `Normalización`. Activar `Solo referencias con alertas técnicas detectadas` — deben aparecer 19.
3. Abrir `CR20`: debe verse **Diámetros (mm): 20 / 25**, descripciones y procedencia, y la opción de "mismo producto verificado" deshabilitada.
4. Filtrar familia `Cables y conductores`, buscar `H07Z1K1,5AZR` y ver secciones **1.5 / 2.5 / 10**.
5. Seleccionar `Familias incompatibles`, buscar `403585` y comprobar las tres familias.
6. Confirmar por separado la pestaña `Importar pedido → Control de importaciones` (checkpoint V10).

## Próximos pasos prudentes
- Después de validar V11, permitir revisar **la descripción concreta o el grupo de variantes** en vez de tratar un código ambiguo como una identidad única. Debe guardar evidencia de fabricante, documentación, referencia técnica y decisión individual.
- Priorizar los 19 casos con conflictos frente a aprobaciones masivas, empezando por referencias de mayor frecuencia.
- Mejorar capturas de características (Ø, mm², W, IP, IK, polos, curva, CCT) con reglas por familia y verificaciones manuales.
- No fusionar materiales ni calcular un precio consolidado hasta aprobar identidad técnica inequívoca.

## Control de cambios
La fuente viva es Supabase; todo SQL y frontend se han guardado en el repositorio privado GitHub `sergioroqueh/prosoel-costes`. Este archivo contiene el contexto para continuar en un chat nuevo.
