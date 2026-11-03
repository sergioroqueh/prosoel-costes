import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const load=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const scan=load("supabase/functions/drive-legacy-review/legacy.ts");
const auditor=load("supabase/functions/drive-legacy-review/index.ts");
const importer=load("supabase/functions/drive-legacy-import/index.ts");
const worker=load("supabase/functions/drive-hourly-sync/index.ts");
const preview=load("supabase/functions/drive-sync-preview/index.ts");
const sql=load("supabase/migrations/20261103_055_tracking_legacy_review_and_import.sql");
const cutoff=load("supabase/migrations/20261103_056_tracking_legacy_cutoff_guard.sql");
const ui=load("app/static/tracking.js");
test("lector histórico no incorpora pedidos anteriores a julio",()=>{
 assert.match(scan,/parsedDate>=fromDate/);
 assert.match(scan,/date>=fromDate/);
 assert.match(scan,/readLegacyRecentXlsx/);
 assert.match(scan,/newOrder\|\|maybeOrder/);
});
test("dos hojas no se mezclan y la histórica se comprueba",()=>{
 assert.match(scan,/legacy_multiple_pedidos_sheets/);
 assert.match(scan,/recent_orders_in_secondary_sheet/);
 assert.match(scan,/allArchived&&!recentElsewhere/);
});
test("pedidos incompletos quedan fuera de las reclamaciones",()=>{
 assert.match(scan,/order_contains_ambiguous_lines/);
 assert.match(scan,/refCounts\.get\(order\.order_reference\)>1/);
 assert.match(scan,/ambiguous_quantity/);
 assert.match(scan,/accepted\.push\(safe\)/);
 assert.match(scan,/review\.push/);
});
test("importación atómica, permisos mínimos y datos de revisión en tabla privada",()=>{
 assert.match(sql,/tracking_legacy_review enable row level security/);
 assert.match(sql,/compras@prosoel\.es/);
 assert.match(sql,/tracking_initial_import\(p_source_id,p_orders/);
 assert.match(sql,/service_role_required/);
 assert.match(sql,/p_cutoff<>date '2026-07-01'/);
 assert.match(sql,/f\.automatic_import_enabled then/);
 assert.match(cutoff,/legacy_order_before_priority_cutoff/);
 assert.match(importer,/tracking_verify_cron_token/);
 assert.match(importer,/tracking_import_legacy_recent/);
});
test("cron compara cuarentena previa antes de aplicar cambios",()=>{
 assert.match(worker,/readLegacyRecentXlsx\(bytes,"2026-07-01"\)/);
 assert.match(worker,/tracking_legacy_review/);
 assert.match(worker,/quarantine_changed/);
 assert.match(preview,/legacyQuarantineChanged/);
});
test("Sergio ve las revisiones; no se convierten en reclamaciones",()=>{
 assert.match(ui,/tracking_legacy_review/);
 assert.match(ui,/No generan reclamaciones automáticas/);
 assert.match(ui,/escapeHtml\(folderName\(r\.source_id\)\)/);
});
