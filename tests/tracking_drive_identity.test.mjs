import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const edge=readFileSync(new URL("../supabase/functions/drive-connection-check/index.ts",import.meta.url),"utf8");
const tracking=readFileSync(new URL("../app/static/tracking.js",import.meta.url),"utf8");
const doc=readFileSync(new URL("../docs/seguimiento-pedidos-google-identidad-tecnica-20261030.md",import.meta.url),"utf8");
test("verificador limitado a sesión Sergio, usuario activo y RLS",()=>{
 assert.match(edge,/await db\.auth\.getUser\(jwt\)/);
 assert.match(edge,/compras@prosoel\.es/);
 assert.match(edge,/from\("app_users"\)/);
 assert.match(edge,/profile\?\.active/);
 assert.match(edge,/from\("tracking_drive_catalog"\)/);
 assert.match(edge,/\.eq\("status", "approved"\)/);
});
test("acceso a Google estrictamente de solo lectura",()=>{
 assert.match(edge,/https:\/\/www\.googleapis\.com\/auth\/drive\.readonly/);
 assert.match(edge,/https:\/\/www\.googleapis\.com\/drive\/v3\/files\//);
 assert.doesNotMatch(edge,/https:\/\/www\.googleapis\.com\/upload\//);
 assert.doesNotMatch(edge,/method:\s*"(?:PUT|PATCH|DELETE)"/);
});
test("sin credenciales la comprobación indica pendiente, no éxito",()=>{
 assert.match(edge,/PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON/);
 assert.match(edge,/if \(!raw\).*pending_credentials/);
});
test("la interfaz no recibe ni solicita secretos",()=>{
 assert.match(tracking,/client\.functions\.invoke\("drive-connection-check"/);
 assert.match(tracking,/trackingCheckGoogle/);
 assert.doesNotMatch(tracking,/private_key|service_role|GOOGLE_SERVICE_ACCOUNT_JSON/);
});
test("guía advierte no subir las claves y no activar el cron",()=>{
 assert.match(doc,/NUNCA pegar ese JSON/);
 assert.match(doc,/automatic_sync_enabled=false/);
});
