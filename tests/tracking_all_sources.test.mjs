import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const schema=read("supabase/migrations/20261030_052_tracking_initial_import.sql");
const cron=read("supabase/migrations/20261030_053_tracking_rotate_all_approved.sql");
const worker=read("supabase/functions/drive-hourly-sync/index.ts");
const importer=read("supabase/functions/drive-import-validated/index.ts");
const auditor=read("supabase/functions/drive-audit-candidates/index.ts");
const preview=read("supabase/functions/drive-sync-preview/index.ts");
const ui=read("app/static/tracking.js");
const app=read("app/static/app.js");
const html=read("app/static/index.html");
test("importación inicial exige source compatible, servicio y cantidades consistentes",()=>{
 assert.match(schema,/current_user<>'service_role'/);
 assert.match(schema,/f\.status<>'candidate' or f\.validation_status<>'compatible'/);
 assert.match(schema,/source_already_imported/);
 assert.match(schema,/snapshot_changed_or_inconsistent/);
 assert.match(schema,/order_closed_contradicts_materials/);
 assert.match(schema,/automatic_import_enabled=false/);
 assert.doesNotMatch(schema,/update public\.tracking_decisions/i);
});
test("auditor e importador requieren token privado y jamás escriben en Drive",()=>{
 for(const body of [auditor,importer]){
  assert.match(body,/tracking_verify_cron_token/);
  assert.match(body,/x-prosoel-cron-secret/);
  assert.doesNotMatch(body,/method:\s*["'](?:PATCH|PUT|DELETE)["']/);
 }
 assert.match(importer,/tracking_initial_import/);
 assert.match(auditor,/validation_status/);
});
test("rotación evita llamadas concurrentes y protege contra fuentes no autorizadas",()=>{
 assert.match(cron,/prosoel-tracking-rotation-every-2min/);
 assert.match(cron,/\*\/2 \* \* \* \*/);
 assert.match(cron,/vault\.decrypted_secrets/);
 assert.match(worker,/\.order\("file_id"\)/);
 assert.match(worker,/catalog\.data\[slot%catalog\.data\.length\]/);
 assert.match(worker,/\.eq\("status","approved"\)\.eq\("automatic_import_enabled",true\)/);
});
test("comparación genérica deja de fijar totales del viejo piloto",()=>{
 assert.match(preview,/baselineMatched/);
 assert.doesNotMatch(preview,/summary\.orders===118/);
 assert.match(ui,/source_id:selectedSource/);
 assert.match(ui,/validation_status/);
});
test("interfaz conserva control exclusivo Sergio y filtros históricos",()=>{
 assert.match(app,/compras@prosoel\.es/);
 assert.match(ui,/sortTrackingOrders\(visible,sort\.value\)/);
 assert.match(ui,/trackingProject/);
 assert.match(html,/data-tracking-view="works"/);
});
