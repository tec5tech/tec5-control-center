// Script local para conseguir el Refresh Token de Google Ads.
// Levanta un server en localhost:8765, te da un link, abrís Brave/Chrome/etc,
// te logueás con la cuenta correspondiente, y al volver el script
// imprime el refresh_token + lo guarda en .refresh-token.txt
//
// Requiere las siguientes env vars en .env (no se commitean):
//   GOOGLE_OAUTH_CLIENT_ID="<...>.apps.googleusercontent.com"
//   GOOGLE_OAUTH_CLIENT_SECRET="GOCSPX-..."
//
// Uso:  node --env-file=.env scripts/google-oauth.mjs

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Faltan GOOGLE_OAUTH_CLIENT_ID y/o GOOGLE_OAUTH_CLIENT_SECRET en .env",
  );
  console.error("Ejecutá con: node --env-file=.env scripts/google-oauth.mjs");
  process.exit(1);
}
const SCOPE = "https://www.googleapis.com/auth/adwords";
const PORT = 8765;
const REDIRECT_URI = `http://localhost:${PORT}`;

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");
authUrl.searchParams.set("include_granted_scopes", "true");

const HTML_OK = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><title>OAuth listo</title>
<style>body{font-family:system-ui,Segoe UI,sans-serif;background:#f6f7f9;margin:0;display:grid;place-items:center;min-height:100vh;color:#222}
.box{background:#fff;border-radius:14px;padding:40px;box-shadow:0 8px 28px rgba(0,0,0,.08);max-width:520px;text-align:center}
h1{color:#0b8a3a;margin:0 0 12px}
p{color:#555;margin:8px 0}
code{background:#f0f0f3;padding:3px 8px;border-radius:6px;font-size:13px}
</style></head><body>
<div class="box">
<h1>✅ Listo</h1>
<p>Ya conseguimos el <code>refresh_token</code>.</p>
<p>Volvé al terminal de Claude — ya lo tiene capturado y va a guardarlo en el portal.</p>
<p>Podés cerrar esta pestaña.</p>
</div></body></html>`;

const HTML_ERR = (msg) => `<!DOCTYPE html><html><head>
<meta charset="utf-8"><title>OAuth error</title>
<style>body{font-family:system-ui,sans-serif;background:#fff5f5;margin:0;display:grid;place-items:center;min-height:100vh}
.box{background:#fff;border-radius:14px;padding:40px;box-shadow:0 8px 28px rgba(0,0,0,.08);max-width:520px}
h1{color:#c0392b;margin:0 0 12px}
pre{background:#f6f7f9;padding:14px;border-radius:8px;font-size:12px;overflow:auto}
</style></head><body>
<div class="box"><h1>❌ Error</h1><pre>${msg}</pre></div></body></html>`;

let done = false;

const server = http.createServer(async (req, res) => {
  if (done) return res.end("Ya finalizó.");
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname === "/favicon.ico") return res.end();

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML_ERR(`Google devolvió: ${error}`));
    console.error("\n❌ Error de Google:", error);
    process.exit(1);
  }

  if (!code) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("Esperando autorización...");
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();

    if (!tokenRes.ok || !tokens.refresh_token) {
      const msg = JSON.stringify(tokens, null, 2);
      res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
      res.end(HTML_ERR(msg));
      console.error("\n❌ No se obtuvo refresh_token. Respuesta:");
      console.error(msg);
      process.exit(1);
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML_OK);

    const out = path.join(process.cwd(), ".refresh-token.txt");
    fs.writeFileSync(out, tokens.refresh_token);
    console.log("\n========================================");
    console.log("✅ REFRESH TOKEN OBTENIDO:");
    console.log("========================================");
    console.log(tokens.refresh_token);
    console.log("========================================");
    console.log(`📁 Guardado en: ${out}`);
    console.log("========================================\n");

    done = true;
    setTimeout(() => process.exit(0), 500);
  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML_ERR(String(e)));
    console.error("\n❌ Falla en exchange:", e);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`\n🔐 Servidor OAuth listo en ${REDIRECT_URI}`);
  console.log("\n👉 Abrí ESTE link en tu navegador (Brave funciona perfecto):");
  console.log("\n" + authUrl.toString() + "\n");
  console.log("⏳ Esperando que vuelvas con el code de Google...\n");
});
