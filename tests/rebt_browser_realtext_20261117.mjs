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



const server=createServer(async(req,res)=>{
 try{
   if(req.url==="/"){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});res.end(pageHtml);return;}
   const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
   const relative=pathname==="/rebt_legal_text.json"?"/app/static/rebt_legal_text.json":pathname;
   const loc=path.resolve(root,"."+relative);
   if(!loc.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   const data=await readFile(loc);
   res.writeHead(200,{"Content-Type":
     loc.endsWith(".js")?"text/javascript; charset=utf-8":
     loc.endsWith(".json")?"application/json; charset=utf-8":
     loc.endsWith(".css")?"text/css; charset=utf-8":
     loc.endsWith(".png")?"image/png":"application/octet-stream"});
   res.end(data);
 }catch(error){res.writeHead(404);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const url="http://127.0.0.1:"+server.address().port+"/";
const realCorpus=JSON.parse(await readFile(path.join(root,"app/static/rebt_legal_text.json"),"utf8"));
assert.equal(realCorpus.readableBlocks,81);
assert.ok(realCorpus.characters>700000);
assert.ok(realCorpus.blocks["N-ITC-21"].html.includes("<table"));
const browser=await chromium.launch({headless:true});
try{
 await mkdir(path.join(root,"tests/rebt-real-screenshots"),{recursive:true});
 for(const [name,width,height] of [["desktop",1366,900],["mobile",390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto(url,{waitUntil:"networkidle"});
  await page.getByRole("button",{name:"Continuar"}).click();
  await page.locator(".rebt6-document p").first().waitFor();
  assert.match(await page.locator(".rebt6-document").innerText(),/condiciones técnicas y garantías/i);
  await page.locator("#rebt5Search").fill("la tapa de las canales quedara siempre accesible");
  assert.equal(await page.locator("#rebt5Toc [data-unit]").count(),1,name+" búsqueda texto real");
  assert.match(await page.locator("#rebt5Toc [data-unit]").first().innerText(),/ITC-BT-21/);
  await page.locator("#rebt5Toc [data-unit]").first().click();
  await page.locator(".rebt6-document table").first().waitFor();
  assert.ok(await page.locator(".rebt6-document table").count()>=10,name+" tablas normativas");
  assert.match(await page.locator(".rebt6-document").innerText(),/tapa de las canales quedará siempre accesible/i);
  await page.locator("#rebt6InDoc").fill("canales");
  assert.ok(await page.locator(".rebt6-document mark.rebt6-highlight").count()>0,name+" resaltado ITC real");
  await page.getByRole("button",{name:"Coincidencia siguiente"}).click();
  await page.screenshot({path:path.join(root,"tests/rebt-real-screenshots",name+".png"),fullPage:true});
  assert.deepEqual(errors,[],name+" errores JS");
  if(name==="mobile"){
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    assert.ok(overflow<=2,name+" desbordamiento "+overflow);
  }
  console.log("PASS REBT oficial "+name+": 81 unidades, búsqueda en cuerpo, >=10 tablas de ITC21, resaltado");
  await page.close();
 }
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
