// Ejecutar en local: node --test tests/historical_offer_backfill.test.mjs
// Pruebas sin conexión, sin GitHub Actions, sin escrituras a Supabase.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const raw=readFileSync(new URL("../app/static/historical_offer_backfill.js",import.meta.url),"utf8");
function moduleWith(zipIndex,readSupplierOfferFromXlsxBytes,crypto) {
  const stripped=raw.replace(/^import .*?;\s*$/gm,"").replace(/^export /gm,"");
  return new Function("zipIndex","readSupplierOfferFromXlsxBytes","crypto","setTimeout",
    stripped+"\nreturn { normalizedSourceName, shaHex, fetchOriginalOrderIndex, scanOriginalArchives, initHistoricalOfferBackfill };"
  )(zipIndex,readSupplierOfferFromXlsxBytes,crypto,(fn)=>fn());
}
const hash=n=>n.toString(16).padStart(2,"0").repeat(32);
const originals=[
  {id:1,order_reference:"24/1",source_filename:"Pedido 1.xlsx",source_sha256:hash(1),supplier_offer_reference:null},
  {id:2,order_reference:"24/2",source_filename:"Pedido 2.xlsx",source_sha256:hash(2),supplier_offer_reference:null},
  {id:3,order_reference:"24/3",source_filename:"Pedido 3.xlsx",source_sha256:hash(3),supplier_offer_reference:"OF-3"},
  {id:4,order_reference:"24/4",source_filename:"Pedido 4.xlsx",source_sha256:hash(4),supplier_offer_reference:null},
];
const entries=new Map([
  ["archivo/Pedido 1.xlsx",1],["archivo/Pedido 2.xlsx",2],
  ["archivo/Pedido 3.xlsx",3],["archivo/OTRO 4.xlsx",4],
  ["archivo/AJENO.xlsx",9],
]);
const zipIndex=()=>({
 names(){return [...entries.keys()]},
 async open(name){return Uint8Array.of(entries.get(name),8,7,6)}
});
const readOffer=async bytes=>bytes[0]===2?null:
  ({reference:bytes[0]===3?"OF-3":"OF-"+bytes[0],sourceLabel:"Nº OFERTA"});
const crypto={subtle:{async digest(_kind,bytes){return new Uint8Array(32).fill(bytes[0]).buffer}}};
const subject=moduleWith(zipIndex,readOffer,crypto);
const file={name:"2024.zip",size:12345,async arrayBuffer(){return new ArrayBuffer(1)}};
const makeClient=()=>({
 from(name){assert.equal(name,"orders");return{
  select(){return this},order(){return this},
  range(){return Promise.resolve({data:originals,error:null})},
 }}
});

test("SHA-256 y ruta del ZIP se normalizan sin introducir referencias",async()=>{
 const result=await subject.shaHex(Uint8Array.of(1,2,3));
 assert.equal(result,hash(1));
 assert.equal(subject.normalizedSourceName("a/b/Pedido 1.xlsx"),"pedido 1.xlsx");
});

test("construye índice Supabase por hash sin escribir datos",async()=>{
 const index=await subject.fetchOriginalOrderIndex(makeClient());
 assert.equal(index.rows.length,4);
 assert.equal(index.byHash.get(hash(1))[0].id,1);
});

test("separar oferta verificada, sin oferta, ya existente y nombres erróneos",async()=>{
 const index=await subject.fetchOriginalOrderIndex(makeClient());
 const r=await subject.scanOriginalArchives([file],index,()=>{});
 assert.equal(r.totalXlsx,5);
 assert.equal(r.offers.length,1);
 assert.equal(r.offers[0].order_id,1);
 assert.equal(r.offers[0].supplier_offer_reference,"OF-1");
 assert.equal(r.noOffer,1);
 assert.equal(r.already,1);
 assert.equal(r.unmatched,1);
 assert.ok(r.incidents.some(x=>x.reason.includes("nombre")));
});

test("no acepta ZIP no válido ni lotes mayores del límite",async()=>{
 const index=await subject.fetchOriginalOrderIndex(makeClient());
 await assert.rejects(subject.scanOriginalArchives([],index,()=>{}),/Selecciona/);
 await assert.rejects(subject.scanOriginalArchives([
   {name:"invalido.txt",size:300,arrayBuffer:async()=>new ArrayBuffer(1)}
 ],index,()=>{}),/\.zip/);
});

test("error de consulta a Supabase no se confunde con cero pedidos",async()=>{
 const bad={from(){return{select(){return this},order(){return this},
   range(){return Promise.resolve({data:null,error:new Error("Permiso denegado")})}}}};
 await assert.rejects(subject.fetchOriginalOrderIndex(bad),/Permiso denegado/);
});

test("interfaz no escribe sin aceptación explícita y envía solo metadatos seguros",async()=>{
 const els=new Map();
 const ids=["historicalOfferZips","historicalOfferScan","historicalOfferAck",
            "historicalOfferApply","historicalOfferStatus","historicalOfferPreview"];
 for(const id of ids)els.set(id,{
   value:"",checked:false,disabled:false,files:[],textContent:"",innerHTML:"",
   handlers:{},addEventListener(evt,fn){this.handlers[evt]=fn},
   replaceChildren(){this.innerHTML=""},
 });
 els.get("historicalOfferZips").files=[file];
 globalThis.document={getElementById:id=>els.get(id)};
 let writes=0;
 const client={...makeClient(),
   rpc(name,args){writes++;assert.equal(name,"apply_verified_order_offers");
     assert.deepEqual(Object.keys(args.p_items[0]).sort(),[
       "order_id","source_filename","source_sha256","supplier_offer_label","supplier_offer_reference"
     ].sort());
     return Promise.resolve({data:[{order_id:1,outcome:"updated"}],error:null});
   },
 };
 const escapeHtml=x=>String(x??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
 try{
   const widget=subject.initHistoricalOfferBackfill({client,escapeHtml,isAdmin:()=>true});
   await els.get("historicalOfferScan").handlers.click();
   assert.equal(writes,0);
   assert.equal(els.get("historicalOfferApply").disabled,true);
   assert.match(els.get("historicalOfferPreview").innerHTML,/OF-1/);
   els.get("historicalOfferAck").checked=true;
   els.get("historicalOfferAck").handlers.change();
   await els.get("historicalOfferApply").handlers.click();
   assert.equal(writes,1);
   assert.match(els.get("historicalOfferStatus").textContent,/Guardadas 1/);
   widget.reset();
 }finally{delete globalThis.document}
});
