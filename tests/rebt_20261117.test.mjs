import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read = (p) => readFileSync(new URL("../"+p,import.meta.url),"utf8");
const code=read("app/static/rebt_lessons.js").replace("export const REBT_LESSONS =","const REBT_LESSONS =");
const lessons=vm.runInNewContext(code+"\nREBT_LESSONS;");
test("20 lecciones únicas y citadas",()=>{
 assert.equal(lessons.length,20);
 assert.equal(new Set(lessons.map(l=>l.id)).size,20);
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
