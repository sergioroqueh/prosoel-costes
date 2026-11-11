import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
const html=read("app/static/index.html");
const js=read("app/static/app.js");
const moduleSource=read("app/static/unify_references.js");
const sql=read("supabase/migrations/20261111_071_self_service_reference_unification.sql");
const css=read("app/static/styles.css");

test("Módulo de unificación: JavaScript válido y conectado",()=>{
  assert.doesNotThrow(()=>new Function(moduleSource.replace("export function initUnifyReferences","function initUnifyReferences")));
  assert.match(js,/import \{ initUnifyReferences \} from ".\/unify_references\.js\?v=20261111-unify-v1"/);
  assert.match(js,/canEdit:\(\)=>isSergioAdmin/);
  assert.match(js,/id="unifyFromPrice"/);
  assert.match(js,/unifyReferences\?\.openReference\(result\.reference\)/);
});

test("Pantalla con consulta, selección, confirmación y regla futura",()=>{
  for(const id of ["unifyTool","unifySearchForm","unifyReference","unifyStatus",
      "unifyGroups","unifySelection","unifyCanonical","unifyFuture",
      "unifyNote","unifyAcknowledge","unifySave","unifySelectedCount",
      "unifySelectAll","unifyClear"]){
    assert.ok(html.includes('id="'+id+'"'),"Falta "+id);
  }
  assert.match(html,/Herramienta de Sergio/);
  assert.match(html,/mismo producto/);
  assert.match(html,/Las variantes nuevas quedan para revisión/);
  assert.match(moduleSource,/client\.rpc\("normalization_unify_lookup"/);
  assert.match(moduleSource,/client\.rpc\("normalization_unify_save"/);
  assert.match(moduleSource,/window\.confirm\(/);
  assert.match(css,/\.unify-group/);
});

test("RPC: autorización de Sergio, concurrencia y conservación de originales",()=>{
  assert.match(sql,/actor <> 'compras@prosoel\.es'/);
  assert.match(sql,/auth\.uid\(\) is null/);
  assert.match(sql,/u\.active and u\.role='admin'/);
  assert.match(sql,/old_revision is distinct from p_expected_revisions\[i\]/);
  assert.match(sql,/purchase_line_overrides/);
  assert.match(sql,/purchase_review_events/);
  assert.match(sql,/original_checksum/);
  assert.match(sql,/after_checksum is distinct from original_checksum/);
  assert.match(sql,/perform private\.reconcile_review_reference\(v_reference\)/);
});

test("Reglas futuras por pareja exacta; no se aprueban variantes parciales",()=>{
  assert.match(sql,/source_count<>grp\.selected_lines/);
  assert.match(sql,/r\.source_reference_key=ref_key and r\.source_description_key=grp\.source_key/);
  assert.match(sql,/source_description_key,target_reference/);
  assert.match(sql,/on conflict\(supplier_id,source_reference_key,source_description_key\)/);
  assert.match(sql,/if found and \(rule_existing\.target_reference<>v_reference or rule_existing\.target_description<>canonical\)/);
  assert.match(moduleSource,/p_create_rules:future\.checked/);
  assert.match(moduleSource,/future\.checked && partial/);
  assert.match(moduleSource,/mismo proveedor, código y texto original/);
});

test("Exclusión de anónimos y otros usuarios en las funciones publicadas",()=>{
  assert.match(sql,/revoke all on function public\.normalization_unify_lookup\(text\) from public,anon,authenticated/);
  assert.match(sql,/revoke all on function public\.normalization_unify_save\(text,bigint\[\],integer\[\],text,boolean,text\) from public,anon,authenticated/);
  assert.match(sql,/grant execute on function public\.normalization_unify_lookup\(text\) to authenticated/);
  assert.match(sql,/grant execute on function public\.normalization_unify_save\(text,bigint\[\],integer\[\],text,boolean,text\) to authenticated/);
});
