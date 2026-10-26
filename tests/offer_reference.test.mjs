// node --test tests/offer_reference.test.mjs
// Sólo pruebas locales; sin GitHub Actions ni escrituras en la base de datos.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function moduleFromSource(name) {
  const src = readFileSync(new URL("../app/static/" + name, import.meta.url), "utf8");
  return import("data:text/javascript;base64," + Buffer.from(src).toString("base64"));
}
const { isOfferHeaderLabel, cleanOfferReference, extractSupplierOfferReference } =
  await moduleFromSource("offer_reference.js");
const { initOrderLookup } = await moduleFromSource("order_lookup.js");
const { initProjectLookup } = await moduleFromSource("project_lookup.js");

function sheet(label, value, targetRow = 5, column = "C") {
  return { get(row, col) {
    if (row !== targetRow) return null;
    if (col === "A") return label;
    return col === column ? value : null;
  } };
}
const escapeHtml = (s) => String(s ?? "").replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const funcs = { escapeHtml, number: String, money: x => x == null ? "—" : String(x) + " €",
  displayDiscount: String };

test("reconoce diferentes etiquetas explícitas de número de oferta", () => {
  for (const label of [
    "Nº OFERTA", "N° DE OFERTA", "NÚMERO DE OFERTA", "REF. OFERTA",
    "REFERENCIA OFERTA", "OFERTA PROVEEDOR", "OFERTA:",
  ]) assert.equal(isOfferHeaderLabel(label), true, label);
  for (const label of ["REFERENCIA PEDIDO", "PRECIO OFERTA", "IMPORTE OFERTA",
    "CONDICIONES DE OFERTA", "SIN OFERTA"]) {
    assert.equal(isOfferHeaderLabel(label), false, label);
  }
});

test("conserva referencia textual, incluidos ceros iniciales y guiones", () => {
  const found = extractSupplierOfferReference(sheet("Nº OFERTA", "0000789/B"), 12);
  assert.equal(found.reference, "0000789/B");
  assert.equal(found.sourceLabel, "Nº OFERTA");
});

test("no infiere oferta de filas de material, archivo o números del pedido", () => {
  assert.equal(extractSupplierOfferReference(sheet("Nº OFERTA", "0021", 20), 10), null);
  assert.equal(extractSupplierOfferReference(sheet("REFERENCIA PEDIDO", "26/820"), 12), null);
  assert.equal(extractSupplierOfferReference(sheet("REFERENCIA AUX OBRA", "LYMA"), 12), null);
});

test("no incluye número si el proveedor ha indicado precio de referencia o sin oferta", () => {
  for (const input of ["", null, "N/A", "—", "SIN OFERTA",
    "PRECIO DE REFERENCIA", "PENDIENTE", "0", "NO APLICA"]) {
    assert.equal(cleanOfferReference(input), null, String(input));
  }
});

function element(id) {
  return { id, value: "", innerHTML: "", textContent: "", disabled: false,
    handlers: {}, addEventListener(k, fn) { this.handlers[k] = fn; },
    replaceChildren() { this.innerHTML = ""; }, focus() {},
  };
}

test("vista directa: muestra sólo ofertas existentes y escapa HTML", async () => {
  const ids = ["orderLookupForm","orderLookupInput","orderLookupButton",
    "orderLookupStatus","orderLookupResults"];
  const nodes = new Map(ids.map(id => [id, element(id)]));
  globalThis.document = { getElementById: id => nodes.get(id) };
  const original = { id: 9, order_reference: "26/820", source_filename: "pedido.xlsx",
    supplier_offer_reference: "000075/B", suppliers: { name: "CADIELSA" },
    projects: { name: "LYMA" }, declared_total: 188.4 };
  const orders = [original];
  const line = { id: 90, order_id: 9, line_number: 1, description_original: "Placa ciega", line_kind: "unknown" };
  const db = { from(table) { return {
    select() { return this; }, eq() { return this; }, in() { return this; },
    order() { return this; },
    limit() { return Promise.resolve({ data: orders, error: null }); },
    range() { return Promise.resolve({ data: [line], error: null }); },
  }; } };
  try {
    const widget = initOrderLookup({client:db,...funcs});
    const search = async () => {
      nodes.get("orderLookupInput").value = "26/820";
      await nodes.get("orderLookupForm").handlers.submit({preventDefault(){}});
      return nodes.get("orderLookupResults").innerHTML;
    };
    assert.match(await search(), /<strong>Oferta:<\/strong> 000075\/B/);
    orders[0] = { ...original, supplier_offer_reference: null };
    assert.doesNotMatch(await search(), /order-offer-label/);
    orders[0] = { ...original, supplier_offer_reference: "<script>evil()</script>" };
    const html = await search();
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>/);
    widget.reset();
  } finally { delete globalThis.document; }
});

test("vista de obra: etiqueta opcional junto al pedido, sin perder paginación", async () => {
  const list = { innerHTML: "", insertAdjacentHTML(_p, html) { this.innerHTML += html; } };
  const status = { textContent: "" };
  const footer = { classList: { add() {}, remove() {}, toggle() {} } };
  const more = { disabled:false, addEventListener(){} };
  const results = { innerHTML:"", addEventListener() {},
    replaceChildren(){ this.innerHTML=""; },
    querySelector(sel) { return sel === "[data-project-list]" ? list : null; } };
  globalThis.document = { getElementById: id => ({
    orderLookupStatus:status,orderLookupResults:results,orderLookupFooter:footer,
    orderLookupMoreButton:more,
  })[id] };
  const order = { id: 9, project_id: 32, order_reference:"26/820",
    supplier_offer_reference:"AB-0007",source_filename:"origen.xlsx" };
  const items = [order];
  const db = { from(table) { return { select(){return this;},ilike(){return this;},
    eq(){return this;},order(){return this;},
    limit(){return Promise.resolve({data:[{id:32,name:"LYMA"}],error:null});},
    range(){return Promise.resolve({data:items,count:items.length,error:null});}
  }; } };
  try {
    const widget=initProjectLookup({client:db,...funcs});
    await widget.search("LYMA");
    assert.match(list.innerHTML, /<strong>Oferta:<\/strong> AB-0007/);
    assert.match(list.innerHTML, /26\/820/);
    items[0]={...order,supplier_offer_reference:null};
    await widget.search("LYMA");
    assert.doesNotMatch(list.innerHTML, /order-offer-label/);
    widget.cancel();
  } finally { delete globalThis.document; }
});
