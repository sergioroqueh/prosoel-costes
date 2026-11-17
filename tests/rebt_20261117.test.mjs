import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read = (p) => readFileSync(new URL("../"+p,import.meta.url),"utf8");
const code=read("app/static/rebt_lessons.js").replace("export const REBT_LESSONS =","const REBT_LESSONS =");
const lessons=vm.runInNewContext(code+"\nREBT_LESSONS;");
test("88 lecciones únicas y citadas",()=>{
 assert.equal(lessons.length,88);
 assert.ok(new Set(lessons.map(l=>l.code)).size>=40);
 assert.equal(new Set(lessons.map(l=>l.id)).size,lessons.length);
 for(const l of lessons){
  assert.match(l.code,/^ITC-BT-\d{2}$/);
  assert.ok(l.summary&&l.application&&l.question&&l.explanation);
  assert.ok(l.options.length>=2&&l.correct>=0&&l.correct<l.options.length);
  assert.equal(new URL(l.sourceUrl).hostname,"www.boe.es");
 }
});
test("frontend integrado y progreso con RLS",()=>{
 const app=read("app/static/app.js"), html=read("app/static/index.html"), sql=read("supabase/migrations/20261117_093_rebt_sergio_progress.sql");
 assert.match(app,/const rebtView = which === "rebt" && isSergioAdmin/);
 assert.match(app,/rebtTab\.classList\.toggle\("hidden", !isSergioAdmin\)/);
 assert.match(html,/id="rebtDailyTeaser"/);assert.match(html,/id="rebtWorkspace"/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/user_id=auth\.uid\(\)/);assert.match(sql,/compras@prosoel\.es/);
});

test("Recorrido normativo: 29 artículos y 52 ITC, identificadores únicos y BOE directo",()=>{
 const manifest=read("app/static/rebt_normas.js").replace("export const REBT_COURSE =","const REBT_COURSE =").replace("export const REBT_SOURCE =","const REBT_SOURCE =");
 const items=vm.runInNewContext(manifest+"\nREBT_COURSE;");
 assert.equal(items.length,81);
 assert.equal(items.filter(x=>x.type==="art").length,29);
 assert.equal(items.filter(x=>x.type==="itc").length,52);
 assert.equal(new Set(items.map(x=>x.id)).size,81);
 assert.equal(items[0].code,"Artículo 1");
 assert.equal(items[29].code,"ITC-BT-01");
 for(const x of items){
  assert.match(x.id,/^N-(ART|ITC)-\d\d$/);
  assert.match(x.sourceUrl,/^https:\/\/www\.boe\.es\/buscar\/act\.php\?id=BOE-A-2002-18099#/);
  if(x.readMode==="synopsis") assert.ok(x.summary&&x.points.length);
  else assert.equal(x.readMode,"official");
 }
});
test("R5 mantiene los repasos de 88 aparte de las fichas normativas",()=>{
 const main=read("app/static/rebt.js"), old=read("app/static/rebt_legacy.js");
 assert.match(main,/initRebtLegacy/);
 assert.match(main,/id="rebt5Norm"/);
 assert.match(main,/N-\(ART\|ITC\)/);
 assert.match(old,/REBT_LESSONS\.filter/);
 assert.match(main,/He consultado el texto completo/);
});
