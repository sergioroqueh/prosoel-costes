import { createClient } from "npm:@supabase/supabase-js@2";

// Sólo prueba acceso a un archivo previamente APROBADO, sin descargar contenido ni cambiar Drive.
// Las credenciales Google deben configurarse como secreto de Supabase, jamás en GitHub Pages.
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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return reply(405, "method_not_allowed", "Utiliza POST.");
  const header = request.headers.get("Authorization") || "";
  if (!/^Bearer\s+\S+$/i.test(header)) return reply(401, "unauthenticated", "Inicia sesión en PROSOEL Costes.");
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !key) return reply(503, "internal_configuration", "Falta configuración de Supabase.");
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const jwt = header.replace(/^Bearer\s+/i, "");
    const { data: authData, error: authError } = await db.auth.getUser(jwt);
    const email = String(authData?.user?.email || "").trim().toLowerCase();
    if (authError || !authData?.user) return reply(401, "unauthenticated", "Sesión no válida.");
    if (email !== "compras@prosoel.es") return reply(403, "forbidden", "Cuenta no autorizada.");
    // El query al catálogo se realiza con el JWT: RLS debe permitir sólo a Sergio.
    const userDb = createClient(url, key, {
      global: { headers: { Authorization: "Bearer " + jwt } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile, error: profileError } = await userDb.from("app_users")
      .select("email,active").eq("email", email).maybeSingle();
    if (profileError || !profile?.active) return reply(403, "forbidden", "Cuenta no autorizada.");
    const { data: source, error: sourceError } = await userDb.from("tracking_drive_catalog")
      .select("file_id,source_title").eq("status", "approved").order("source_title").limit(1).maybeSingle();
    if (sourceError || !source) return reply(409, "no_approved_source", "No hay una fuente aprobada para comprobar.");

    const raw = Deno.env.get("PROSOEL_GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!raw) return reply(200, "pending_credentials",
      "Conector preparado. Falta añadir la cuenta de servicio en los secretos de Supabase.",
      { source: source.source_title, automatic_sync: false });

    let account;
    try { account = JSON.parse(raw); }
    catch { return reply(503, "invalid_credentials", "El secreto de Google no es JSON válido."); }
    let accessToken;
    try { accessToken = await getGoogleToken(account); }
    catch { return reply(503, "google_auth_failed",
      "Google no aceptó la credencial. Revisa la cuenta de servicio, la clave y Drive API."); }

    const driveResponse = await fetch(
      "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(source.file_id) +
      "?fields=id,name,mimeType,modifiedTime,capabilities(canDownload)&supportsAllDrives=true",
      { headers: { Authorization: "Bearer " + accessToken }, signal: AbortSignal.timeout(12000) },
    );
    if (driveResponse.status === 403 || driveResponse.status === 404)
      return reply(200, "permission_missing",
        "La identidad técnica existe, pero Google no le permite consultar el Excel aprobado. Compártelo como Lector.");
    if (!driveResponse.ok)
      return reply(503, "google_unavailable", "Google Drive no respondió correctamente.");
    const file = await driveResponse.json();
    if (file.id !== source.file_id)
      return reply(503, "source_mismatch", "La respuesta no coincide con el archivo aprobado.");
    if (file.capabilities?.canDownload === false)
      return reply(200, "download_not_allowed", "Google permite ver el archivo, pero no descargar el XLSX.");
    if (file.mimeType !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      return reply(200, "unexpected_file_type", "El archivo aprobado ya no es un Excel XLSX.");
    return reply(200, "connected", "Acceso de solo lectura comprobado con Google Drive.", {
      source: source.source_title, google_modified_at: file.modifiedTime,
      automatic_sync: false,
    });
  } catch {
    return reply(503, "connection_error", "No se completó la comprobación. Revisa la conexión y vuelve a intentarlo.");
  }
});
