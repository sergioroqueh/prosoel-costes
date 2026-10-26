# PROSOEL-Costes — Auditoría del tercer informe de ofertas · 26/10/2026

## Entrada
`PROSOEL_Auditoria_Ofertas_Historicas(2).csv` (2.913 registros, 7 columnas; datos de usuario).

## Resultado
- 1.557 `Verificada` (SHA y nombre confirmados por la herramienta, NO revisión semántica individual).
- 1.342 `Oferta no detectada` (no equivale a pedido sin oferta).
- 5 `Revisar oferta` (24/964, 25/403, 25/454, 25/565, 25/862).
- 9 `Revisar` (ocho discrepancias de SHA con nombre coincidente y un XLSX no registrado).
- 0 SHA duplicados entre las 1.557 propuestas.
- 25/06 y 26/805 siguen presentes, con referencias `5100012` y `A 44120`.

## Hallazgo nuevo de identidad documental
- CSV: 13 filas `Pedido=26/00` (12 propuestas y 1 sin oferta detectada).
- Supabase: los 13 tienen `order_number` numérico correcto; `order_reference` literal es `26/00`. Ejemplos: ID 2716 ⇒ `order_number=175`; ID 2093 ⇒ `order_number=274`; ID 2658 ⇒ `order_number=692`.
- Auditoría SQL: entre 2.868 referencias textuales con forma básica `AA/NNN`, **46** no coinciden con `order_year` y `order_number`, incluidas **3** discrepancias de año. Son defectos preexistentes de la referencia textual en el histórico. NO se deben corregir automáticamente sin revisión documental.
- Otras etiquetas repetidas en CSV (ej.: `24/154`, `24/1144`, `25/232`) corresponden a pedidos indexados distintos; el cotejo SHA sigue identificando cada fila, pero el texto visible puede inducir a atribuir la oferta al número equivocado.

## Corrección preventiva implantada
- El recuperador consulta `order_year`, `order_number`, `order_subnumber` además de `order_reference`.
- Para referencias textuales de formato simple `AA/NNN` inconsistentes con año/número indexados, una oferta extraída no entra en la lista guardable: se lleva a `Revisar oferta`.
- La fila indica tanto la referencia literal de BD como el número indexado; ni la base de datos ni el documento de origen se modifican.
- No aplica a formatos comerciales especiales de subpedido/revisión `26/210 - 9` etc. Para ellos se conserva tratamiento previo.
- Test versionado `tests/offer_reference_identity_gate.test.mjs`; pruebas sintéticas de detección (2 inconsistentes + 1 correcto), separación de ofertas, y regresión con formatos especiales.
- Versiones de módulo actualizadas para evitar caché.
- En el **próximo escaneo de ZIP** las cifras pueden cambiar, porque se apartarán ofertas con identidad documental inconsistente. No anunciar un nuevo número de aptas sin volver a escanear.

## Supabase
Solo lectura durante esta ronda. No hay autorización para atribuir masivamente ofertas. 2.915 pedidos y 11.729 líneas permanecen intactos, con 0 ofertas y 0 registros de auditoría al último cotejo.

## Seguridad
No se altera `main`; publicación web desde `gh-pages`, sin CI de GitHub Actions propio. No se cambia SHA ni estructura del pedido. La recuperación sigue necesitando confirmación explícita de administrador.
