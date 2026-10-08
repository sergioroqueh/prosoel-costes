# PROSOEL Costes — checkpoint V16: investigación oficial priorizada

Fecha: 2026-10-08. Repositorio `sergioroqueh/prosoel-costes`. Supabase `kusbndefngttaiytcrui`.

## Objetivo
Investigar **las referencias comerciales con mayor frecuencia real de compra**, sin transformar automáticamente compras en fichas normalizadas y sin obligar a buscar miles de documentos a mano.

## Estado técnico implantado
- 18 evidencias de fuentes **oficiales AISCAN/Legrand**, asociadas individualmente a artículos comerciales (proveedor + referencia + descripción).
- 1 discrepancia documental específica: código `CR20` descrito Ø25 en 7 compras; el fabricante publica `CR20=Ø20`, `CR25=Ø25`.
- Ninguna equivalencia, descripción original, precio ni pedido se ha alterado.
- Cola priorizada `public.material_research_priority(limit)`, ordenada por pedidos reales, con familia probable, colisión de código y frecuencia.
- Tabla `public.material_research_evidence` con URL oficial, extracto, código, fabricante, coincidencia de descripción, fecha y estado `suggested / needs_review`.
- RPC de solo lectura `material_research_evidence_for_reference` para mostrar fuentes en **Normalización** con aviso rojo en referencias que no concuerdan.
- RPC `material_research_stats` para indicadores en **Importar pedido**.
- RPC de escritura `material_research_submit` reservada a `service_role`, valida dominio oficial permitiendo solo URLs HTTPS de fabricantes autorizados. Ninguna aprobación automática.
- RPC `material_research_mark_attempt` registra que no se ha encontrado una fuente, sin inventar documentación.
- Las compras nuevas siguen entrando automáticamente en `material_enrichment_queue` (V15).

## Archivos / migraciones
- `supabase/migrations/20261008_032_research_evidence_priority_queue.sql`
- `supabase/migrations/20261008_033_initial_official_manufacturer_evidence.sql`
- `supabase/migrations/20261008_034_research_documentation_visibility.sql`
- `supabase/migrations/20261008_035_research_worker_priority_permissions.sql`
- `supabase/migrations/20261008_036_research_progress_metrics.sql`
- `scripts/research_manufacturers.py` (Python estándar, sin dependencias pip).
- `tests/test_research_manufacturers.py` (pruebas aisladas sin secretos ni red).
- `.github/workflows/material-research.yml` (test en push, investigación semanal lunes 05:17 UTC, ejecución manual).
- `app/static/app.js`, `app/static/styles.css`, `app/static/index.html` (versión web V16).

## Límites y seguridad de la investigación
- Máximo **12 artículos investigados** por ejecución y como mucho 130 candidatos examinados; bloqueo de fuentes distintas a los dominios oficiales permitidos; solo HTTPS, tamaño HTML máximo 950 KB, timeout 9 s.
- Códigos originales y familias comprobados antes de buscar. No buscar un `403585` de conductos de chapa como si fuera Legrand solo porque el código coincide.
- Encontrar una página oficial y confirmar que contiene el código es distinto de confirmar todas las características de la compra. `description_match=false` resalta el problema y no aprueba la identidad.
- Configuración sin proveedor de pago: primeras familias AISCAN-CR y enlaces concretos Legrand ya conocidos.
- Búsqueda opcional en más fabricantes mediante `BRAVE_SEARCH_API_KEY` (no conectada; puede implicar coste).
- No se hace scraping de buscadores generalistas sin autorización, ni se publican automáticamente nuevas descripciones en `commercial_item_search_profiles`.
- Las nuevas evidencias quedan **propuestas** en la cola; el usuario puede revisarlas cuando quiera.

## Activación — FALTA ACCIÓN DEL USUARIO
La automatización semanal de GitHub **está configurada pero NO consulta Supabase todavía** porque no se ha añadido la credencial del servicio a los secretos de GitHub Actions.

