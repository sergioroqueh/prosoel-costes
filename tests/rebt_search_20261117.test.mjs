import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const source=readFileSync(new URL("../app/static/rebt_reader.js",import.meta.url),"utf8").replace(/^export /gm,"");
const {normalizeTerm,createBoeIndex,findBoeText}=vm.runInNewContext(
 source+"\n({normalizeTerm,createBoeIndex,findBoeText})"
);
test("Búsqueda de norma sin distinguir tildes o mayúsculas",()=>{
 assert.equal(normalizeTerm(" SECCIÓN   de LGA "),"seccion de lga");
 const corpus={blocks:{
  "N-ITC-14":{text:"Sección del conductor. El trazado de la línea general de alimentación."},
  "N-ITC-19":{text:"Intensidad admisible de los conductores de protección."}
 }};
 const units=[{id:"N-ITC-14",code:"ITC-BT-14",title:"Línea general de alimentación"},
              {id:"N-ITC-19",code:"ITC-BT-19",title:"Instalaciones interiores"}];
 const index=createBoeIndex(corpus,units);
 assert.equal(findBoeText(index,"SECCION").length,1);
 assert.equal(findBoeText(index,"seccion")[0].id,"N-ITC-14");
 assert.equal(findBoeText(index,"trazado")[0].count,1);
 assert.equal(findBoeText(index,"INTENSIDAD")[0].id,"N-ITC-19");
 assert.equal(findBoeText(index,"ITC-BT-19")[0].id,"N-ITC-19");
 assert.equal(findBoeText(index,"una cadena inexistente").length,0);
});
