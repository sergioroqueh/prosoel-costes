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
<title>Vista de pruebas Aprende REBT</title></head><body><main style="max-width:1100px;margin:25px auto;padding:10px">
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
  await mkdir(path.join(root,"tests/rebt-screenshots"),{recursive:true});
  for (const [name,width,height] of [["desktop",1366,900],["mobile",390,844]]) {
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    const errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto(url,{waitUntil:"networkidle"});
    assert.equal(await page.locator("#rebtDailyTeaser").isVisible(),true,name+" teaser visible");
    const teaserSize=await page.locator("#rebtDailyTeaser").boundingBox();
    assert.ok(teaserSize.height<=45,name+" tarjeta discreta");
    await page.getByRole("button",{name:"Leer",exact:true}).click();
    await page.locator("#rebtWorkspace h2").waitFor();
    const href = await page.locator(".rebt-links a").first().getAttribute("href");
    assert.match(href, /#ib-10$/, name+" enlace directo al BOE");
    if (name==="mobile") {
      const positions=await page.evaluate(()=>({
        lesson:document.querySelector(".rebt-lesson").getBoundingClientRect().top,
        library:document.querySelector(".rebt-library").getBoundingClientRect().top
      }));
      assert.ok(positions.lesson<positions.library,"Móvil: mostrar primero la lección, no la biblioteca");
    }
    await page.locator('[name="rebtAnswer"]').first().check();
    await page.getByRole("button",{name:"Comprobar respuesta"}).click();
    await page.locator(".rebt-quiz p.correct, .rebt-quiz p.incorrect").waitFor();
    await page.getByRole("button",{name:"☆ Añadir a favoritos"}).click();
    await page.getByRole("button",{name:"Marcar aprendida"}).click();
    assert.match(await page.locator(".rebt-count").textContent(),/1 de 88/,name+" progress");
    await page.screenshot({path:path.join(root,"tests/rebt-screenshots",name+".png"),fullPage:true});
    // Caso regresión: lista profunda no debe volver a la primera al seleccionar otra lección.
    await page.getByRole("button",{name:"Todas",exact:true}).click();
    await page.locator("#rebtLibrary").evaluate((el)=>{el.scrollTop=650;});
    const topBefore=await page.locator("#rebtLibrary").evaluate((el)=>el.scrollTop);
    assert.ok(topBefore>0,name+" scrolling deep library");
    await page.locator("#rebtLibrary [data-lesson]").nth(17).click();
    await page.waitForTimeout(100);
    const topAfter=await page.locator("#rebtLibrary").evaluate((el)=>el.scrollTop);
    assert.ok(topAfter>=topBefore-15,name+" preserve scroll: before="+topBefore+" after="+topAfter);
    // Acierto y guardado también deben mantener la posición del menú.
    await page.locator('[name="rebtAnswer"]').first().check();
    await page.getByRole("button",{name:"Comprobar respuesta"}).click();
    await page.locator(".rebt-quiz p.correct, .rebt-quiz p.incorrect").waitFor();
    const topQuiz=await page.locator("#rebtLibrary").evaluate((el)=>el.scrollTop);
    assert.ok(topQuiz>=topBefore-15,name+" preserve scroll after answer");
    await page.getByRole("button",{name:"Favoritas"}).click();
    assert.equal(await page.locator("[data-lesson]").count(),1,name+" favorites");
    await page.locator("#rebtTopic").selectOption({label:"Previsión de cargas"});
    assert.equal(await page.locator("[data-lesson]").count(),1,name+" topic filter conjunction");
    await page.locator("#rebtTopic").selectOption({label:"Alumbrado exterior"});
    assert.equal(await page.locator("[data-lesson]").count(),0,name+" topic filter exclusion");
    assert.deepEqual(errors,[],name+" browser console");
    if (name==="mobile") {
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
      assert.ok(overflow<=2,"Mobile overflow "+overflow+"px");
    }
    console.log("PASS "+name+": teaser, lesson, answer, favorite, completed, layout");
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
