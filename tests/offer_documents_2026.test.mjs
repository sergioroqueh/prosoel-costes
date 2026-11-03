import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/static/offer_documents.js", import.meta.url), "utf8");
const { offerDocumentUrl, offerLinksHtml, fetchVerifiedOfferMap } =
  await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

function fakeClient(data, error = null) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push({ table });
      return {
        select(fields) {
          calls.at(-1).fields = fields;
          return {
            eq(column, value) {
              calls.at(-1).filter = [column, value];
              return {
                async in(field, ids) {
                  calls.at(-1).ids = ids;
                  calls.at(-1).idField = field;
                  return { data, error };
                },
              };
            },
          };
        },
      };
    },
  };
}
const escapeHtml = x => String(x).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;").replaceAll(">", "&gt;");

test("solo genera URLs controladas de Drive, sin URL arbitraria", () => {
  assert.equal(offerDocumentUrl("1RRFIVQMcWdqdaVhrc4BMfUzESAYmeQbM"),
    "https://drive.google.com/file/d/1RRFIVQMcWdqdaVhrc4BMfUzESAYmeQbM/view");
  assert.equal(offerDocumentUrl("https://evil.example/p.pdf"), null);
  assert.equal(offerDocumentUrl("../../etc/passwd"), null);
});

test("escapa títulos y muestra documentos verificados con enlaces seguros", () => {
  const html = offerLinksHtml([{drive_file_id:"1234567890ABC",filename:'<script>"</script>'}],escapeHtml);
  assert.match(html,/Ver oferta PDF/);
  assert.match(html,/rel="noopener noreferrer"/);
  assert.doesNotMatch(html,/<script>/);
  assert.match(html,/&lt;script&gt;/);
});

test("ignora 2024 y 2025 y consulta una sola vez cada pedido 2026", async () => {
  const client = fakeClient([{order_id:9,drive_file_id:"1234567890ABC",filename:"Oferta real.pdf"}]);
  const result = await fetchVerifiedOfferMap(client, [
    {order_id:5,order_year:2024},
    {order_id:8,order_year:2025},
    {order_id:9,order_year:2026},
    {order_id:9,order_year:2026},
  ]);
  assert.deepEqual(client.calls[0].ids,[9]);
  assert.equal(client.calls[0].table,"order_offer_documents");
  assert.deepEqual(client.calls[0].filter,["review_status","verified"]);
  assert.equal(result.get("9").length,1);
});

test("no consulta base sin pedidos 2026", async () => {
  const client=fakeClient([]);
  const result=await fetchVerifiedOfferMap(client,[{order_id:1,order_year:2025}]);
  assert.equal(result.size,0);
  assert.equal(client.calls.length,0);
});

test("error de tabla no disponible no rompe consultas de precios", async () => {
  const client=fakeClient(null,{message:"relation does not exist"});
  const original=console.warn;
  console.warn=()=>{};
  try{
    const result=await fetchVerifiedOfferMap(client,[{order_id:10,order_year:2026}]);
    assert.equal(result.size,0);
  }finally{console.warn=original}
});
