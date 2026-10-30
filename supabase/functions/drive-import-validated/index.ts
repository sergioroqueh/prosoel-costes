import { createClient } from "npm:@supabase/supabase-js@2";
import { readPedidosXlsx } from "./parser.ts";
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


Deno.serve(async request=>{
 if(request.method!=="POST")return reply(405,"method_not_allowed","POST required.");
 const supplied=request.headers.get("x-prosoel-cron-secret")||"";
 if(!/^[a-fA-F0-9]{64}$/.test(supplied))return reply(401,"unauthorized","Unauthorized.");
 const url=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!secret)return reply(503,"configuration_missing","Backend unavailable.");
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const checked=await db.rpc("tracking_verify_cron_token",{p_token:supplied});
 if(checked.error||checked.data!==true)return reply(403,"forbidden","Unauthorized.");
 let body={};try{body=await request.json()}catch{}
 const limit=Number(body.limit??2);
 if(!Number.isInteger(limit)||limit<1||limit>3)return reply(400,"invalid_batch","Maximum three sources per request.");
 const res=await db.from("tracking_drive_catalog")
   .select("file_id,source_title,validation_stats,validation_status")
   .eq("status","candidate").eq("validation_status","compatible")
   .order("source_title").limit(limit);
 if(res.error)return reply(503,"source_query_failed","Cannot find validated files.");
 const selected=res.data||[];
 if(!selected.length)return reply(200,"empty","No more validated sources to import.",{outcomes:[]});
 let token;
 try{
   const raw=Deno.env.get("PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON");
   if(!raw)throw new Error("missing_credentials");
   token=await getGoogleToken(JSON.parse(raw));
 }catch{return reply(503,"google_auth_failed","Google authentication failed.");}
 const outcomes=[];
 for(const item of selected){
   let state="failed",reason="unknown",stats={};
   try{
     const base="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(item.file_id);
     const headers={Authorization:"Bearer "+token};
     const getMeta=await fetch(base+"?fields=id,mimeType,modifiedTime,size,md5Checksum,capabilities(canDownload)",{
       headers,signal:AbortSignal.timeout(14000)
     });
     if(!getMeta.ok)throw new Error("metadata_"+getMeta.status);
     const meta=await getMeta.json();
     if(meta.id!==item.file_id ||
       meta.mimeType!=="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"||
       meta.capabilities?.canDownload===false || Number(meta.size)>12000000||
       !meta.modifiedTime)throw new Error("invalid_file");
     const res=await fetch(base+"?alt=media",{headers,signal:AbortSignal.timeout(22000)});
     if(!res.ok)throw new Error("download_"+res.status);
     const buffer=await res.arrayBuffer();
     if(buffer.byteLength>12000000)throw new Error("file_too_large");
     const parsed=readPedidosXlsx(buffer);
     stats=parsed.summary;
     if(["orders","lines","received","completed"].some(k=>
       Number(item.validation_stats?.[k])!==Number(stats[k])))
       throw new Error("changed_after_validation");
     const saved=await db.rpc("tracking_initial_import",{
       p_source_id:item.file_id,p_orders:parsed.orders,
       p_modified_at:meta.modifiedTime,p_md5:meta.md5Checksum||"unavailable"
     });
     if(saved.error)throw new Error("database_"+String(saved.error.message||"import_failed").slice(0,105));
     state="imported";reason="atomic_import_verified";
     const run=await db.from("tracking_sync_runs").insert({
       state:"success",source_id:item.file_id,
       scanned_files:1,updated_files:1,
       message:"Importación inicial de fuente validada; sincronización horaria pendiente",
       finished_at:new Date().toISOString(),
       change_summary:{initial_import:stats}
     });
     if(run.error)console.error("Initial import log failed",item.file_id);
   }catch(e){
     reason=String(e?.message||"import_failed").slice(0,120);
     state="needs_review";
     // Failed sources are removed from the automatic import queue; they remain
     // visible and can be investigated individually without repeated risky retries.
     await db.from("tracking_drive_catalog").update({
       validation_status:"incompatible",validation_error:"import:"+reason
     }).eq("file_id",item.file_id).eq("status","candidate");
   }
   outcomes.push({name:item.source_title,state,reason,
     summary:state==="imported"?stats:undefined});
 }
 return reply(200,"completed_batch","Validated source import batch processed.",{
  outcomes,automatic_sync_extended:false
 });
});