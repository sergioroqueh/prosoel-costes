// node --test tests/offer_reference_identity_gate.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../app/static/historical_offer_backfill.js",import.meta.url),"utf8")
 .replace(/^import .*?;\s*$/gm,"").replace(/^export /gm,"");
function load(zip,extract) {
 const crypto={subtle:{digest:async(_name,bytes)=>new Uint8Array(32).fill(bytes[0]).buffer}};
 return new Function("zipIndex","readSupplierOfferFromXlsxBytes","crypto","setTimeout",
  source+"\nreturn {orderReferenceDiscrepancy,scanOriginalArchives,fetchOriginalOrderIndex};"
 )(zip,extract,crypto,fn=>fn());
}
const hash=n=>n.toString(16).padStart(2,"0").repeat(32);
const filenames=["Pedido -175- prueba.xlsx","Pedido -203- prueba.xlsx","Pedido -820- prueba.xlsx"];
const rows=[
 {id:1,order_reference:"26/00",order_year:2026,order_number:175,source_filename:filenames[0],source_sha256:hash(1)},
 {id:2,order_reference:"24/154",order_year:2024,order_number:203,source_filename:filenames[1],source_sha256:hash(2)},
 {id:3,order_reference:"26/820",order_year:2026,order_number:820,source_filename:filenames[2],source_sha256:hash(3)},
];
const zip=()=>({names:()=>filenames,open:async name=>Uint8Array.of(filenames.indexOf(name)+1)});
const extractor=async bytes=>({reference:"A 44120",sourceLabel:"OBSERVACIONES (D4)"});
const client={from(){return{select(){return this},order(){return this},range(){return Promise.resolve({data:rows,error:null})}}}};
test("año y número inconsistentes se anotan, no se corrigen silenciosamente",()=>{
 const {orderReferenceDiscrepancy}=load(zip,extractor);
 assert.match(orderReferenceDiscrepancy(rows[0]),/26\/175/);
 assert.match(orderReferenceDiscrepancy(rows[1]),/24\/203/);
 assert.equal(orderReferenceDiscrepancy(rows[2]),null);
 assert.equal(orderReferenceDiscrepancy({order_reference:"26/210 - 9",order_year:2026,order_number:210}),null);
});
test("ofertas con referencia ambigua quedan separadas antes de confirmación",async()=>{
 const {fetchOriginalOrderIndex,scanOriginalArchives}=load(zip,extractor);
 const index=await fetchOriginalOrderIndex(client);
 const result=await scanOriginalArchives([{name:"2026.zip",size:100,async arrayBuffer(){return new ArrayBuffer(1)}}],index,()=>{});
 assert.equal(result.offers.length,1);
 assert.equal(result.offers[0].order_id,3);
 assert.equal(result.suspicious.length,2);
 assert.ok(result.suspicious.every(r=>r.reason.includes("Revisar la identificación")));
});
