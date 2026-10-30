import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const files=["drive-sync-preview","drive-hourly-sync"].map(fn=>
  readFileSync(new URL("../supabase/functions/"+fn+"/parser.ts",import.meta.url),"utf8")
);
test("albaranes científicos se normalizan y códigos de texto conservan ceros",()=>{
 for(const code of files){
  const extracted=code.match(/function normalizeRef\(raw\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(extracted,"normalizador disponible");
  const norm=new Function(extracted+";return normalizeRef")();
  assert.equal(norm("6.0210136E8"),"602101360");
  assert.equal(norm("1044.0"),"1044");
  assert.equal(norm("038750"),"038750");
  assert.equal(norm("042918"),"042918");
  assert.equal(norm("043439"),"043439");
 }
});
test("ambos lectores comparan albaranes y activan revisión masiva",()=>{
 for(const code of files) {
  assert.match(code,/albaran:normalizeRef\(read\(row,"J"\)\)/);
  assert.match(code,/changed_albarans/);
  assert.match(code,/counters\.changed_albarans>20/);
 }
});
