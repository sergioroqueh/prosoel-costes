import { createClient } from "npm:@supabase/supabase-js@2";
import { readPedidosXlsx, compareSource } from "./parser.ts";

// Backend-only hourly worker. The entrypoint is public at network level but ALWAYS
// validates the cryptographically random cron credential held in Supabase Vault.
// No code path accepts a browser/user token or modifies the original Google file.
const allowedOrigin = "https://sergioroqueh.github.io";
const cors = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};
function reply(status, state, message, extra = {}) {
  return new Response(JSON.stringify({ state, message, ...extra }), { status, headers: cors });
}
function encodeBase64Url(bytes) {
  let binary = "";
  for (const item of bytes) binary += String.fromCharCode(item);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
function utf8(value) { return new TextEncoder().encode(value); }
async function getGoogleToken(account) {
  if (!account || account.type !== "service_account" ||
      !String(account.client_email || "").endsWith(".gserviceaccount.com") ||
      typeof account.private_key !== "string" ||
      account.token_uri !== "https://oauth2.googleapis.com/token") {
    throw new Error("invalid_service_account_configuration");
  }
  const pem = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const key = await crypto.subtle.importKey("pkcs8",
    Uint8Array.from(atob(pem), c => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const input = encodeBase64Url(utf8(JSON.stringify({ alg: "RS256", typ: "JWT" }))) + "." +
    encodeBase64Url(utf8(JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: account.token_uri,
      iat: now - 30,
      exp: now + 3000,
    })));
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, utf8(input)));
  const assertion = input + "." + encodeBase64Url(signature);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("google_token_rejected_" + response.status);
  const result = await response.json();
  if (!result.access_token || result.token_type?.toLowerCase() !== "bearer")
    throw new Error("google_token_invalid");
  return result.access_token;
}


