import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../app/static/lga.js",import.meta.url),"utf8");
const {calculateLga,EXAMPLE}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t, a+" != "+b);
test("JUST_2: paridad con el caso de referencia del Excel",()=>{
 const r=calculateLga(EXAMPLE);
 assert.deepEqual(r.errors,[]); near(r.simult,16.8);near(r.total,123648);near(r.ib,178.47051521189712);near(r.chosen.drop,0.4088067094054054);
 assert.equal(r.auto.section,185);assert.equal(r.chosen.iz,386);assert.equal(r.chosen.neutral,95);assert.equal(r.chosen.tube,180);assert.equal(r.ok,true);
 assert.equal(r.rows.find(x=>x.section===150).eligible,false);
});
test("Centralización parcial y fase forzada",()=>{
 const r=calculateLga({...EXAMPLE,central:"Parcial"});assert.equal(r.limit,1);assert.ok(r.auto.section<185);
 const f=calculateLga({...EXAMPLE,forced:150});assert.equal(f.chosen.section,150);assert.equal(f.ok,false);
});
test("Al 10 prohibido, tablas enterradas y k",()=>{
 const r=calculateLga({...EXAMPLE,material:"Al",mounting:"Tubo enterrado",kt:0.8});
 assert.equal(r.rows[0].base,0);assert.equal(r.rows[0].eligible,false);near(r.rows[1].iz,78*0.8);near(r.ib,178.47051521189712);
});
test("Simultaneidad, fusible, valores inválidos y ausencia de sección",()=>{
 for(const [n,coef] of [[1,1],[10,8.5],[21,15.3],[22,15.8]])near(calculateLga({...EXAMPLE,homes:n}).simult,coef);
 assert.equal(calculateLga({...EXAMPLE,night:"Sí"}).simult,24);
 assert.equal(calculateLga({...EXAMPLE,fuse:100}).auto,null);
 assert.equal(calculateLga({...EXAMPLE,length:99999}).ok,false);
 for(const bad of [{length:0},{cos:1.1},{kt:0},{homes:1.5},{services:-1},{fuse:10},{forced:11},{length:NaN}])assert.ok(calculateLga({...EXAMPLE,...bad}).errors.length);
});
test("Acceso de Sergio y borrado al cerrar sesión; integración sin DB",()=>{
 const html=readFileSync(new URL("../app/static/index.html",import.meta.url),"utf8"), app=readFileSync(new URL("../app/static/app.js",import.meta.url),"utf8");
 assert.match(html,/id="lgaTab"/);assert.match(html,/id="lgaWorkspace" class="lga-workspace hidden"/);
 assert.ok(app.includes('which === "lga" && isSergioAdmin'));
 assert.ok(app.includes("canOpen:()=>isSergioAdmin"));
 assert.ok(app.includes('if (!isSergioAdmin) lga.close()'));
 assert.ok(app.includes('lgaTab.classList.toggle("hidden", !isSergioAdmin)'));
 assert.doesNotMatch(source,/localStorage|sessionStorage|fetch\(|\.rpc\(/);
});

test("Uso habitual destacado sin duplicar entradas; ajustes de protección plegados",()=>{
 assert.match(source,/lga-priority-grid/);
 assert.match(source,/lga-quick-fields/);
 assert.match(source,/id="lgaAdvanced"/);
 assert.match(source,/lgaTechSummary/);
 assert.match(source,/lgaFuseDetail/);
 assert.match(source,/fieldsB\.filter\(\(\[key\]\)=>key==="length"\|\|key==="material"\)/);
 assert.match(source,/fieldsB\.filter\(\(\[key\]\)=>key!=="length"&&key!=="material"&&key!=="fuse"\)/);
 assert.match(source,/fieldsB\.filter\(\(\[key\]\)=>key==="fuse"\)/);
 assert.match(source,/1,6 × In ≤ 1,45 × Iz/);
 assert.match(source,/fill\(\{\.\.\.EXAMPLE,homes:0,watts:0,services:0,shops:0,garage:0,ev:0,other:0,length:""\}\)/);
 assert.match(source,/techSummary\.textContent=/);
 assert.match(source,/lga-fuse-warning/);
 const style=readFileSync(new URL("../app/static/lga.css",import.meta.url),"utf8");
 assert.match(style,/\.lga-priority-panel/);
 assert.match(style,/\.lga-advanced\[open\]/);
 const app=readFileSync(new URL("../app/static/app.js",import.meta.url),"utf8");
 const html=readFileSync(new URL("../app/static/index.html",import.meta.url),"utf8");
 assert.match(app,/\.\/lga\.js\?v=20261117-layout-v2/);
 assert.match(html,/\.\/app\.js\?v=20261117-layout-v2/);
 assert.match(html,/\.\/lga\.css\?v=20261117-layout-v2/);
});
