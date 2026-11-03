import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const html=read("app/static/index.html");
const css=read("app/static/styles.css");
const app=read("app/static/app.js");
const ui=read("app/static/tracking.js");
const legacy=read("supabase/functions/drive-hourly-sync/legacy.ts");
const worker=read("supabase/functions/drive-hourly-sync/index.ts");
const security=read("supabase/migrations/20261103_063_tracking_access_sergio_israel.sql");
const promotion=read("supabase/migrations/20261103_064_taller_26822_300_received.sql");

test("Sin etiquetas BETA y con cabecera naranja corporativa visible",()=>{
 assert.doesNotMatch(html,/\bBETA\b|tracking-beta-tag/);
 assert.doesNotMatch(css,/\.tracking-beta-tag\s*\{/);
 assert.match(css,/#trackingWorkspace \.tracking-hero \.search-kicker\{color:#ffac78/);
 assert.match(html,/LOGISTICA \/ CONTROL INTERNO/);
});
test("La pestaña está permitida a Sergio e Israel sin habilitar normalización",()=>{
 assert.match(app,/trackingAllowed = \["compras@prosoel\.es","israel@prosoel\.es"\]/);
 assert.match(app,/reviewTab\.classList\.toggle\("hidden", isIsraelAccount\)/);
 assert.match(app,/const reviewing = which === "review" && !isIsraelAccount/);
 assert.match(security,/private\.can_access_tracking\(\)/);
 assert.match(security,/actor_uid=\(select auth\.uid\(\)\)/);
});
test("Las altas nuevas siguen limitadas a Sergio",()=>{
 assert.match(app,/canManageSources:\(\)=>trackingAllowed&&!isIsraelAccount/);
 assert.match(ui,/canManageSources\(\)\?'<details class="tracking-register-work">/);
 assert.match(ui,/if\(!button\|\|!canManageSources\(\)\)return/);
 assert.doesNotMatch(security,/drop policy if exists "Sergio registra altas pendientes"/);
});
test("TALLER 26/822: solo 300 unidades, no multiplica las cajas",()=>{
 assert.match(legacy,/active\.order_reference==="26\/822" && n===928/);
 assert.match(legacy,/read\(n,"G"\)\.trim\(\)==="9ZG635M6BTSH"/);
 assert.match(legacy,/isTaller300\?300/);
 assert.match(promotion,/300,E'602198884/);
 assert.match(promotion,/review_status='resolved'/);
 const text="300 uds\n (2 CAJAS)";
 const exact=/^300\s+uds\.?\s*\(\s*2\s+cajas\s*\)$/i;
 assert.equal(exact.test(text.replace(/\s+/g," ")),true);
 assert.equal(exact.test("2 cajas (24)"),false);
});
test("Las revisiones resueltas no bloquean futuras sincronizaciones",()=>{
 assert.match(worker,/\.eq\("review_status","pending"\)/);
 assert.match(read("supabase/functions/drive-sync-preview/index.ts"),/\.eq\("review_status","pending"\)/);
 assert.doesNotMatch(security,/Cubas Elecnor/i);
 assert.doesNotMatch(promotion,/Cubas Elecnor/i);
});
