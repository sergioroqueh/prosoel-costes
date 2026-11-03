import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const html=read("app/static/index.html");
const js=read("app/static/tracking.js");
const css=read("app/static/styles.css");
const worker=read("supabase/functions/drive-hourly-sync/index.ts");
const sql=read("supabase/migrations/20261103_061_tracking_new_works_manual_queue.sql");
const cron=read("supabase/migrations/20261103_062_tracking_manual_queue_only_when_pending.sql");

test("La vista redundante Por obra desaparece, pero se conserva filtro de obra",()=>{
 assert.doesNotMatch(html,/data-tracking-view="works"/);
 assert.match(html,/data-tracking-view="queue"/);
 assert.match(html,/data-tracking-view="sources"/);
 assert.match(html,/id="trackingProject"/);
 assert.doesNotMatch(js,/viewMode==="works"/);
});
test("Filtro almacén visible, funcional con el mismo proveedor registrado",()=>{
 assert.match(html,/>Almacén \/ proveedor<select id="trackingSupplier"/);
 assert.doesNotMatch(html,/tracking-hidden-filter">Almacén/);
 assert.match(js,/if\(supplier.value && o.supplier!==supplier.value\)return false/);
 assert.match(js,/const values=\[\.\.\.new Set\(orders.map\(x=>x.supplier\)/);
});
test("Formulario de alta crea únicamente una solicitud pendiente sin importar pedidos",()=>{
 assert.match(js,/tracking_new_work_requests/);
 assert.match(js,/trackingRegisterWork/);
 assert.match(js,/pending/);
 assert.match(sql,/status text not null default 'pending'/);
 assert.doesNotMatch(sql,/insert into public\.tracking_orders/i);
 assert.doesNotMatch(sql,/update public\.tracking_drive_catalog set status='approved'/i);
 assert.match(sql,/Sergio registra altas pendientes/);
});
test("Botón manual solicita sincronización real sin exponer secretos",()=>{
 assert.match(html,/id="trackingManualRefresh"/);
 assert.match(html,/id="trackingRefresh"/);
 assert.match(js,/client\.rpc\("tracking_request_manual_refresh"/);
 assert.match(worker,/tracking_claim_manual_refresh/);
 assert.match(worker,/manual\|\|payload\.force_check===true/);
 assert.match(worker,/status:succeeded\?"done":"error"/);
 assert.match(cron,/where exists \(/);
 assert.match(cron,/vault\.decrypted_secrets/);
 assert.doesNotMatch(js,/PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON|SUPABASE_SERVICE_ROLE_KEY|cron-secret/);
});
test("Dos filas de filtros en pantallas amplias y diseño responsive",()=>{
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:820px\)/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(css,/tracking-register-work/);
});
test("Seguimiento liberado para Israel y Sergio, pero alta de obras solo Sergio",()=>{
 const app=read("app/static/app.js");
 const access=read("supabase/migrations/20261103_063_tracking_access_sergio_israel.sql");
 assert.doesNotMatch(html,/tracking-beta-tag|>BETA</);
 assert.match(app,/israel@prosoel\.es/);
 assert.match(access,/private\.can_access_tracking/);
 assert.match(js,/canManageSources\(\)/);
 assert.match(sql,/Sergio registra altas pendientes/);
 assert.doesNotMatch(html,/data-tracking-view="works"/);
});
