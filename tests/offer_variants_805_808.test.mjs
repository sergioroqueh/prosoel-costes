// node --test tests/offer_variants_805_808.test.mjs
// Ejemplos de cabeceras reales de los pedidos 26/805 y 26/808.
// No subimos al repositorio archivos originales ni referencias de precios.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../app/static/offer_reference.js",import.meta.url),"utf8");
const {extractSupplierOfferReference,extractOfferFromObservations}=
  await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));

const text805="OBSERVACIONES\n\n\n\n\nPEDIDO SEGÚN OFERTA Nº A 44120\n\n\nENTREGAR PEDIDO EN DIRECCION DE OFICINA ";
const text808="OBSERVACIONES\n\n\n\n\nPEDIDO SEGÚN OFERTA Nº 256OF4966\n\n\nENTREGAR PEDIDO EN DIRECCION DE OFICINA ";
const asHeader=(d4)=>({get(r,c){return r===4&&c==="D"?d4:null;}});

test("pedido 26/805: conserva el espacio de A 44120",()=>{
 assert.deepEqual(extractSupplierOfferReference(asHeader(text805),17),
  {reference:"A 44120",sourceLabel:"OBSERVACIONES (D4)"});
});

test("pedido 26/808: reconoce alfanumérico 256OF4966",()=>{
 assert.deepEqual(extractSupplierOfferReference(asHeader(text808),17),
  {reference:"256OF4966",sourceLabel:"OBSERVACIONES (D4)"});
});

test("no anexar instrucciones al número de oferta",()=>{
 assert.equal(extractOfferFromObservations("PEDIDO SEGÚN OFERTA Nº 6102636\nENTREGAR PEDIDO"),"6102636");
});

test("sin oferta y referencias contradictorias permanecen pendientes",()=>{
 assert.equal(extractOfferFromObservations("SIN OFERTA Nº A 44120"),null);
 assert.equal(extractOfferFromObservations("OFERTA Nº A 44120 Y OFERTA Nº B 44121"),null);
});

test("no confunde la tabla de partidas con una oferta",()=>{
 assert.equal(extractSupplierOfferReference(asHeader(text805),4),null);
});
