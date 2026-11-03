import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(new URL("../app/static/supplier_offer_parser.js", import.meta.url), "utf8");
const {extractOffersFromObservation,inspectOfferHeader} =
  await import("data:text/javascript;base64,"+Buffer.from(script).toString("base64"));

const samples = [
  ["PEDIDO SEGÚN OFERTA Nº O26/846 ENTREGAR PEDIDO EN DIRECCION DE OFICINA",["O26/846"]],
  ["PEDIDO SEGÚN OFERTA Nº 6103069, 6104141 ENTREGAR PEDIDO EN DIRECCION DE OBRA",["6103069","6104141"]],
  ["PEDIDO SEGÚN OFERTAS: 6309334, 6307925, 6309350 ENTREGAR",["6309334","6307925","6309350"]],
  ["PEDIDO SEGÚN OFERTAS Nº 6102924 Nº 6102920 ENTREGAR",["6102924","6102920"]],
  ["PEDIDO SEGÚN OFERTA Nº AL/734394, AL/738921 ENTREGAR",["AL/734394","AL/738921"]],
  ["PEDIDO SEGÚN OFERTA Nº A 44120 ENTREGAR",["A 44120"]],
  ["PEDIDO SEGÚN OFERTA Nº P-26/18701",["P-26/18701"]],
  ["PEDIDO SEGÚN OFERTA Nº 256OF0044",["256OF0044"]],
  ["PEDIDO SEGÚN OFERTA Nº O26/9",["O26/9"]],
  ["PEDIDO SEGÚN OFERTA Nº 6100932/6100954",["6100932","6100954"]],
  ["PEDIDO SEGÚN OFERTA Nº 6306464 rev 01, 6306482",["6306464 rev 01","6306482"]],
  ["PEDIDO SEGÚN OFERTA Nº 28/05/0173/26",["28/05/0173/26"]],
  ["PEDIDO SEGÚN OFERTA Nº 3156",["3156"]],
];
for(const [input,expected] of samples){
  test("oferta XLSX: "+input.slice(0,55),()=>{
    assert.deepEqual(extractOffersFromObservation(input).references,expected);
  });
}
test("no inventa número en observaciones sin oferta",()=>{
  assert.deepEqual(extractOffersFromObservation("OBSERVACIONES - Precio tomado de la web").references,[]);
});
test("no inventa número tras oferta sin código",()=>{
  assert.deepEqual(extractOffersFromObservation("OBSERVACIONES OFERTA Nº ENTREGAR A OBRA").references,[]);
});
test("descripción ICT2 no es número de oferta validado",()=>{
  assert.deepEqual(extractOffersFromObservation("SEGUN OFERTA ICT2 - 20 viviendas, Madrid").references,[]);
});
test("solo extrae números de ofertas para año 2026",()=>{
  const ws={get:(row,col)=>row===4&&col==="D"?"PEDIDO SEGÚN OFERTA Nº 6103069":null};
  assert.deepEqual(inspectOfferHeader(ws,2026).references,["6103069"]);
  assert.deepEqual(inspectOfferHeader(ws,2025).references,[]);
});
