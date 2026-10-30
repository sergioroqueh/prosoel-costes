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

// Read-only auditor: only already identified candidate XLSX files; no insertion of orders,
// no approval and no enabling of scheduled imports.
Deno.serve(async (request)=>{
  if(request.method!=="POST")return reply(405,"method_not_allowed","POST required.");
  const supplied=request.headers.get("x-prosoel-cron-secret")||"";
  if(!/^[a-fA-F0-9]{64}$/.test(supplied))return reply(401,"unauthorized","Unauthorized.");
  const url=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!secret)return reply(503,"configuration_missing","Backend unavailable.");
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const checked=await db.rpc("tracking_verify_cron_token",{p_token:supplied});
  if(checked.error||checked.data!==true)return reply(403,"forbidden","Unauthorized.");
  let body={};try{body=await request.json()}catch{}
  const offset=Number(body.offset??0),limit=Number(body.limit??3);
  if(!Number.isInteger(offset)||offset<0||offset>200||
     !Number.isInteger(limit)||limit<1||limit>4)return reply(400,"bad_batch","Invalid batch.");
  const c=await db.from("tracking_drive_catalog")
    .select("file_id,source_title,status,source_mime").eq("status","candidate")
    .order("source_title").range(offset,offset+limit-1);
  if(c.error)return reply(503,"catalog_error","Cannot load candidates.");
  const raw=Deno.env.get("PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON");
  if(!raw)return reply(503,"credentials_missing","Google key not configured.");
  let token;
  try{token=await getGoogleToken(JSON.parse(raw))}
  catch{return reply(503,"google_auth_failed","Google authorization failure.");}
  const outcomes=[];
  for(const src of c.data||[]){
    let state="error",reason="",stats={};
    try{
      const endpoint="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(src.file_id);
      const headers={Authorization:"Bearer "+token};
      const res=await fetch(endpoint+"?fields=id,name,mimeType,size,modifiedTime,capabilities(canDownload)",{headers,signal:AbortSignal.timeout(12000)});
      if(res.status===403||res.status===404){state="permission_missing";reason="service_account_not_shared";}
      else if(!res.ok){reason="google_metadata_"+res.status;}
      else{
        const meta=await res.json();
        if(meta.mimeType!=="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
           ||meta.capabilities?.canDownload===false){state="incompatible";reason="not_downloadable_xlsx";}
        else if(Number(meta.size)>12000000){state="incompatible";reason="xlsx_too_large";}
        else{
          const download=await fetch(endpoint+"?alt=media",{headers,signal:AbortSignal.timeout(20000)});
          if(!download.ok){reason="google_download_"+download.status;}
          else{
            const data=await download.arrayBuffer();
            try{
              const parsed=readPedidosXlsx(data);
              stats=parsed.summary;
              state="compatible";reason="validated_strict_pedidos";
            }catch(e){state="incompatible";reason=String(e?.message||"xlsx_parse_failed").slice(0,120);}
          }
        }
      }
    }catch(e){reason="network_or_processing_error";}
    const updated=await db.from("tracking_drive_catalog").update({
      validation_status:state,validation_at:new Date().toISOString(),
      validation_error:state==="compatible"?null:reason,validation_stats:stats
    }).eq("file_id",src.file_id).eq("status","candidate");
    outcomes.push({name:src.source_title,state,reason,
      summary:state==="compatible"?stats:undefined,
      stored:!updated.error});
  }
  return reply(200,"audited","Batch inspected; no orders were imported.",{
    offset,limit,outcomes,automatic_activation:false
  });
});