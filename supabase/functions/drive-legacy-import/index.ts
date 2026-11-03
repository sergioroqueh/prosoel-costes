import { createClient } from "npm:@supabase/supabase-js@2";
import { readLegacyRecentXlsx } from "./legacy.ts";
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



Deno.serve(async req=>{
  if(req.method!=="POST")return reply(405,"method_not_allowed","POST obligatorio.");
  const key=req.headers.get("x-prosoel-cron-secret")||"";
  if(!/^[a-fA-F0-9]{64}$/.test(key))return reply(401,"unauthorized","No autorizado.");
  const url=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!secret)return reply(503,"server_not_ready","Backend no configurado.");
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const verified=await db.rpc("tracking_verify_cron_token",{p_token:key});
  if(verified.error||verified.data!==true)return reply(403,"forbidden","No autorizado.");
  let body={};try{body=await req.json()}catch{}
  const fileId=String(body.file_id||"");
  if(!/^[a-zA-Z0-9_-]{16,128}$/.test(fileId))return reply(400,"invalid_source","Archivo no autorizado.");
  const query=await db.from("tracking_drive_catalog")
    .select("file_id,source_title,validation_status,validation_stats,validation_at,priority_from,status,automatic_import_enabled")
    .eq("file_id",fileId).eq("status","candidate")
    .eq("priority_from","2026-07-01").eq("validation_status","compatible")
    .eq("automatic_import_enabled",false).maybeSingle();
  if(query.error||!query.data)return reply(403,"not_approved","Falta validar este libro.");
  const source=query.data;
  let token;
  try{token=await getGoogleToken(JSON.parse(Deno.env.get("PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON")||""))}
  catch{return reply(503,"google_auth_failed","No se pudo leer Google Drive.");}
  try{
    const base="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(fileId);
    const headers={Authorization:"Bearer "+token};
    const mres=await fetch(base+"?fields=id,mimeType,modifiedTime,size,md5Checksum,capabilities(canDownload)",
       {headers,signal:AbortSignal.timeout(14000)});
    if(!mres.ok)throw new Error("drive_metadata_"+mres.status);
    const meta=await mres.json();
    if(meta.id!==fileId ||
      meta.mimeType!=="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"||
      meta.capabilities?.canDownload===false||Number(meta.size)>12000000||
      !meta.modifiedTime)throw new Error("invalid_file_metadata");
    const response=await fetch(base+"?alt=media",{headers,signal:AbortSignal.timeout(24000)});
    if(!response.ok)throw new Error("drive_download_"+response.status);
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength>12000000)throw new Error("oversized_file");
    const parsed=readLegacyRecentXlsx(bytes,"2026-07-01");
    if(!parsed.compatible || parsed.orders.length===0)throw new Error("legacy_source_unresolved");
    const s=parsed.summary,v=source.validation_stats||{};
    for(const [field,key] of [
       ["accepted_orders","orders"],["lines","lines"],["received","received"],
       ["completed","completed"],["recent_orders","recent_orders"],
       ["quarantined_orders","quarantined_orders"],["review_records","review_records"]
    ]) {
      if(Number(s[field])!==Number(v[key]))throw new Error("changed_since_audit_"+field);
    }
    const saved=await db.rpc("tracking_import_legacy_recent",{
      p_source_id:fileId,p_orders:parsed.orders,p_reviews:parsed.review,
      p_modified_at:meta.modifiedTime,p_md5:meta.md5Checksum||"unavailable",
      p_cutoff:"2026-07-01"
    });
    if(saved.error)throw new Error("database_"+String(saved.error.message||"import_failed").slice(0,115));
    // The atomic RPC already committed all accepted orders + review records.
    const log=await db.from("tracking_sync_runs").insert({
      source_id:fileId,state:"success",finished_at:new Date().toISOString(),
      scanned_files:1,updated_files:1,
      message:"Importación histórica segura desde julio 2026; actualización automática aún inactiva",
      change_summary:{safe_orders:parsed.orders.length,
         safe_lines:parsed.summary.lines,quarantined:parsed.review.length,
         cutoff:"2026-07-01"}
    });
    if(log.error)console.error("Legacy initial import log failed");
    return reply(200,"imported","Pedidos recientes incorporados; revisión separada de reclamaciones.",
      {source:source.source_title,import:saved.data,
       review_count:parsed.review.length,automatic_sync:false});
  } catch(e) {
    console.error("legacy import",String(e?.message||"error").slice(0,130));
    return reply(409,"needs_review","La fuente no se ha importado por una discrepancia de validación.",
      {reason:String(e?.message||"error").slice(0,125),automatic_sync:false});
  }
});
