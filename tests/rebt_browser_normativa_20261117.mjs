import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pageHtml = String.raw`<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/app/static/styles.css">
<link rel="stylesheet" href="/app/static/rebt.css">
<title>Vista de pruebas REBT Normativo</title></head><body><main style="max-width:1100px;margin:25px auto;padding:10px">
<div id="rebtDailyTeaser" class="rebt-teaser hidden"></div>
<section id="rebtWorkspace" class="rebt-workspace hidden"></section></main>
<script type="module">
import { initRebt } from "/app/static/rebt.js";
const store = new Map();
const client = {from(table) {
  if (table!=="rebt_lesson_progress") throw new Error("Unexpected table "+table);
  return {
    select() { return {eq(){ return Promise.resolve({data:[...store.values()],error:null}); }}; },
    upsert(row) {store.set(row.lesson_id,row);return Promise.resolve({error:null});}
  };
}};
const container=document.getElementById("rebtWorkspace");
const widget=initRebt({
  container,teaser:document.getElementById("rebtDailyTeaser"),client,
  canOpen:()=>true,onNavigate:()=>{container.classList.remove("hidden");widget.open();}
});
widget.setUser({id:"11111111-1111-4111-8111-111111111111"});
window.rebtSmoke={widget,store};
</script></body></html>`;

const server = createServer(async (req, res) => {
  try {
    if (req.url === "/") {res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});res.end(pageHtml);return;}
    const loc = path.resolve(root, "."+decodeURIComponent(new URL(req.url,"http://local").pathname));
    if (!loc.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
    const data = await readFile(loc);
    res.writeHead(200,{"Content-Type":loc.endsWith(".js")?"text/javascript; charset=utf-8":loc.endsWith(".css")?"text/css; charset=utf-8":"application/octet-stream"});
    res.end(data);
  } catch (error) {res.writeHead(404);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const url = "http://127.0.0.1:"+server.address().port+"/";
const browser = await chromium.launch({headless:true});
try {
  await mkdir(path.join(root,"tests/rebt-normas-screenshots"),{recursive:true});
  for (const [name,width,height] of [["desktop",1366,900],["mobile",390,844]]) {
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    const errors=[];
    page.on("pageerror",err=>errors.push(err.message));
    await page.goto(url,{waitUntil:"networkidle"});
    const teaser=page.locator("#rebtDailyTeaser");
    assert.equal(await teaser.isVisible(),true,name+" teaser");
    assert.ok((await teaser.boundingBox()).height <= 48,name+" teaser discreto");
    assert.match(await teaser.innerText(),/Artículo 1/);
    await teaser.getByRole("button",{name:"Continuar"}).click();
    await page.getByRole("heading",{name:"Aprende REBT"}).waitFor();
    assert.equal(await page.locator("#rebt5Toc [data-unit]").count(),81,name+" 29 artículos + 52 ITC");
    assert.match(await page.locator("#rebt5Detail h3").innerText(),/Artículo 1/);
    assert.match(await page.locator(".rebt5-progress").innerText(),/0 \/ 81/);
    assert.match(await page.locator(".rebt5-official-link").getAttribute("href"),/#a1$/);
    assert.match(await page.locator(".rebt5-verbatim blockquote").innerText(),/condiciones técnicas y garantías/);
    assert.equal(await page.getByRole("button",{name:"Registrar lectura"}).isDisabled(),true);
    await page.locator("#rebt5ReadAck").check();
    await page.getByRole("button",{name:"Registrar lectura"}).click();
    await page.getByText("Lectura guardada en tu cuenta.").waitFor();
    assert.match(await page.locator(".rebt5-progress").innerText(),/1 \/ 81/);
    await page.getByRole("button",{name:"Ir al siguiente apartado"}).click();
    assert.match(await page.locator("#rebt5Detail h3").innerText(),/Artículo 2/);
    // Buscar una ITC, abrir la fuente oficial (sin inventar resumen interno).
    await page.locator("#rebt5Search").fill("ITC-BT-14");
    assert.equal(await page.locator("#rebt5Toc [data-unit]").count(),1,name+" búsqueda");
    await page.locator("#rebt5Toc [data-unit]").first().click();
    assert.match(await page.locator("#rebt5Detail h3").innerText(),/ITC-BT-14/);
    assert.match(await page.locator(".rebt5-source-mode").innerText(),/todavía no tiene una ficha interna revisada/);
    assert.match(await page.locator(".rebt5-official-link").getAttribute("href"),/#ib-14$/);
    await page.locator("#rebt5Search").fill("");
    await page.locator("#rebt5Toc").evaluate(el=>{el.scrollTop=500;});
    const before=await page.locator("#rebt5Toc").evaluate(el=>el.scrollTop);
    assert.ok(before>0,name+" índice desplazado");
    await page.locator('#rebt5Toc [data-unit="N-ART-20"]').click();
    const after=await page.locator("#rebt5Toc").evaluate(el=>el.scrollTop);
    assert.ok(after>=before-8,name+" conservar desplazamiento del índice al seleccionar");
    // Repaso antiguo permanece accesible y su progreso no se mezcla con el normativo.
    await page.getByRole("button",{name:/Repaso de conocimientos/}).click();
    await page.getByRole("heading",{name:"Biblioteca"}).waitFor();
    assert.match(await page.locator(".rebt-count").innerText(),/0 de 88/);
    await page.getByRole("button",{name:"Mi recorrido por el REBT"}).click();
    assert.match(await page.locator(".rebt5-progress").innerText(),/1 \/ 81/);
    await page.screenshot({path:path.join(root,"tests/rebt-normas-screenshots",name+".png"),fullPage:true});
    assert.deepEqual(errors,[],name+" browser errors");
    if(name==="mobile"){
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
      assert.ok(overflow<=2,name+" sin desbordamiento horizontal: "+overflow);
      const positions=await page.evaluate(()=>({
        detail:document.querySelector(".rebt5-detail").getBoundingClientRect().top,
        contents:document.querySelector(".rebt5-contents").getBoundingClientRect().top
      }));
      assert.ok(positions.detail<positions.contents,"lectura antes que índice en móvil");
    }
    console.log("PASS "+name+": 81 fuentes BOE, progreso secuencial, repaso aparte, navegación estable");
    await page.close();
  }
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
