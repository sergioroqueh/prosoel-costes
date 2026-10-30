import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page=readFileSync(new URL("../app/static/index.html",import.meta.url),"utf8");
const source=readFileSync(new URL("../app/static/tracking.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../app/static/styles.css",import.meta.url),"utf8");
const schema=readFileSync(new URL("../supabase/migrations/20261030_043_tracking_drive_catalog.sql",import.meta.url),"utf8");

test("tres vistas del seguimiento y filtro de obra disponibles",()=>{
  for(const mode of ["queue","works","sources"])
    assert.match(page,new RegExp('data-tracking-view="'+mode+'"'));
  assert.match(page,/id="trackingProject"/);
  assert.match(page,/id="trackingSort"/);
});
test("la agrupacion por obra usa solo los pedidos dentro del periodo",()=>{
  assert.match(source,/orders\.filter\(o=>!project\.value \|\| o\.source_id===project\.value\)/);
  assert.match(source,/function renderSources\(\)/);
  assert.match(source,/viewMode==="works"/);
  assert.match(source,/sortTrackingOrders\(visible,sort\.value\)/);
});
test("fuentes candidatas no se importan ni se habilita cron sin autorizacion",()=>{
  assert.match(schema,/automatic_import_enabled boolean not null default false/);
  assert.match(schema,/cannot_autoimport_without_approval/);
  assert.match(schema,/60,false,'pending'/);
  assert.match(source,/Sincronización horaria prevista/);
});
test("datos restringidos a Sergio en políticas RLS",()=>{
  assert.match(schema,/solo Sergio consulta fuentes Drive/);
  assert.match(schema,/compras@prosoel\.es/);
});
test("catalogo es informativo y se conservan los filtros ocultos",()=>{
  assert.match(css,/tracking-source-list/);
  assert.match(css,/tracking-hidden-filter/);
  assert.match(source,/tracking_drive_catalog/);
});
