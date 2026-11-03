import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../app/static/tracking.js",import.meta.url),"utf8");
const app=readFileSync(new URL("../app/static/app.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../app/static/index.html",import.meta.url),"utf8");

test("selector lista todo el catálogo sin depender del período",()=>{
  const section=source.split("function updateProjects() {")[1]?.split("function renderSources()")[0];
  assert.ok(section);
  assert.match(section,/catalog\.map\(c=>c\.file_id\)/);
  assert.doesNotMatch(section,/orders\.map\(o=>o\.source_id\)/);
  assert.match(section,/Todas las obras/);
});
test("obras no importadas se identifican sin afirmar que tienen pedidos",()=>{
  assert.match(source,/Pendiente de incorporar/);
  assert.match(source,/no tiene pedidos dentro de las fechas seleccionadas/);
  assert.match(source,/Todavía no genera reclamaciones/);
});
test("buscar por nombre de obra, sin perder referencia y materiales",()=>{
  assert.match(source,/\[o\.order_reference,folderName\(o\.source_id\),o\.supplier,o\.responsible/);
  assert.match(source,/o\.lines\.flatMap/);
});
test("vista existente permanece exclusiva de Sergio y nuevos activos cacheados",()=>{
  assert.match(app,/compras@prosoel\.es/);
  assert.match(html,/20261103-all-works-v1/);
  assert.match(app,/20261103-all-works-v1/);
  assert.match(source,/tracking_drive_catalog/);
});
