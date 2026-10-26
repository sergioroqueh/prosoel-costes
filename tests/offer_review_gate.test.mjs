// node --test tests/offer_review_gate.test.mjs
// No CI ni Supabase: ensayos unitarios sobre el lector de auditoría.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const code=readFileSync(new URL("../app/static/historical_offer_backfill.js",import.meta.url),"utf8")
 .replace(/^import .*?;\s*$/gm,"").replace(/^export /gm,"");

function withDependencies(offerByByte){
  const originalNames=["25/565.xlsx","25/862.xlsx","25/403.xlsx","25/454.xlsx","26/805.xlsx","25/791.xlsx"];
  const reader=()=>({
    names:()=>originalNames,
    open:async(name)=>Uint8Array.of(originalNames.indexOf(name)+1)
  });
  const extract=async bytes=>({reference:offerByByte[bytes[0]],sourceLabel:"OBSERVACIONES (D4)"});
  const crypt={subtle:{digest:async(_,bytes)=>new Uint8Array(32).fill(bytes[0]).buffer}};
  return new Function("zipIndex","readSupplierOfferFromXlsxBytes","crypto","setTimeout",
    code+"\nreturn {offerRequiresManualReview,fetchOriginalOrderIndex,scanOriginalArchives};"
  )(reader,extract,crypt,fn=>fn());
}

const candidate=[
  null,"25","25/","12/06/25-PROSOEL-MADNUM-LS990-SWM-JG-Rev",
  "12/06/25-PROSOEL-MADNUM-LS990-SWM-JG-Rev","A 44120","ICT2",
];

test("códigos sospechosos no se guardan automáticamente",()=>{
  const {offerRequiresManualReview}=withDependencies(candidate);
  for(const code of [...candidate.slice(1,5),"24-000641_Rev."])
    assert.ok(offerRequiresManualReview(code),code);
});

test("formatos legítimos históricos permanecen permitidos",()=>{
  const {offerRequiresManualReview}=withDependencies(candidate);
  for(const code of ["A 44120","ICT2","256OF4966","5100012",
    "OF-000123/A","O24/1017","0000123","PR 5492"])
    assert.equal(offerRequiresManualReview(code),null,code);
});

test("escaneo excluye cuatro casos dudosos y propone dos",async()=>{
  const subject=withDependencies(candidate);
  const names=["25/565.xlsx","25/862.xlsx","25/403.xlsx","25/454.xlsx","26/805.xlsx","25/791.xlsx"];
  const orders=names.map((source_filename,i)=>({
    id:i+1,order_reference:i<4?"25/"+(565+i):"26/"+(800+i),
    source_filename,source_sha256:(i+1).toString(16).padStart(2,"0").repeat(32),
    supplier_offer_reference:null,
  }));
  const client={from(){return {select(){return this},order(){return this},
    range(){return Promise.resolve({data:orders,error:null})}}}};
  const index=await subject.fetchOriginalOrderIndex(client);
  const result=await subject.scanOriginalArchives([
    {name:"2025.zip",size:120,async arrayBuffer(){return new ArrayBuffer(4)}}
  ],index,()=>{});
  assert.equal(result.suspicious.length,4);
  assert.equal(result.offers.length,2);
  assert.equal(result.incidents.length,0);
  assert.deepEqual(result.offers.map(x=>x.supplier_offer_reference),["A 44120","ICT2"]);
  for(const issue of result.suspicious){
    assert.ok(issue.source_sha256);
    assert.ok(issue.order_reference);
    assert.ok(issue.reason);
  }
});
