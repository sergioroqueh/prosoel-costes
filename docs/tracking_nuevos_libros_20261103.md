# Seguimiento PROSOEL — Nuevas fuentes y formatos inequívocos (03/11/2026)

## Permisos y resultados confirmados
- La cuenta técnica `prosoel-pedidos-reader@prosoel-pedidos.iam.gserviceaccount.com` consta con permiso lector en COPROMA R4 Alberto Aguilera y ENGIL Izalco Boadilla.
- Auditoría estricta y posterior importación atómica: COPROMA 3 pedidos/18 líneas (1 completo); ENGIL Izalco 42 pedidos/167 líneas (36 completos). 45 pedidos/185 líneas incorporados.
- Ambas fuentes, más BAYÓN Y AZA Obras Varias (6 pedidos/35 líneas), se habilitaron tras validación. En la primera comprobación automática respondieron `unchanged`, sin cambios falsos.

## Dos formatos históricos de interpretación segura
- CUVEE 3000: números de pedido con sufijo decimal `26/315.1`; regla conservadora admite un solo sufijo de 1–3 dígitos, pero rechaza referencias sin número `24/ `.
- ENGIL MESONCILLOS: cantidades como `20 unidades` o `20 uds.`; se extrae solo la cifra sin alterar la unidad cuando es inequívoca.
- No interpretar embalajes como `2 caja (24)` ni cantidades con otras unidades no validadas.
- La auditoría sobre los dos XLSX originales pasó: CUVEE 16 pedidos/65 líneas (14 completos, 61 recibidas) y Mesoncillos 26 pedidos/67 líneas (20 completos, 55 recibidas). La importación transaccional también completó los mismos totales.
- Los cuatro lectores (auditor, importador, sincronizador y comparador) comparten las reglas, y sus funciones se despliegan con control de acceso habitual.

## Límites y decisiones de revisión
- Mantener de momento los restantes cinco ficheros de formato ambiguo en cuarentena para no generar reclamaciones falsas: CUBAS ELECNOR (sin numeración de pedido), LYMA (fecha ambigua), MORALOBO (pedido incompleto), TALLER (embalajes y cantidades mixtas), VARIOS (distintas hojas).
- Regla del usuario: cuando una línea sea inequívoca, permitir su importación; las que exijan interpretación se conservarán como información histórica para revisión, sin generar alertas ni cantidades faltantes automáticas. Pendiente implementar esa cuarentena por línea de forma auditable.
- No tocar ni reescribir ningún Excel original.
- Permisos del seguimiento restringidos a Sergio; no habilitar Israel.
