import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../app/static/tracking.js",import.meta.url),"utf8");
const fnSource=source.match(/const trackingOrderRefCollator[\s\S]*?(?=\nexport function initTracking\()/);
assert.ok(fnSource, "No se encontró el comparador de pedidos");
const sort=new Function(fnSource[0].replace("export function","function")+";return sortTrackingOrders;")();
const row=(ref,date,sourceRow,id)=>({
 order_reference:ref,order_date:date,source_row:sourceRow,source_id:"obra-"+id,id
});

test("misma fecha: más recientes primero usan el número de pedido y no la fila",()=>{
 const result=sort([row("26/831","2026-10-30",200,1),row("26/834","2026-10-30",1,2)],"newest");
 assert.deepEqual(result.map(x=>x.order_reference),["26/834","26/831"]);
});
test("más antiguos primero también desempata correctamente",()=>{
 const result=sort([row("26/834","2026-10-30",1,2),row("26/831","2026-10-30",200,1)],"oldest");
 assert.deepEqual(result.map(x=>x.order_reference),["26/831","26/834"]);
});
test("la fecha siempre tiene prioridad sobre el número",()=>{
 const result=sort([row("26/999","2026-10-29",1,1),row("26/9","2026-10-30",400,2)],"newest");
 assert.deepEqual(result.map(x=>x.order_reference),["26/9","26/999"]);
});
test("comparación natural: 26/10 > 26/9 y sufijos decimales",()=>{
 const src=[row("26/9","2026-10-30",100,1),row("26/10","2026-10-30",2,2),
   row("26/315.1","2026-10-30",400,3),row("26/315.2","2026-10-30",1,4)];
 assert.deepEqual(sort(src,"newest").map(x=>x.order_reference),
   ["26/315.2","26/315.1","26/10","26/9"]);
});
test("empate total: resultado estable para distintas fuentes",()=>{
 const src=[row("26/831","2026-10-30",30,2),row("26/831","2026-10-30",10,1)];
 const a=sort([...src],"newest").map(x=>x.id);
 const b=sort([...src].reverse(),"newest").map(x=>x.id);
 assert.deepEqual(a,b);
});
