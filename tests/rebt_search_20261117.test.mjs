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
 assert.match(findBoeText(index,"SECCION")[0].snippet,/Sección del conductor/);
 assert.equal(findBoeText(index,"seccion")[0].id,"N-ITC-14");
 assert.equal(findBoeText(index,"trazado")[0].count,1);
 assert.equal(findBoeText(index,"INTENSIDAD")[0].id,"N-ITC-19");
 assert.equal(findBoeText(index,"ITC-BT-19")[0].id,"N-ITC-19");
 assert.equal(findBoeText(index,"una cadena inexistente").length,0);
});

test("Los fragmentos muestran el término original aunque se comprima la normalización",()=>{
 const before=("Tramo    de  instalación       protegida  ").repeat(100);
 const phrase="La tapa de las canales quedará siempre accesible.";
 const units=[{id:"N-ITC-21",code:"ITC-BT-21",title:"Canales"}];
 const index=createBoeIndex({blocks:{"N-ITC-21":{text:before+phrase+" Fin"}}},units);
 const hits=findBoeText(index,"la tapa de las canales quedara siempre accesible");
 assert.equal(hits.length,1);
 assert.match(hits[0].snippet,/La tapa de las canales quedará siempre accesible/);
});