1. Abrir el repo privado `https://github.com/sergioroqueh/prosoel-costes` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Nombre exacto: `SUPABASE_SERVICE_ROLE_KEY`. Valor: la clave de servidor para el proyecto Supabase, obtenida de **Project Settings → API Keys** (preferentemente JWT de servicio `service_role` compatible con el trabajador). No usar la clave pública y **nunca pegarla en chats ni archivos del repo**.
3. En GitHub **Actions** → **Research official material references** → **Run workflow**. Primera prueba con `dry_run=true` para revisar logs. Después repetir con `dry_run=false` o esperar el lunes siguiente.
4. La variable opcional `BRAVE_SEARCH_API_KEY` amplía el descubrimiento de páginas oficiales, pero no es necesaria para las primeras familias conocidas. No crearla hasta evaluar la cuota y el precio.

**Advertencia:** la clave de servicio de Supabase es privilegiada. Mantener el repo privado, restringir quién puede editar workflows/scripts y rotar la credencial si se expone. GitHub Actions la aporta como variable de entorno, nunca queda escrita en commits.

## Pruebas
- GitHub Actions **Research official material references #1**: tests Python completados, `success`, job de investigación no se lanzó porque era un evento `push`. La ejecución periódica sigue a la espera del secreto.
- Base: 18 registros reales de evidencia y una descripción `CR20` Ø25 incompatible.
- Consulta autenticada `material_research_evidence_for_reference('CR20')`: devuelve cinco artículos comerciales, con cuatro coincidencias y una descripción incompatible.
- RPC `material_research_submit` con JWT service-role simulado: pudo registrar una propuesta dentro de transacción `ROLLBACK`. Cuenta estándar sin permiso de ejecución.
- JavaScript y CSS validados; `index.html` referencia versión V16.
- Pendiente prueba humana del render en navegador y primera ejecución real de Github Actions con secreto.
- Cero material histórico modificado por V16; las pruebas de escritura se revirtieron.

## Fuente externa inicial
- https://www.aiscan.com/producto/cr/ confirma CR20=20 mm, CR25=25 mm.
- https://www.legrand.es/es/productos/magnetotermico-tx3-1pn-230v-16a-curva-2-modulos-403586 confirma TX³ 403586 1P+N 16 A curva C.
- https://www.legrand.es/es/productos/proteccion-modular-magnetotermica-y-diferencial enumera 403585 1P+N 10 A curva C.
- Varios artículos comerciales pueden apuntar a una misma fuente; no son equivalencias homologadas.

## Próximos pasos
1. Confirmar visualmente fuentes oficiales dentro de Normalización.
2. Configurar GitHub Actions secret y ejecutar una **ronda real pequeña**, sin publicar ninguna ficha.
3. Analizar resultados y ampliar fabricantes/familias. El sistema puede priorizar productos por frecuencia; nunca atribuir fabricantes a cables de almacén que no los identifiquen.
4. Más adelante: aprobación supervisada dentro de PROSOEL Costes, con documentación contrastada y auditoría antes de publicar nuevos nombres de ayuda.

## Cierre de despliegue y seguridad
- **GitHub Pages V16:** ejecución #110, commit `024c8ab3`, `completed / success`.
- **Tests del investigador:** workflow `Research official material references` #1, `completed / success`. Valida sintaxis funcional mediante Python `unittest`; no investiga aún por no haber clave configurada.
- **Supabase Security Advisor:** detectó RPC de prioridad `SECURITY DEFINER` ejecutable por `authenticated`. Corregido en `20261008_037_restrict_research_priority_rpc.sql`: `authenticated=false`, `anon=false`, `service_role=true` en `has_function_privilege`. Advisor sin ese aviso tras la corrección.
- Siguen avisos preexistentes: tabla privada de staging con RLS sin política (INFO, por diseño) y protección frente a contraseñas filtradas deshabilitada (WARN). Remediación contraseña: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Conteos al cierre: **18 fuentes oficiales propuestas**, **1 incompatibilidad descriptiva**, **1 nombre de ayuda previamente publicado (Pinazo)**. No se han publicado nombres ni modificado compras durante V16.
- La credencial `SUPABASE_SERVICE_ROLE_KEY` de GitHub Actions **todavía no se ha configurado**: no afirmar que el investigador semanal ya está funcionando con Supabase. Con esa acción se podrá hacer la primera prueba en modo simulación.
