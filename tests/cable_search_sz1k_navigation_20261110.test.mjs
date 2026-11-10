import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const html = read("app/static/index.html");
const js = read("app/static/app.js");
const css = read("app/static/styles.css");
const sql = read("supabase/migrations/20261110_068_sz1k_busqueda_cables.sql");

test("La búsqueda de cables solo muestra tipo, conductores y sección", () => {
  for (const id of ["cableFamily", "cableCores", "cableSection"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.doesNotMatch(html, /id="cablePE"|id="cableColor"/);
  assert.doesNotMatch(js, /getElementById\("(?:cablePE|cableColor)"\)/);
  assert.match(js, /p_pe: null/);
  assert.match(js, /p_color: null/);
  assert.match(css, /grid-template-columns: minmax\(210px,1\.35fr\) repeat\(2,minmax\(140px,1fr\)\)/);
});

test("SZ1-K se selecciona y el servidor reconoce también SZ1K", () => {
  assert.match(html, /option value="SZ1-K"/);
  assert.match(sql, /when e\.txt ~ 'SZ1\[ -\]\?K' then 'SZ1-K'/);
  assert.match(sql, /ol\.supplier_reference ~\* 'RZ1\|H07Z1\|RV\[- \]\?K\|SZ1\[ -\]\?K'/);
  assert.ok(sql.indexOf("when e.txt ~ 'SZ1") < sql.indexOf("when e.txt ~ 'RZ1"));
  assert.match(sql, /private\.has_app_access\(\)/);
  assert.match(sql, /regexp_replace\(btrim\(h\.description_original\)/);
});

test("Normalización está en Herramientas y solo para Sergio admin", () => {
  assert.match(html, /<details class="workspace-tools hidden" id="workspaceTools">/);
  assert.match(html, /id="reviewTab"/);
  const navigation = html.slice(html.indexOf('<nav class="workspace-tabs"'), html.indexOf("</nav>"));
  assert.doesNotMatch(navigation, /Normalización|reviewTab/);
  assert.match(js, /SERGIO_ACCOUNT_EMAIL = "compras@prosoel\.es"/);
  assert.match(js, /isSergioAdmin = currentUserRole === "admin"/);
  assert.match(js, /const reviewing = which === "review" && isSergioAdmin/);
  assert.match(js, /workspaceTools\.classList\.toggle\("hidden", !isSergioAdmin\)/);
  assert.match(css, /\.workspace-tools-panel/);
});
