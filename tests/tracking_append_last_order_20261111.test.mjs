import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const parser=readFileSync(new URL("../supabase/functions/drive-hourly-sync/parser.ts",import.meta.url),"utf8");
const body=parser.slice(parser.indexOf("export function compareSource(")).replace(/^export /,"");
const compareSource=vm.runInNewContext(body+"\ncompareSource");

const makeLine=(source_row,reference,received=false)=>({
  source_row,reference,description:reference+" material",requested_qty:1,
  observations:"",albaran:"",drive_line_finalized:received
});
const known=[
  {id:1,source_row:900,order_reference:"26/700"},
  {id:2,source_row:1009,order_reference:"26/842"}
];
const lines=[
  {...makeLine(900,"PREV"),order_id:1},
  ...["BGE25","A9DF3616","05-9640-05-37","315600"].map((ref,i)=>({
    ...makeLine(1009+i,ref),order_id:2
  }))
];
const snapshot=(extra,lastOrder=true)=>{
  const first={...known[0],lines:[makeLine(900,"PREV")]};
  const last={...known[1],lines:[
    makeLine(1009,"BGE25",true),
    makeLine(1010,"A9DF3616",true),
    makeLine(1011,"05-9640-05-37",true),
    makeLine(1012,"315600"),
    ...(extra?[makeLine(extra.source_row,extra.reference,true)]:[])
  ]};
  return lastOrder?[first,last]:[first,last];
};

test("26/842: añadir LPC-20-350 al final no bloquea recepciones",()=>{
  const diff=compareSource(snapshot({source_row:1013,reference:"LPC-20-350"}),known,lines);
  assert.equal(diff.requires_review,false);
  assert.equal(diff.counts.new_lines,1);
  assert.equal(diff.counts.changed_reference,0);
  assert.equal(diff.counts.changed_status,3);
});
test("No permitir reemplazar una referencia antigua",()=>{
  const rows=snapshot({source_row:1013,reference:"LPC-20-350"});
  rows[1].lines[0].reference="OTRO";
  const diff=compareSource(rows,known,lines);
  assert.equal(diff.requires_review,true);
  assert.ok(diff.counts.changed_reference>0);
});
test("No permitir introducir nuevas filas entre las existentes",()=>{
  const diff=compareSource(snapshot({source_row:1010,reference:"LPC-20-350"}),known,lines);
  assert.equal(diff.requires_review,true);
  assert.ok(diff.counts.changed_reference>0);
});
test("No permitir omitir material previamente registrado",()=>{
  const rows=snapshot(null);
  rows[1].lines.splice(1,1);
  const diff=compareSource(rows,known,lines);
  assert.equal(diff.requires_review,true);
  assert.ok(diff.counts.missing_lines>0);
});
test("No permitir ampliar pedidos anteriores al último del libro",()=>{
  const rows=snapshot(null);
  rows[0].lines.push(makeLine(1013,"ANADIDO"));
  const diff=compareSource(rows,known,lines);
  assert.equal(diff.requires_review,true);
  assert.ok(diff.counts.changed_reference>0);
});
const sql=readFileSync(new URL("../supabase/migrations/20261111_070_tracking_allow_last_order_appended_lines.sql",import.meta.url),"utf8");
test("La RPC limita inserciones a filas posteriores del último pedido y no reabre recepciones",()=>{
  assert.match(sql,/old_order.source_row<>last_existing_order_row or v_line_row<=old_max_row/);
  assert.match(sql,/seen_order_lines<>order_line_count/);
  assert.match(sql,/received_line_reopened_requires_review/);
  assert.match(sql,/current_user <> 'service_role'/);
});
