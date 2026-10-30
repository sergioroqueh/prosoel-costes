import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const moduleSource = readFileSync(new URL("../app/static/tracking.js", import.meta.url), "utf8")
  .replace(/^export /gm, "");
const utils = runInNewContext(moduleSource +
  "\n({ interpretTrackingObservation, trackingEffectiveState, trackingLineDelivered, sortTrackingOrders })", {});
const { interpretTrackingObservation, trackingEffectiveState, trackingLineDelivered, sortTrackingOrders } = utils;

test("FINALIZADO SI de Drive anula parcialidad y reaperturas locales", () => {
  assert.equal(trackingEffectiveState({drive_finalized:true},{decision:"reopened"}),"closed_drive");
  assert.equal(trackingEffectiveState({drive_finalized:true},null),"closed_drive");
});
test("cierre manual es reversible sin mutar Drive", () => {
  assert.equal(trackingEffectiveState({drive_finalized:false},{decision:"closed"}),"closed_manual");
  assert.equal(trackingEffectiveState({drive_finalized:false},{decision:"reopened"}),"open");
  assert.equal(trackingEffectiveState({drive_finalized:false},null),"open");
});
test("cantidades anotadas son probables, no confirmaciones", () => {
  const r=interpretTrackingObservation("20 ud.",36);
  assert.equal(r.kind,"probable");
  assert.equal(r.received,20);
});
test("observaciones libres no son cantidades cuantificables", () => {
  for(const s of ["Consultar con Abel","1200 ud.\n1300 ud.","20 ud. entregar en septiembre","PENDIENTE DE OBRA"])
    assert.equal(interpretTrackingObservation(s,3000).kind,"review");
});
test("cantidad superior a solicitada se envia a revision", () => {
  assert.equal(interpretTrackingObservation("15 ud",14).kind,"review");
});
test("sin anotaciones no inventa recepcion", () => {
  assert.equal(interpretTrackingObservation("",100).received,null);
});

test("un SI de un material nunca finaliza otros materiales",()=>{
  const delivered={source_green:true,source_si:true,drive_line_finalized:true};
  const missing={source_green:false,source_si:false,drive_line_finalized:false};
  assert.equal(trackingLineDelivered(delivered),true);
  assert.equal(trackingLineDelivered(missing),false);
  assert.equal(trackingEffectiveState({drive_finalized:false},null),"open");
});
test("verde sin SI o SI sin verde no confirman entrega",()=>{
  assert.equal(trackingLineDelivered({source_green:true,source_si:false,drive_line_finalized:false}),false);
  assert.equal(trackingLineDelivered({source_green:false,source_si:true,drive_line_finalized:false}),false);
  assert.equal(trackingLineDelivered({source_green:true,source_si:true,drive_line_finalized:false}),false);
});
test("orden ascendente por defecto, descendente manual, desempate fila original",()=>{
  const items=[
    {id:3,source_row:30,order_date:"2026-10-22"},
    {id:2,source_row:20,order_date:"2026-10-13"},
    {id:1,source_row:10,order_date:"2026-10-13"}
  ];
  assert.equal(sortTrackingOrders([...items]).map(x=>x.id).join(","),"1,2,3");
  assert.equal(sortTrackingOrders([...items],"newest").map(x=>x.id).join(","),"3,2,1");
});
