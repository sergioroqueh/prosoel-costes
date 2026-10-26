// Ejecutar localmente: node --test tests/project_lookup.test.mjs
// No usa npm, CI ni GitHub Actions.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/static/project_lookup.js", import.meta.url), "utf8");
const {
  labelLineKind, projectNamePattern, findMatchingProjects,
  fetchProjectOrders, fetchOriginalOrderLines, initProjectLookup,
} = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

function fakeClient(projects, orders, lines) {
  const calls = [];
  return {
    calls,
    from(table) {
      const query = {
        filters: [],
        select() { return query; },
        eq(field, value) { query.filters.push([field, value]); return query; },
        ilike(field, pattern) { calls.push({ table, field, pattern }); return query; },
        order(field, options) { calls.push({ table, field, options }); return query; },
        limit() { return Promise.resolve({ data: projects, error: null }); },
        range(first, last) {
          calls.push({ table, first, last, filters: query.filters });
          const source = table === "orders"
            ? orders.filter((x) => query.filters.some(([field, id]) => field === "project_id" && x.project_id === id))
            : lines.filter((x) => query.filters.some(([field, id]) => field === "order_id" && x.order_id === id));
          return Promise.resolve({ data: source.slice(first, last + 1), count: source.length, error: null });
        },
      };
      return query;
    },
  };
}

test("unknown se muestra como Sin clasificar sin modificar el valor real", () => {
  assert.equal(labelLineKind("unknown"), "Sin clasificar");
  assert.equal(labelLineKind("freight"), "Portes / transporte");
  assert.equal(labelLineKind("environmental_fee"), "RAEE / ecotasa");
});

test("búsqueda de obra escapa comodines SQL en ILIKE", () => {
  assert.equal(projectNamePattern("LYMA"), "%LYMA%");
  assert.equal(projectNamePattern("LY_M%"), "%LY\\_M\\%%");
});

test("obras con nombres parecidos no se fusionan", async () => {
  const client = fakeClient([{ id: 32, name: "LYMA" }, { id: 26, name: "LYMA EL LOMO" }], [], []);
  const projects = await findMatchingProjects(client, "LYMA");
  assert.deepEqual(projects.map((p) => p.id), [32, 26]);
  assert.ok(client.calls.some((x) => x.field === "name" && x.pattern === "%LYMA%"));
});

test("paginación de pedidos por project_id con orden descendente", async () => {
  const orders = Array.from({ length: 82 }, (_, i) =>
    ({ id: 100 - i, project_id: 32, order_date: "2026-10-26" }));
  orders.push({ id: 900, project_id: 26, order_date: "2026-10-26" });
  const client = fakeClient([], orders, []);
  const first = await fetchProjectOrders(client, 32, 0);
  const second = await fetchProjectOrders(client, 32, 20);
  assert.equal(first.total, 82);
  assert.equal(first.orders.length, 20);
  assert.equal(second.orders.length, 20);
  assert.equal(second.orders[0].id, 80);
  assert.ok(client.calls.some((x) => x.field === "order_date" && x.options.ascending === false));
  assert.ok(client.calls.some((x) => x.field === "id" && x.options.ascending === false));
  assert.ok(client.calls.filter((x) => x.table === "orders" && x.first === 20 && x.last === 39).length === 1);
});

test("líneas originales solo de pedido elegido y todas las páginas", async () => {
  const rows = Array.from({ length: 1203 }, (_, i) => ({ id: i, order_id: 7, line_number: i + 1 }));
  rows.push({ id: 1500, order_id: 8 });
  const client = fakeClient([], [], rows);
  const found = await fetchOriginalOrderLines(client, 7);
  assert.equal(found.length, 1203);
  assert.equal(client.calls.filter((x) => x.table === "order_lines").length, 2);
  assert.deepEqual(found.map((x) => x.order_id).filter((x) => x !== 7), []);
});

test("errores de lectura se propagan y no se confunden con cero pedidos", async () => {
  const client = { from() { return { select() { return this; }, ilike() { return this; },
    order() { return this; }, limit() { return Promise.resolve({ data: null, error: new Error("No autorizado") }); } }; } };
  await assert.rejects(findMatchingProjects(client, "LYMA"), /No autorizado/);
});

test("la búsqueda muestra inicialmente 20 y el botón Mostrar más otros 20", async () => {
  const list = { innerHTML: "", insertAdjacentHTML(_pos, html) { this.innerHTML += html; } };
  const footer = { classList: { add() {}, remove() {}, toggle() {} } };
  const moreButton = { disabled: false, handler: null, addEventListener(_name, fn) { this.handler = fn; } };
  const status = { textContent: "" };
  const results = {
    innerHTML: "", handler: null,
    replaceChildren() { this.innerHTML = ""; },
    addEventListener(_name, fn) { this.handler = fn; },
    querySelector(selector) { return selector === "[data-project-list]" ? list : null; },
  };
  globalThis.document = { getElementById(id) {
    return { orderLookupStatus: status, orderLookupResults: results,
      orderLookupFooter: footer, orderLookupMoreButton: moreButton }[id];
  } };
  const orders = Array.from({ length: 82 }, (_, i) => ({
    id: 100 - i, project_id: 32, order_reference: "26/" + (819 - i),
    source_filename: "<malicioso>.xlsx", suppliers: { name: "GRUPO RIAS" },
  }));
  const client = fakeClient([{ id: 32, name: "LYMA" }, { id: 26, name: "LYMA EL LOMO" }], orders, []);
  const escapeHtml = (v) => String(v ?? "").replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  try {
    const instance = initProjectLookup({
      client, escapeHtml, number: String, money: (x) => String(x) + " €", displayDiscount: String,
    });
    await instance.search("LYMA");
    assert.match(status.textContent, /Mostrando 20 de 82/);
    assert.equal((list.innerHTML.match(/data-project-order=/g) || []).length, 20);
    assert.ok(list.innerHTML.includes("&lt;malicioso&gt;"));
    assert.ok(!list.innerHTML.includes("<malicioso>"));
    assert.equal(client.calls.filter((c) => c.table === "order_lines").length, 0);
    await moreButton.handler();
    assert.match(status.textContent, /Mostrando 40 de 82/);
    assert.equal((list.innerHTML.match(/data-project-order=/g) || []).length, 40);
    instance.cancel();
  } finally {
    delete globalThis.document;
  }
});
