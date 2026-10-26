// Ejecutar localmente: node --test tests/order_lookup.test.mjs
// No requiere npm, CI ni GitHub Actions.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/static/order_lookup.js", import.meta.url), "utf8");
const { parseOrderReference, fetchOrdersByReference, initOrderLookup } =
  await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

function fakeClient(orders, lines, { failOn = null } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push({ table, action: "from" });
      let offset = 0;
      const query = {
        select() { return query; },
        eq(field, value) { calls.push({ table, field, value }); return query; },
        in(field, values) { calls.push({ table, field, values }); return query; },
        order() { return query; },
        limit() {
          return Promise.resolve(failOn === table
            ? { data: null, error: new Error("No autorizado") }
            : { data: orders, error: null });
        },
        range(start, end) {
          offset = start;
          calls.push({ table, action: "page", offset });
          return Promise.resolve(failOn === table
            ? { data: null, error: new Error("No autorizado") }
            : { data: lines.slice(start, end + 1), error: null });
        },
      };
      return query;
    },
  };
}

test("acepta referencia corta, larga, guion y subpedido", () => {
  assert.deepEqual(parseOrderReference(" 26 / 775 "), {
    year: 2026, orderNumber: 775, subnumber: null, label: "26/775",
  });
  assert.equal(parseOrderReference("2026/775").label, "26/775");
  assert.equal(parseOrderReference("26-775").label, "26/775");
  assert.equal(parseOrderReference("26/775.1").subnumber, "1");
});

test("rechaza entradas incompletas o potencialmente maliciosas", () => {
  for (const input of ["775", "26/0", "1999/775", "26/775<script>", "26/775/2", ""]) {
    assert.equal(parseOrderReference(input), null);
  }
});

test("filtra por año y número, y conserva duplicados sin mezclar líneas", async () => {
  const client = fakeClient(
    [{ id: 10, order_reference: "26/775", order_subnumber: null },
     { id: 11, order_reference: "26/775.1", order_subnumber: "1" }],
    [{ id: 100, order_id: 10, description_original: "A" },
     { id: 101, order_id: 11, description_original: "B" }]
  );
  const found = await fetchOrdersByReference(client, parseOrderReference("26/775"));
  assert.equal(found.length, 2);
  assert.deepEqual(found.map((x) => x.lines.map((line) => line.id)), [[100], [101]]);
  assert.ok(client.calls.some((c) => c.field === "order_year" && c.value === 2026));
  assert.ok(client.calls.some((c) => c.field === "order_number" && c.value === 775));
  assert.deepEqual(client.calls.find((c) => c.field === "order_id").values, [10, 11]);
});

test("filtra el subpedido por identidad y deja intactos los originales", async () => {
  const client = fakeClient(
    [{ id: 10, order_subnumber: null }, { id: 11, order_subnumber: "A" }],
    [{ id: 100, order_id: 11, description_original: "B" }]
  );
  const onlySub = await fetchOrdersByReference(client, parseOrderReference("26/775.A"));
  assert.equal(onlySub.length, 1);
  assert.equal(onlySub[0].id, 11);
  assert.equal(onlySub[0].lines[0].description_original, "B");
});

test("pagina todas las líneas sin truncar al llegar a 1000", async () => {
  const lines = Array.from({ length: 1203 }, (_, i) => ({
    id: i + 1, order_id: 25, line_number: i + 1,
  }));
  const client = fakeClient([{ id: 25, order_subnumber: null }], lines);
  const found = await fetchOrdersByReference(client, parseOrderReference("26/775"));
  assert.equal(found[0].lines.length, 1203);
  assert.deepEqual(client.calls.filter((c) => c.action === "page").map((c) => c.offset), [0, 1000]);
});

test("sin resultados no realiza consultas de líneas", async () => {
  const client = fakeClient([], []);
  assert.deepEqual(await fetchOrdersByReference(client, parseOrderReference("26/775")), []);
  assert.equal(client.calls.filter((c) => c.table === "order_lines").length, 0);
});

test("errores de permisos no se interpretan como pedido vacío", async () => {
  const client = fakeClient([], [], { failOn: "orders" });
  await assert.rejects(fetchOrdersByReference(client, parseOrderReference("26/775")), /No autorizado/);
});

test("renderiza HTML escapado y los datos originales sin alterar importes", async () => {
  const els = new Map();
  function element(id) {
    return {
      id, value: "", textContent: "", innerHTML: "", disabled: false,
      handlers: {},
      addEventListener(evt, fn) { this.handlers[evt] = fn; },
      replaceChildren() { this.innerHTML = ""; },
      focus() {},
    };
  }
  for (const id of ["orderLookupForm", "orderLookupInput", "orderLookupButton",
    "orderLookupStatus", "orderLookupResults"]) els.set(id, element(id));
  globalThis.document = { getElementById: (id) => els.get(id) };
  const client = fakeClient(
    [{ id: 3, order_reference: "26/775", source_filename: "<bad>.xlsx",
       suppliers: { name: "PROVEEDOR <A>" }, projects: { name: "OBRA" },
       declared_total: 153.6 }],
    [{ id: 50, order_id: 3, line_number: 1, supplier_reference: "657054",
       description_original: '<script>alert("x")</script>',
       quantity: 320, pvp: 0.48, discount_raw: "NETO",
       net_unit_price: 0.48, total_price: 153.6, line_kind: "unknown" }]
  );
  const escapeHtml = (s) => String(s ?? "").replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const lookup = initOrderLookup({
    client, escapeHtml,
    number: (n) => String(n),
    money: (n) => n == null ? "—" : String(n) + " €",
    displayDiscount: (n) => n === "NETO" ? "Neto" : String(n),
  });
  els.get("orderLookupInput").value = "26/775";
  await els.get("orderLookupForm").handlers.submit({ preventDefault() {} });
  const html = els.get("orderLookupResults").innerHTML;
  assert.ok(html.includes("657054"));
  assert.ok(html.includes("153.6 €"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("PROVEEDOR &lt;A&gt;"));
  lookup.reset();
  assert.equal(els.get("orderLookupResults").innerHTML, "");
  delete globalThis.document;
});