async function readPaged(build,limit=20000) {
 const acc=[];
 for(let offset=0;offset<limit;offset+=750){
   const {data,error}=await build(offset,offset+749);
   if(error)throw new Error("database_read_failed");
   const part=data||[];
   acc.push(...part);
   if(part.length<750)return acc;
 }
 throw new Error("oversized_source");
}
async function runOnce(db) {
 const config=await db.from("tracking_sync_settings")
   .select("requested_interval_minutes,automatic_sync_enabled,auth_setup").eq("id",1).single();
 if(config.error)throw new Error("sync_settings_unreadable");
 if(!config.data.automatic_sync_enabled||config.data.auth_setup!=="validated")
   return {state:"disabled",message:"La sincronización automática no está habilitada."};
 const catalog=await db.from("tracking_drive_catalog")
   .select("file_id,source_title,status,automatic_import_enabled,last_imported_modified_at,last_imported_md5")
   .eq("status","approved").eq("automatic_import_enabled",true).limit(2);
 if(catalog.error)throw new Error("catalog_unreadable");
 if((catalog.data||[]).length!==1)throw new Error("expected_exactly_one_pilot_source");
 const source=catalog.data[0];
 // Test only this existing pilot: further sources require separate validation and deployment.
 const baseline=await db.from("tracking_sources").select("id").eq("id",source.file_id).maybeSingle();
 if(baseline.error||!baseline.data)throw new Error("source_not_previously_imported");
 const log=await db.from("tracking_sync_runs").insert({
   state:"running",source_id:source.file_id,scanned_files:1,
   message:"Comprobando cambios de la fuente piloto desde Google Drive"
 }).select("id").single();
 if(log.error||!log.data?.id)throw new Error("cannot_open_sync_log");
 const runId=log.data.id;
 async function complete(state,message,summary={},counters={}) {
   const updates={state,message,finished_at:new Date().toISOString(),
      change_summary:{...summary,counts:counters},
      updated_files:state==="success"&&Object.values(counters).some(v=>Number(v)>0)?1:0,
      unchanged_files:state==="skipped"||state==="success"&&Object.values(counters).every(v=>Number(v)===0)?1:0,
      rejected_files:state==="partial"||state==="error"?1:0};
   await db.from("tracking_sync_runs").update(updates).eq("id",runId);
   if(state==="partial"||state==="error")await db.from("tracking_drive_catalog")
       .update({import_error:message}).eq("file_id",source.file_id);
 }
 try{
   const secret=Deno.env.get("PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON");
   if(!secret)throw new Error("google_service_credential_missing");
   let token;
   try{token=await getGoogleToken(JSON.parse(secret));}
   catch{throw new Error("google_token_failed");}
   const url="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(source.file_id);
   const headers={Authorization:"Bearer "+token};
   const metaResp=await fetch(url+"?fields=id,name,mimeType,modifiedTime,size,md5Checksum,capabilities(canDownload)",
     {headers,signal:AbortSignal.timeout(16000)});
   if(!metaResp.ok)throw new Error("google_metadata_rejected_"+metaResp.status);
   const meta=await metaResp.json();
   if(meta.id!==source.file_id || meta.mimeType!=="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      || meta.capabilities?.canDownload===false)throw new Error("drive_source_not_downloadable");
   if(!meta.modifiedTime||Number(meta.size)>12000000)throw new Error("file_metadata_invalid");
   const prior=source.last_imported_modified_at && new Date(source.last_imported_modified_at).getTime()===new Date(meta.modifiedTime).getTime();
   const md5Matches=!meta.md5Checksum || !source.last_imported_md5 ||
      meta.md5Checksum.toLowerCase()===source.last_imported_md5.toLowerCase();
   if(prior&&md5Matches){
     await complete("skipped","Sin cambios en Google Drive.");
     return {state:"unchanged",source:source.source_title};
   }
   const result=await fetch(url+"?alt=media",{headers,signal:AbortSignal.timeout(25000)});
   if(!result.ok)throw new Error("google_download_rejected_"+result.status);
   const bytes=await result.arrayBuffer();
   if(bytes.byteLength>12000000)throw new Error("xlsx_too_large");
   let snapshot;
   try{snapshot=readPedidosXlsx(bytes);}
   catch(e){throw new Error("xlsx_validation_"+String(e?.message||"unknown").slice(0,100));}
   const known=await readPaged((low,high)=>db.from("tracking_orders")
      .select("id,source_row,order_reference,order_date,drive_finalized")
      .eq("source_id",source.file_id).order("id").range(low,high));
   if(known.length===0)throw new Error("missing_baseline");
   const existingLines=[];
   for(let i=0;i<known.length;i+=120){
     const ids=known.slice(i,i+120).map(o=>o.id);
     existingLines.push(...await readPaged((low,high)=>db.from("tracking_lines")
       .select("order_id,source_row,reference,description,requested_qty,observations,albaran,drive_line_finalized")
       .in("order_id",ids).order("id").range(low,high)));
   }
   const diff=compareSource(snapshot.orders,known,existingLines);
   if(diff.requires_review) {
     await complete("partial","Excel modificado estructuralmente: revisión humana obligatoria.",
       snapshot.summary,diff.counts);
     return {state:"needs_review",source:source.source_title,diff:diff.counts};
   }
   const saved=await db.rpc("tracking_apply_pilot_snapshot",{
     p_source_id:source.file_id,p_orders:snapshot.orders,p_modified_at:meta.modifiedTime,
     p_md5:meta.md5Checksum||"unavailable",p_run_id:runId
   });
   if(saved.error)throw new Error("apply_rejected_"+String(saved.error.message||"database").slice(0,120));
   const updated=saved.data||{};
   await complete("success","Fuente comprobada y actualización atómica confirmada.",
     snapshot.summary,updated);
   return {state:"success",source:source.source_title,changes:updated};
 }catch(e) {
   const message=String(e?.message||"synchronization_failed").slice(0,190);
   console.error("PROSOEL sync:",message);
   await complete("error","Error de sincronización: "+message);
   return {state:"error",message:"El Excel se ha conservado sin modificar la base; revisa el historial.",detail:message};
 }
}
Deno.serve(async (request)=>{
 if(request.method!=="POST")return reply(405,"method_not_allowed","Solo POST.");
 const key=request.headers.get("x-prosoel-cron-secret")||"";
 if(!/^[a-fA-F0-9]{64}$/.test(key))return reply(401,"unauthorized","No autorizado.");
 const url=Deno.env.get("SUPABASE_URL");
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return reply(503,"server_config","Falta configuración del backend.");
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const auth=await db.rpc("tracking_verify_cron_token",{p_token:key});
 if(auth.error||auth.data!==true)return reply(403,"forbidden","No autorizado.");
 try {
   const response=await runOnce(db);
   return reply(200,response.state,"Comprobación horaria ejecutada.",response);
 }catch(e){
   console.error("PROSOEL cron:",String(e?.message||"error").slice(0,140));
   return reply(503,"sync_problem","No se pudo procesar la comprobación.");
 }
});
