import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/static/purchase_ordering.js", import.meta.url), "utf8");
const { latestPricedPurchase, sortPurchasesNewestFirst } =
  await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

const pke1612 = [
  { order_date: "2026-03-03", order_id: 186, net_unit_price: 0.0392 },
  { order_date: "2026-08-31", order_id: 660, net_unit_price: 0.0452 },
  { order_date: "2026-01-20", order_id: 55, net_unit_price: 0.0392 },
  { order_date: "2026-06-15", order_id: 461, net_unit_price: 0.0452 },
];

test("PKE-1612: último neto 0,0452 € del 31/08/2026 aunque la RPC llegue desordenada", () => {
  assert.equal(latestPricedPurchase(pke1612).net_unit_price, 0.0452);
  assert.equal(latestPricedPurchase(pke1612).order_date, "2026-08-31");
  assert.deepEqual(sortPurchasesNewestFirst(pke1612).map((row) => row.order_id), [660, 461, 186, 55]);
});

test("descarta nulos, importes cero y precios no numéricos al escoger último neto", () => {
  const rows = [
    { order_date: "2026-11-01", order_id: 9, net_unit_price: 0 },
    { order_date: "2026-10-01", order_id: 8, net_unit_price: null },
    { order_date: "2026-09-01", order_id: 7, net_unit_price: "pendiente" },
    { order_date: "2026-08-31", order_id: 6, net_unit_price: "0.0452" },
  ];
  assert.equal(latestPricedPurchase(rows).order_id, 6);
  assert.equal(latestPricedPurchase(rows.slice(0, 3)), null);
});

test("desempata dos líneas del mismo día por pedido más reciente e ID de línea", () => {
  const rows = [
    { order_date: "2026-08-31", order_id: 20, order_line_id: 22, net_unit_price: 0.04 },
    { order_date: "2026-08-31", order_id: 21, order_line_id: 10, net_unit_price: 0.05 },
    { order_date: "2026-08-31", order_id: 21, order_line_id: 12, net_unit_price: 0.06 },
  ];
  assert.equal(latestPricedPurchase(rows).net_unit_price, 0.06);
});

test("sin fechas, usa ID de pedido; no altera el orden ni los precios originales", () => {
  const rows = [
    { order_date: null, order_id: 10, net_unit_price: 3 },
    { order_date: null, order_id: 20, net_unit_price: 2 },
  ];
  const snapshot = structuredClone(rows);
  assert.equal(latestPricedPurchase(rows).net_unit_price, 2);
  assert.deepEqual(rows, snapshot);
});
