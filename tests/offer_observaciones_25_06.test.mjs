// node --test tests/offer_observaciones_25_06.test.mjs
// Caso de regresión del Excel original PROSOEL 25/06 (SHA-256 cotejado).
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../app/static/offer_reference.js",import.meta.url),"utf8");
const {extractSupplierOfferReference,extractOfferFromObservations,isOfferHeaderLabel}=
  await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));

const REAL_D4="OBSERVACIONES\n\n\n\n\nPEDIDO SEGÚN OFERTA Nº  5100012\n\n\nENTREGAR PEDIDO EN DIRECCION DE OBRA ";
const sheet=(d4,manual=null)=>{
  return {get(row,col){
    if(row===4 && col==="D") return d4;
    if(row===11 && col==="A") return "REFERENCIA PEDIDO:    25/";
    if(row===11 && col==="C") return "06";
    if(row===8 && col==="A" && manual) return "Nº OFERTA";
    if(row===8 && col==="C" && manual) return manual;
    return null;
  }};
};

test("pedido original 25/06: detecta oferta 5100012 en OBSERVACIONES D4",()=>{
  const actual=extractSupplierOfferReference(sheet(REAL_D4),17);
  assert.deepEqual(actual,{reference:"5100012",sourceLabel:"OBSERVACIONES (D4)"});
});

test("acepta números reales de oferta con prefijos y ceros iniciales",()=>{
  const examples=[
    ["PEDIDO SEGUN OFERTA Nº 000123/A","000123/A"],
    ["OFERTA Nº: OF-000123/25","OF-000123/25"],
    ["Nº DE OFERTA 100-ABC/7","100-ABC/7"],
    ["Según la oferta 0000594","0000594"],
  ];
  for(const [text,offer]of examples)
    assert.equal(extractOfferFromObservations(text),offer,text);
});

test("no inventa oferta si observaciones no la documentan",()=>{
  for(const text of [
    "OBSERVACIONES\nENTREGAR MATERIAL EN DIRECCIÓN DE OBRA",
    "OBSERVACIONES\nPEDIDO POR PRECIO DE REFERENCIA",
    "OBSERVACIONES\nSIN OFERTA Nº 5100012",
    "OBSERVACIONES\nNÚMERO PEDIDO 25/06",
    "OBSERVACIONES\nOFERTA Nº 5100012 Y OFERTA Nº 5100013",
  ]) assert.equal(extractOfferFromObservations(text),null,text);
});

test("una discrepancia entre cabecera y observaciones no se resuelve automáticamente",()=>{
  assert.equal(extractSupplierOfferReference(sheet(REAL_D4,"5100013"),17),null);
  assert.equal(extractSupplierOfferReference(sheet(REAL_D4,"5100012"),17).reference,"5100012");
});

test("no busca entre las partidas ni confunde el nº pedido con el de oferta",()=>{
  assert.equal(extractSupplierOfferReference(sheet(REAL_D4),4),null);
  assert.equal(isOfferHeaderLabel("REFERENCIA PEDIDO: 25/"),false);
});
