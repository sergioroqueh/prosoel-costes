import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const parser=readFileSync(new URL("../supabase/functions/drive-sync-preview/parser.ts",import.meta.url),"utf8");
const endpoint=readFileSync(new URL("../supabase/functions/drive-sync-preview/index.ts",import.meta.url),"utf8");
const client=readFileSync(new URL("../app/static/tracking.js",import.meta.url),"utf8");
const pure=runInNewContext(parser.replace(/^import .*;?\s*$/gm,"").replace(/^export /gm,"")+
  "\n({compareSource})",{XMLParser:class{parse(){return {}}},Set,Map});

test("No se actualiza Drive ni Supabase en la previsualización",()=>{
  assert.match(endpoint,/from\("tracking_orders"\)/);
  assert.match(endpoint,/from\("tracking_lines"\)/);
  assert.doesNotMatch(endpoint,/\.insert\(|\.upsert\(|\.update\(|\.delete\(/);
  assert.doesNotMatch(endpoint,/method:\s*"(PUT|PATCH|DELETE)"/);
});
test("Sólo Sergio, fuente previamente aprobada y credencial de backend",()=>{
  assert.match(endpoint,/compras@prosoel\.es/);
  assert.match(endpoint,/getUser\(jwt\)/);
  assert.match(endpoint,/\.eq\("status","approved"\)/);
  assert.match(endpoint,/PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON/);
  assert.doesNotMatch(client,/PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON/);
});
test("Parser exige hoja PEDIDOS, reconoce SI combinado y color de la linea",()=>{
  assert.match(parser,/sheetNames\.length!==1/);
  assert.match(parser,/mergedSi/);
  assert.match(parser,/source_green:green,source_si:lineSi,drive_line_finalized:green&&lineSi/);
  assert.match(parser,/\(\?:-\[A-Za-z0-9\]\+\)\?/);
});
test("Diff detecta cambio de estado y movimientos sin alterar IDs",()=>{
  const old=[{id:1,source_row:3,order_reference:"26/812"}];
  const prev=[{order_id:1,source_row:3,reference:"REF",description:"TAPA",requested_qty:3,observations:"",drive_line_finalized:false}];
  const next=[{order_reference:"26/812",source_row:4,lines:[{source_row:4,reference:"REF",description:"TAPA",requested_qty:3,observations:"",drive_line_finalized:true}]}];
  const d=pure.compareSource(next,old,prev);
  assert.equal(d.counts.changed_status,1);
  assert.ok(d.counts.row_moved>=1);
  assert.equal(d.requires_review,true);
});
test("BETA muestra conteos, no aplica cambios",()=>{
  assert.match(client,/drive-sync-preview/);
  assert.match(client,/No se ha aplicado ningún cambio/);
});
