# Supabase setup - PROSOEL Costes

Arquitectura objetivo:

- GitHub privado: código, reglas y documentación.
- GitHub Pages: interfaz estática.
- Supabase Auth: acceso de Sergio y un compañero.
- Supabase PostgreSQL: histórico, catálogo, precios y trazabilidad.
- Sin servidor FastAPI desplegado.

## 1. Bootstrap de base de datos

Ejecutar en Supabase SQL Editor:

`supabase/migrations/20261008_001_bootstrap.sql`

La migración crea:

- tablas de pedidos, líneas, proveedores, proyectos y materiales;
- índices de búsqueda aproximada;
- RLS;
- allowlist interna de usuarios;
- RPCs `search_costs`, `material_price_history` y `order_counter`.

El navegador queda en modo lectura. Las cargas históricas iniciales usan conexión
PostgreSQL directa con el importador.

## 2. Auth

Solo habrá usuarios invitados.

En Supabase Auth:

1. Desactivar nuevos registros públicos.
2. Invitar a Sergio.
3. Invitar al compañero.
4. Insertar sus correos en `public.app_users`.
5. En **URL Configuration**, usar como Site URL y Redirect URL:
   `https://sergioroqueh.github.io/prosoel-costes/`

La web usa acceso por **magic link** de Supabase, no contraseña en GitHub Pages.

Ejemplo:

```sql
insert into public.app_users(email, display_name, role)
values
  ('TU_EMAIL', 'Sergio', 'admin'),
  ('EMAIL_COMPANERO', 'Compañero', 'user')
on conflict(email) do update
set
  display_name = excluded.display_name,
  role = excluded.role,
  active = true;
```

No guardar contraseñas en GitHub.

## 3. Configuración pública del frontend

La web solo necesita:

- Project URL;
- Publishable key.

Ambos valores están diseñados para usarse en cliente. Nunca usar la secret key
ni la contraseña PostgreSQL en GitHub Pages.

## 4. Carga inicial

La carga histórica se hará con el importador Python por conexión PostgreSQL
directa.

Los XLSX/ZIP no se almacenan en Supabase ni en GitHub: solo datos estructurados,
metadatos, nombre de archivo y SHA-256.

## 5. Seguridad

- `anon`: sin acceso a tablas ni RPCs.
- `authenticated`: solo lectura y solo si el email está activo en
  `public.app_users`.
- RLS protege todas las tablas.
- Las funciones de búsqueda son `security invoker` y respetan RLS.
- La función auxiliar de allowlist es `security definer`, pero vive en el
  esquema no expuesto `private` y tiene `search_path` fijado.

## 6. Siguiente paso

Con la migración aplicada y los dos usuarios creados:

1. obtener Project URL + Publishable key;
2. conectar el frontend estático a Supabase Auth/Data API;
3. cargar los tres ZIP históricos;
4. materializar las decisiones de normalización;
5. desplegar en GitHub Pages.


## 7. GitHub Pages

El sitio está desplegado mediante `.github/workflows/pages.yml` desde
`app/static`.

URL prevista:

`https://sergioroqueh.github.io/prosoel-costes/`

La web pública solo contiene HTML/JS y la publishable key de Supabase. Los datos
de compras siguen protegidos por Auth + RLS + allowlist.

GitHub Pages es público. No se incluyen secretos, pedidos ni precios en el
repositorio desplegado.
