import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../supabase/migrations/20261030_048_tracking_md5_atomic.sql",import.meta.url),"utf8");
const cron=readFileSync(new URL("../supabase/migrations/20261030_050_tracking_hourly_cron.sql",import.meta.url),"utf8");
const vault=readFileSync(new URL("../supabase/migrations/20261030_047_tracking_cron_secret.sql",import.meta.url),"utf8");
const edge=readFileSync(new URL("../supabase/functions/drive-hourly-sync/index.ts",import.meta.url),"utf8");
const ui=readFileSync(new URL("../app/static/tracking.js",import.meta.url),"utf8");
test("scheduler limited to one approved file, settings and service_role",()=>{
  assert.match(edge,/expected_exactly_one_pilot_source/);
  assert.match(edge,/\.eq\("status","approved"\)\.eq\("automatic_import_enabled",true\)/);
  assert.match(edge,/if\(!config\.data\.automatic_sync_enabled/);
  assert.match(sql,/current_user <> 'service_role'/);
  assert.match(sql,/f\.status <> 'approved' or not f\.automatic_import_enabled/);
});
test("no automatic mutations of Drive",()=>{
  assert.match(edge,/drive\/v3\/files/);
  assert.doesNotMatch(edge,/method\s*:\s*["'](?:PATCH|PUT|DELETE)["']/);
  assert.doesNotMatch(edge,/upload\/drive/);
});
test("all snapshot writes are atomic and preserve manual decisions",()=>{
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/received_line_reopened_requires_review/);
  assert.match(sql,/source_order_removed_or_renamed/);
  assert.match(sql,/non_appended_new_order/);
  assert.match(sql,/order_completion_not_equal_to_lines/);
  assert.doesNotMatch(sql,/delete from public\.tracking_/i);
  assert.doesNotMatch(sql,/update public\.tracking_decisions/i);
});
test("secret stays in Vault; no raw key in scheduled SQL",()=>{
  assert.match(cron,/0 \* \* \* \*/);
  assert.match(cron,/vault\.decrypted_secrets/);
  assert.match(cron,/net\.http_post/);
  assert.match(vault,/gen_random_bytes\(32\)/);
  assert.match(vault,/grant execute on function public\.tracking_verify_cron_token\(text\) to service_role/);
});
test("unauthorized requests rejected and sync errors recorded",()=>{
  assert.match(edge,/x-prosoel-cron-secret/);
  assert.match(edge,/tracking_verify_cron_token/);
  assert.match(edge,/return reply\(401/);
  assert.match(edge,/return reply\(403/);
  assert.match(edge,/tracking_sync_runs/);
});
test("UI shows actual scheduled state, not false live claims",()=>{
  assert.match(ui,/syncSettings\?\.automatic_sync_enabled/);
  assert.match(ui,/tracking_sync_runs/);
  assert.match(ui,/Última ejecución/);
});
