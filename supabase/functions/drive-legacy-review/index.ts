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
  const cron=req.headers.get("x-prosoel-cron-secret")||"";
  if(!/^[a-fA-F0-9]{64}$/.test(cron))return reply(401,"unauthorized","No autorizado.");
  const url=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!secret)return reply(503,"server_not_ready","Configuración pendiente.");
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const verified=await db.rpc("tracking_verify_cron_token",{p_token:cron});
  if(verified.error||verified.data!==true)return reply(403,"forbidden","No autorizado.");
  let body={};try{body=await req.json()}catch{}
  const fileId=String(body.file_id||"");
  if(!/^[a-zA-Z0-9_-]{16,128}$/.test(fileId))return reply(400,"invalid_file","Archivo no válido.");
  const source=await db.from("tracking_drive_catalog")
    .select("file_id,source_title,status,priority_from,automatic_import_enabled")
    .eq("file_id",fileId).eq("status","candidate").eq("priority_from","2026-07-01")
    .eq("automatic_import_enabled",false).maybeSingle();
  if(source.error||!source.data)return reply(403,"not_candidate","Archivo no autorizado para auditoría histórica.");
  let token;
  try{token=await getGoogleToken(JSON.parse(Deno.env.get("PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON")||""))}
  catch{return reply(503,"google_auth_failed","No se pudo autenticar el lector Drive.");}
  const endpoint="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(fileId);
  const headers={Authorization:"Bearer "+token};
  try{
    const response=await fetch(endpoint+"?fields=id,mimeType,size,modifiedTime,md5Checksum,capabilities(canDownload)",
      {headers,signal:AbortSignal.timeout(14000)});
    if(!response.ok)return reply(503,"drive_metadata","No se pudo consultar el libro.");
    const metadata=await response.json();
    if(metadata.id!==fileId||
      metadata.mimeType!=="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"||
      metadata.capabilities?.canDownload===false||Number(metadata.size)>12000000)
       return reply(409,"file_incompatible","El libro no tiene un formato autorizado.");
    const file=await fetch(endpoint+"?alt=media",{headers,signal:AbortSignal.timeout(24000)});
    if(!file.ok)return reply(503,"download_failed","No se pudo leer el Excel.");
    const bytes=await file.arrayBuffer();
    if(bytes.byteLength>12000000)return reply(422,"too_large","Excel excesivamente grande.");
    const parsed=readLegacyRecentXlsx(bytes,"2026-07-01");
    const compatible=parsed.compatible&&parsed.summary?.accepted_orders>0;
    const stats=compatible?{
      orders:parsed.summary.accepted_orders,
      lines:parsed.summary.lines,
      received:parsed.summary.received,
      completed:parsed.summary.completed,
      partial:parsed.summary.partial,
      noneReceived:parsed.summary.noneReceived,
      recent_orders:parsed.summary.recent_orders,
      review_records:parsed.summary.review_records,
      quarantined_orders:parsed.summary.quarantined_orders,
      cutoff:"2026-07-01",
      source_sheet:parsed.source_sheet
    }:{};
    const reason=parsed.compatible?
      (compatible?"legacy_recent_validated":"legacy_no_safe_recent_orders"):
      parsed.reason;
    const updated=await db.from("tracking_drive_catalog").update({
      validation_status:compatible?"compatible":"incompatible",
      validation_stats:stats,
      validation_at:new Date().toISOString(),
      validation_error:compatible?null:reason
    }).eq("file_id",fileId).eq("status","candidate");
    if(updated.error)throw new Error("validation_status_write_failed");
    return reply(200,compatible?"validated":"needs_review","Auditoría histórica sin importar pedidos.",
      {source:source.data.source_title,state:compatible?"validated":"needs_review",
       summary:parsed.summary,reason:compatible?null:reason,
       sheet_check:parsed.sheet_check,
       review_examples:(parsed.review||[]).slice(0,12).map(x=>({
          order:x.order_reference,date:x.order_date,row:x.source_row,
          reason:x.reason,issues:(x.issues||[]).map(y=>({
            row:y.source_row,reason:y.reason,qty_raw:y.qty_raw||null})).slice(0,5)
       })),
       imported:false});
  }catch(e){
    console.error("legacy preview",String(e?.message||"unknown").slice(0,120));
    return reply(422,"legacy_scan_failed","El libro requiere revisión del formato.",
      {reason:String(e?.message||"unknown").slice(0,110)});
  }
});
