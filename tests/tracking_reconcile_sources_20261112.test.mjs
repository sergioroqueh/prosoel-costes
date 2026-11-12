import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const parser=readFileSync(new URL('../supabase/functions/drive-hourly-sync/parser.ts',import.meta.url),'utf8');
const compareSource=vm.runInNewContext(
  parser.slice(parser.indexOf('export function compareSource(')).replace(/^export /,'')+'\ncompareSource'
);
const sql=readFileSync(new URL('../supabase/migrations/20261112_090_tracking_allow_whitespace_only_descriptions.sql',import.meta.url),'utf8');
const renumber=readFileSync(new URL('../supabase/migrations/20261112_091_tracking_reconcile_hermafer_841.sql',import.meta.url),'utf8');
function line(description,reference='123',qty=1){
 return {order_id:1,source_row:86,reference,description,requested_qty:qty,
   observations:'',albaran:'',drive_line_finalized:false};
}
const storedOrders=[{id:1,source_row:84,order_reference:'26/836'}];
const baseline=[line('Caja de conexión. De 100 x 100\n mm')];
function compare(l){
 return compareSource([{source_row:84,order_reference:'26/836',lines:[l]}],
   storedOrders,baseline);
}
test('GOMENDIO 26/836 fila 86: espacios y salto de línea no cambian la identidad',()=>{
 const diff=compare(line('Caja de conexión. De 100 x 100  mm'));
 assert.equal(diff.counts.changed_reference,0);
 assert.equal(diff.requires_review,false);
});
test('Referencia diferente sigue bloqueada',()=>{
 const diff=compare(line('Caja de conexión. De 100 x 100 mm','999'));
 assert.equal(diff.requires_review,true);
 assert.equal(diff.counts.changed_reference,1);
});
test('Descripción sustancial diferente sigue bloqueada',()=>{
 const diff=compare(line('Caja de conexión. De 150 x 100 mm'));
 assert.equal(diff.requires_review,true);
});
test('La RPC no relaja referencia ni cantidad; sólo formato de descripción',()=>{
 assert.match(sql,/old_line\.reference<>v_ref/);
 assert.match(sql,/old_line\.requested_qty is distinct from v_qty/);
 assert.match(sql,/pg_catalog\.regexp_replace\(pg_catalog\.btrim\(old_line\.description\)/);
 assert.match(sql,/pg_catalog\.regexp_replace\(pg_catalog\.btrim\(v_description\)/);
 assert.match(sql,/existing_line_identity_changed/);
 assert.match(sql,/received_line_reopened_requires_review/);
});
test('La renumeración HERMAFER preserva id y comprueba pedido y línea',()=>{
 assert.match(renumber,/id=1330/);
 assert.match(renumber,/order_reference='26\/842'/);
 assert.match(renumber,/order_reference='26\/841'/);
 assert.match(renumber,/source_row<>491/);
 assert.match(renumber,/reference='511416'/);
 assert.match(renumber,/manual_order_reference_reconciliation/);
 assert.doesNotMatch(renumber,/delete from/i);
});
