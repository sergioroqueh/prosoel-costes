import { createClient } from "npm:@supabase/supabase-js@2";
import { readPedidosXlsx,compareSource } from "./parser.ts";

// Preview exclusivamente de lectura: no actualiza ninguna tabla ni modifica Drive.
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


async function pages(factory,max=20000) {
  const all=[];
  for(let start=0;start<max;start+=750){
    const {data,error}=await factory(start,start+749);
    if(error)throw new Error("database_read_failed");
    const rows=data||[];all.push(...rows);
    if(rows.length<750)return all;
  }
  throw new Error("source_too_large");
}
Deno.serve(async request=>{
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(request.method!=="POST")return reply(405,"method_not_allowed","Solo POST.");
  const header=request.headers.get("Authorization")||"";
  if(!/^Bearer\s+\S+$/i.test(header))return reply(401,"unauthenticated","Accede como Sergio.");
  try {
    const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_ANON_KEY");
    if(!url||!key)return reply(503,"server_configuration","Configuración incompleta.");
    const jwt=header.replace(/^Bearer\s+/i,"");
    const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:authData,error:authError}=await db.auth.getUser(jwt);
    if(authError||!authData?.user)return reply(401,"unauthenticated","Sesión inválida.");
    if(String(authData.user.email||"").toLowerCase()!=="compras@prosoel.es")return reply(403,"forbidden","Acceso no autorizado.");
    const userDb=createClient(url,key,{global:{headers:{Authorization:"Bearer "+jwt}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:profile,error:profileError}=await userDb.from("app_users").select("email,active").eq("email","compras@prosoel.es").maybeSingle();
    if(profileError||!profile?.active)return reply(403,"forbidden","Cuenta inactiva.");
    // Solo catálogo aprobado, con permisos RLS y sincronización automática todavía desactivada.
    const {data:source,error:sourceError}=await userDb.from("tracking_drive_catalog")
       .select("file_id,source_title,drive_modified_at,status")
       .eq("status","approved").order("source_title").limit(1).maybeSingle();
    if(sourceError||!source)return reply(409,"no_approved_source","No hay fuente autorizada.");
    const json=Deno.env.get("PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON");
    if(!json)return reply(503,"pending_credentials","Falta la credencial técnica.");
    let token;
    try{token=await getGoogleToken(JSON.parse(json));}catch{return reply(503,"google_auth_failed","Error al autenticar con Google.");}
    const endpoint="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(source.file_id);
    const metadataResponse=await fetch(endpoint+"?fields=id,name,mimeType,modifiedTime,size,md5Checksum,capabilities(canDownload)",
      {headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(15000)});
    if(!metadataResponse.ok)return reply(503,"drive_read_error","Google no ha permitido consultar el archivo aprobado.");
    const meta=await metadataResponse.json();
    if(meta.id!==source.file_id||meta.mimeType!=="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"||meta.capabilities?.canDownload===false)
      return reply(409,"invalid_file","El Excel aprobado no es descargable o ha cambiado de formato.");
    if(Number(meta.size)>12_000_000)return reply(409,"file_too_large","El Excel supera el tamaño de seguridad.");
    const raw=await fetch(endpoint+"?alt=media", {headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(20000)});
    if(!raw.ok)return reply(503,"download_denied","No se ha podido descargar el Excel de forma privada.");
    const binary=await raw.arrayBuffer();
    if(binary.byteLength>12_000_000)return reply(409,"file_too_large","El Excel supera el tamaño de seguridad.");
    let normalized;
    try{normalized=readPedidosXlsx(binary);}catch(e){
      // No mostrar contenido del fichero ni trazas internas ante errores.
      return reply(422,"xlsx_not_validated", "La estructura del Excel necesita revisión antes de importar.",
         {reason:String(e?.message||"invalid").slice(0,100)});
    }
    const existing=await pages((lo,hi)=>userDb.from("tracking_orders")
       .select("id,source_row,order_reference,order_date,drive_finalized")
       .eq("source_id",source.file_id).order("id").range(lo,hi));
    const existingLines=[];
    for(let i=0;i<existing.length;i+=120){
      const ids=existing.slice(i,i+120).map(o=>o.id);
      if(!ids.length)continue;
      const part=await pages((lo,hi)=>userDb.from("tracking_lines")
        .select("order_id,source_row,reference,description,requested_qty,observations,albaran,drive_line_finalized")
        .in("order_id",ids).order("id").range(lo,hi));
      existingLines.push(...part);
    }
    const diff=compareSource(normalized.orders,existing,existingLines);
    const summary=normalized.summary;
    const pilotValidated=existing.length===118&&existingLines.length===488&&
      summary.orders===118&&summary.lines===488&&summary.completed===91&&
      summary.partial===9&&summary.noneReceived===18&&summary.received===390;
    return reply(200,pilotValidated&&!diff.requires_review?"preview_ready":"needs_review",
      pilotValidated?"Comparación del Excel realizada sin modificar pedidos.":"La estructura o el contenido no coinciden con el piloto validado.",
      {source:source.source_title,drive_modified_at:meta.modifiedTime,summary,diff,
       pilot_baseline_matched:pilotValidated,automatic_sync:false});
  }catch(e){
    console.error("Drive preview failed",String(e?.message||"error").slice(0,120));
    return reply(503,"preview_error","No se pudo completar la comparación. No se ha modificado ningún dato.");
  }
});
