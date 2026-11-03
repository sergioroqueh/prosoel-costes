import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const src=readFileSync(new URL("../app/static/supplier_offer_references.js",import.meta.url),"utf8");
const {fetchSupplierOfferRefsMap,supplierOfferRefsHtml}=
  await import("data:text/javascript;base64,"+Buffer.from(src).toString("base64"));
const esc=v=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");

function clientFixture(legacy,multiple) {
  const calls=[];
  return {
    calls,
    from(table) {
      return {select(){
        return {in(field,ids){
          calls.push({table,ids:[...ids]});
          if(table==="orders")return Promise.resolve({data:legacy,error:null});
          return {order(){
            return Promise.resolve({data:multiple,error:null});
          }};
        }};
      }};
    },
  };
}

test("combina números antiguos y nuevos sin repetirlos",async()=>{
  const c=clientFixture(
    [{id:10,supplier_offer_reference:"O26/846"}],
    [{order_id:10,offer_reference:"O26/846"},{order_id:10,offer_reference:"O26/847"}]);
  const refs=await fetchSupplierOfferRefsMap(c,[{id:10,order_year:2026}]);
  assert.deepEqual(refs.get("10"),["O26/846","O26/847"]);
  assert.equal(c.calls.length,2);
});
test("no consulta ofertas de 2024 ni 2025",async()=>{
  const c=clientFixture([],[]);
  const refs=await fetchSupplierOfferRefsMap(c,[{id:9,order_year:2025}]);
  assert.equal(refs.size,0);
  assert.equal(c.calls.length,0);
});
test("permite altas futuras desde 2027",async()=>{
  const c=clientFixture([],[{order_id:12,offer_reference:"OF-2027/11"}]);
  const refs=await fetchSupplierOfferRefsMap(c,[{id:12,order_year:2027}]);
  assert.deepEqual(refs.get("12"),["OF-2027/11"]);
});
test("no muestra nada cuando no hay referencia",()=>{
  assert.equal(supplierOfferRefsHtml(undefined,esc),"");
  assert.equal(supplierOfferRefsHtml([],esc),"");
});
test("escapa los números recibidos",()=>{
  const html=supplierOfferRefsHtml(['<svg onload="bad">'],esc);
  assert.doesNotMatch(html,/<svg/);
  assert.match(html,/&lt;svg/);
});
