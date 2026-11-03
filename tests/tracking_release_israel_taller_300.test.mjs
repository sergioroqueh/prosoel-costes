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
const ignacio=read("supabase/migrations/20261103_065_tracking_access_ignacio.sql");
const promotion=read("supabase/migrations/20261103_064_taller_26822_300_received.sql");

test("Sin etiquetas BETA y con cabecera naranja corporativa visible",()=>{
 assert.doesNotMatch(html,/\bBETA\b|tracking-beta-tag/);
 assert.doesNotMatch(css,/\.tracking-beta-tag\s*\{/);
 assert.match(css,/#trackingWorkspace \.tracking-hero \.search-kicker\{color:#ffac78/);
 assert.match(html,/LOGISTICA \/ CONTROL INTERNO/);
});
test("Sergio, Israel e Ignacio tienen acceso sin habilitar normalización a operativos",()=>{
 assert.match(app,/const LIMITED_ACCOUNT_EMAILS = new Set\(\["israel@prosoel\.es", "ivivanco@prosoel\.es"\]\)/);
 assert.match(app,/const TRACKING_ACCOUNT_EMAILS = new Set/);
 assert.match(app,/trackingAllowed = TRACKING_ACCOUNT_EMAILS\.has/);
 assert.match(app,/reviewTab\.classList\.toggle\("hidden", isLimitedAccount\)/);
 assert.match(app,/const reviewing = which === "review" && !isLimitedAccount/);
 assert.match(security,/private\.can_access_tracking\(\)/);
 assert.match(security,/actor_uid=\(select auth\.uid\(\)\)/);
 assert.match(ignacio,/values \('ivivanco@prosoel\.es','Ignacio','user',true\)/);
 assert.match(ignacio,/'compras@prosoel\.es','israel@prosoel\.es','ivivanco@prosoel\.es'/);
});
test("Las altas nuevas siguen limitadas a Sergio",()=>{
 assert.match(app,/canManageSources:\(\)=>trackingAllowed&&currentUserRole==="admin"/);
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
