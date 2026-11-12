import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const parser=readFileSync(new URL("../supabase/functions/drive-hourly-sync/parser.ts",import.meta.url),"utf8");
const compareSource=vm.runInNewContext(
  parser.slice(parser.indexOf("export function compareSource(")).replace(/^export /,"")+"\ncompareSource"
);
const edge=readFileSync(new URL("../supabase/functions/drive-hourly-sync/index.ts",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase/migrations/20261112_080_tracking_safe_partial_receipts.sql",import.meta.url),"utf8");
const makeLine=(source_row,reference,received=false)=>({
  source_row,reference,description:reference+" material",requested_qty:1,
  observations:"",albaran:"",source_green:received,source_si:received,
  drive_line_finalized:received
});
test("26/818: tres recepciones correctas no se pierden por un pedido eliminado",()=>{
  const known=[
    {id:116,source_row:477,order_reference:"26/818"},
    {id:120,source_row:700,order_reference:"26/820"}
  ];
  const lines=[
    ...["LVSXL118","LVSXL318","LVSXL418"].map((ref,i)=>({
      ...makeLine(478+i,ref),order_id:116
    })),
    {...makeLine(701,"OTRO"),order_id:120}
  ];
  const now=[{source_row:477,order_reference:"26/818",
    lines:["LVSXL118","LVSXL318","LVSXL418"].map((ref,i)=>makeLine(478+i,ref,true))}];
  const diff=compareSource(now,known,lines);
  assert.equal(diff.requires_review,true);
  assert.equal(diff.counts.removed_orders,1);
  assert.equal(diff.counts.changed_status,3);
});
test("26/827: una referencia sustituida impide aplicar todo el libro, no las otras recepciones seguras",()=>{
  const known=[{id:936,source_row:72,order_reference:"26/827"}];
  const lines=["143072","111871","512560"].map((ref,i)=>({
    ...makeLine(73+i,ref),order_id:936
  }));
  const now=[{source_row:72,order_reference:"26/827",lines:[
    makeLine(73,"143072",true),makeLine(74,"111871",true),
    makeLine(75,"REFERENCIA-CAMBIADA",true)
  ]}];
  const diff=compareSource(now,known,lines);
  assert.equal(diff.requires_review,true);
  assert.equal(diff.counts.changed_status,2);
  assert.equal(diff.counts.changed_reference,1);
});
test("RPC parcial: exige rol técnico, ejecución en curso y coincidencia de identidad completa",()=>{
  assert.match(sql,/current_user <> 'service_role'/);
  assert.match(sql,/state = 'running'/);
  assert.match(sql,/old_order\.source_row is distinct/);
  assert.match(sql,/old_order\.order_date is distinct/);
  assert.match(sql,/old_order\.supplier is distinct/);
  assert.match(sql,/old_line\.reference is distinct/);
  assert.match(sql,/old_line\.description is distinct/);
  assert.match(sql,/old_line\.requested_qty is distinct/);
  assert.match(sql,/old_line\.drive_line_finalized then continue/);
  assert.match(sql,/source_green = true, source_si = true, drive_line_finalized = true/);
  assert.doesNotMatch(sql,/update public\.tracking_sources/);
  assert.doesNotMatch(sql,/update public\.tracking_drive_catalog/);
  assert.doesNotMatch(sql,/delete from public\./i);
  assert.match(sql,/revoke all on function public\.tracking_apply_verified_receipts/);
});
test("Worker registra recepciones parciales, pero conserva revisión y rechaza errores inesperados",()=>{
  assert.match(edge,/if\(diff\.requires_review\) \{\s*return await partialReceipts/);
  assert.match(edge,/const structural=new Set/);
  assert.match(edge,/if\(structural\.has\(code\)\)return await partialReceipts\(code\)/);
  assert.match(edge,/throw new Error\("apply_rejected_"/);
  assert.match(edge,/state==="partial"/);
  assert.match(edge,/safe_receipts_applied/);
});
