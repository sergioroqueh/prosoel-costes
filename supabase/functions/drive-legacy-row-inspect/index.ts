import {createClient} from "npm:@supabase/supabase-js@2";
import {readLegacyRecentXlsx} from "./legacy.ts";
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
 if(req.method!=="POST")return new Response("Method not allowed",{status:405});
 const key=req.headers.get("x-prosoel-cron-secret")||"";
 if(!/^[a-fA-F0-9]{64}$/.test(key))return new Response("Unauthorized",{status:401});
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!service)return new Response("Unavailable",{status:503});
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const ck=await db.rpc("tracking_verify_cron_token",{p_token:key});
 if(ck.error||ck.data!==true)return new Response("Forbidden",{status:403});
 try{
   const raw=Deno.env.get("PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON");
   if(!raw)throw new Error("missing_google_credentials");
   const token=await getGoogleToken(JSON.parse(raw));
   const fileId="1Gw7_gWxq5ikSjiykVUjH9owngMshTQCQ";
   const file=await fetch("https://www.googleapis.com/drive/v3/files/"+fileId+"?alt=media",{
     headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(20000)
   });
   if(!file.ok)throw new Error("download_failed_"+file.status);
   const parsed=readLegacyRecentXlsx(await file.arrayBuffer(),"2026-07-01");
   const target=parsed.orders.find(x=>x.order_reference==="26/822");
   return new Response(JSON.stringify({
      accepted:!!target,order:target||null,
      summary:parsed.summary,
      review:parsed.review.filter(x=>x.order_reference==="26/822")
   }),{status:200,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
 }catch(e){return new Response(JSON.stringify({error:String(e?.message||"parse_failed").slice(0,180)}),
    {status:422,headers:{"Content-Type":"application/json"}});}
});