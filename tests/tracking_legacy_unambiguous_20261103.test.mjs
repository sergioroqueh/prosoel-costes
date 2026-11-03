import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const names=["drive-audit-candidates","drive-import-validated","drive-hourly-sync","drive-sync-preview"];
const get=(n)=>readFileSync(new URL("../supabase/functions/"+n+"/parser.ts",import.meta.url),"utf8");
test("todos los lectores tienen la misma regla de pedidos y unidades",()=>{
 for(const name of names){
   const code=get(name);
   assert.match(code,/\\d\{1,5\}\(\?:\\\.\\d\{1,3\}\)\?/);
   assert.match(code,/unitMatch=qtyText\.match/);
   assert.match(code,/Number\(\(unitMatch\?unitMatch\[1\]:qtyText\)\.replace/);
 }
});
test("solo se admiten sufijos numéricos y etiquetas de unidades inequívocas",()=>{
 const order=/^\d{2}\/\d{1,5}(?:\.\d{1,3})?(?:-[A-Za-z0-9]+)?$/;
 const q=/^(\d+(?:[.,]\d+)?)\s*(?:ud(?:s)?\.?|unidad(?:es)?\.?)$/i;
 assert.equal(order.test("26/315.1"),true);
 assert.equal(order.test("26/315.1.2"),false);
 assert.equal(order.test("24/ "),false);
 assert.equal(q.exec("20 unidades")?.[1],"20");
 assert.equal(q.exec("2 caja (24)"),null);
 assert.equal(q.exec("4575 m"),null);
});
