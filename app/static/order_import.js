// PROSOEL Costes — lectura local de XLSX (no se sube el fichero original).
// Soporta la hoja HOJA PEDIDO y las plantillas 2024 de doble descuento.
// Sin dependencias externas: ZIP/Deflate-raw del navegador + DOMParser + WebCrypto.

const MB = 1024 * 1024;
const decoder = new TextDecoder("utf-8");
const validSheet = "HOJA PEDIDO";

function little16(view, offset) { return view.getUint16(offset,true); }
function little32(view, offset) { return view.getUint32(offset,true); }

function zipIndex(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocd = -1;
  for (let i=bytes.length-22;i>=Math.max(0,bytes.length-66000);i--) {
    if (little32(view,i)===0x06054b50) { eocd=i; break; }
  }
  if (eocd<0) throw new Error("El archivo no es un XLSX/ZIP válido.");
  const entries = little16(view,eocd+10);
  const central = little32(view,eocd+16);
  if (entries>2000 || central>=bytes.length || little16(view,eocd+8)!==entries) {
    throw new Error("ZIP demasiado complejo o dividido; utiliza un archivo XLSX individual.");
  }
  const result=new Map();
  let cursor=central;
  for(let index=0;index<entries;index++) {
    if (cursor+46>bytes.length || little32(view,cursor)!==0x02014b50) {
      throw new Error("Directorio ZIP dañado.");
    }
    const flags=little16(view,cursor+8);
    const method=little16(view,cursor+10);
    const compressed=little32(view,cursor+20);
    const original=little32(view,cursor+24);
    const nameLength=little16(view,cursor+28);
    const extraLength=little16(view,cursor+30);
    const commentLength=little16(view,cursor+32);
    const position=little32(view,cursor+42);
    if (compressed===0xffffffff || original===0xffffffff || position===0xffffffff) {
      throw new Error("ZIP64 no compatible con la importación individual.");
    }
    if (cursor+46+nameLength+extraLength+commentLength>bytes.length) {
      throw new Error("Índice ZIP fuera del archivo.");
    }
    const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLength));
    if (!result.has(name)) result.set(name,{method,flags,compressed,original,position});
    cursor+=46+nameLength+extraLength+commentLength;
  }
  async function open(name) {
    const item=result.get(name);
    if (!item) throw new Error("Falta una parte requerida del Excel: "+name);
    if (item.original>30*MB || item.compressed>15*MB) {
      throw new Error("La hoja Excel excede el tamaño admitido: "+name);
    }
    const offset=item.position;
    if (offset+30>bytes.length || little32(view,offset)!==0x04034b50) {
      throw new Error("Cabecera ZIP incorrecta: "+name);
    }
    if (item.flags & 1) throw new Error("Los Excel cifrados no se pueden importar.");
    const payloadAt=offset+30+little16(view,offset+26)+little16(view,offset+28);
    if (payloadAt+item.compressed>bytes.length) throw new Error("Datos ZIP truncados.");
    const packed=bytes.slice(payloadAt,payloadAt+item.compressed);
    if (item.method===0) return packed;
    if (item.method!==8) throw new Error("Compresión ZIP no reconocida.");
    if (typeof DecompressionStream==="undefined") {
      throw new Error("Actualiza Chrome o Edge: el navegador no admite descompresión local.");
    }
    let inflated;
    try {
      const stream=new Blob([packed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      inflated=new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      throw new Error("No se pudo descomprimir la hoja del Excel.");
    }
    if (inflated.length!==item.original) throw new Error("Tamaño ZIP descomprimido distinto del esperado.");
    return inflated;
  }
  return {has:(name)=>result.has(name),open};
}

function xmlRoot(source) {
  const doc=new DOMParser().parseFromString(source,"application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("XML de Excel mal formado.");
  return doc;
}
function descendants(node,name) {
  return [...node.getElementsByTagNameNS("*",name)];
}
function direct(node,name) {
  return [...node.children].find((child)=>child.localName===name) || null;
}
function contentText(node) {
  return descendants(node,"t").map((t)=>t.textContent).join("");
}
function normalizeText(value) {
  if(value===null||value===undefined) return null;
  const trimmed=String(value).trim();
  return trimmed||null;
}
function asDecimal(value) {
  const candidate=normalizeText(value);
  if(!candidate) return null;
  const numeric=Number(candidate.replace(",","."));
  return Number.isFinite(numeric)?numeric:null;
}

async function readOrderCells(zip) {
  const book=xmlRoot(decoder.decode(await zip.open("xl/workbook.xml")));
  const relations=xmlRoot(decoder.decode(await zip.open("xl/_rels/workbook.xml.rels")));
  const sheet=descendants(book,"sheet").find((x)=>x.getAttribute("name")===validSheet);
  if(!sheet) throw new Error('Plantilla no compatible: falta la hoja "HOJA PEDIDO".');
  const relId=sheet.getAttribute("r:id")||sheet.getAttributeNS(
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships","id");
  const rel=descendants(relations,"Relationship").find((x)=>x.getAttribute("Id")===relId);
  if(!rel) throw new Error("No se encontró la hoja de pedido dentro del libro.");
  const path=rel.getAttribute("Target")||"";
  const normalized=path.startsWith("/") ? path.replace(/^\/+/,"") : "xl/"+path;
  const parts=[];
  for(const part of normalized.split("/")) {
    if(part==="..") parts.pop();
    else if(part!==".") parts.push(part);
  }
  const filename=parts.join("/");
  if(!filename.startsWith("xl/worksheets/")) throw new Error("Ruta de hoja no admitida.");
  const sheetXml=xmlRoot(decoder.decode(await zip.open(filename)));

  let strings=[];
  if(zip.has("xl/sharedStrings.xml")) {
    const shared=xmlRoot(decoder.decode(await zip.open("xl/sharedStrings.xml")));
    strings=descendants(shared,"si").map(contentText);
  }
  const cells=new Map();
  const rowNumbers=new Set();
  for(const cell of descendants(sheetXml,"c")) {
    const coordinate=cell.getAttribute("r")||"";
    const match=/^([A-Z]+)(\d+)$/.exec(coordinate);
    if(!match) continue;
    const col=match[1], row=Number(match[2]);
    if(!["A","B","C","D","E","F","G","H"].includes(col) || row>4000) continue;
    let value=null;
    const cellType=cell.getAttribute("t")||"";
    const v=direct(cell,"v");
    if(cellType==="inlineStr") {
      const inline=direct(cell,"is");
      value=inline?contentText(inline):null;
    } else if(cellType==="s") {
      const pos=v?Number(v.textContent):NaN;
      value=Number.isInteger(pos)&&pos>=0&&pos<strings.length?strings[pos]:null;
    } else if(v) {
      const raw=v.textContent;
      value=cellType==="str"||cellType==="e"?raw:asDecimal(raw);
      if(value===null && cellType==="str") value=raw;
    }
    if(value!==null && value!==undefined) {
      cells.set(coordinate,value);
      rowNumbers.add(row);
    }
  }
  return {
    get(row,col) { return cells.get(col+String(row))??null; },
    rows:[...rowNumbers].sort((a,b)=>a-b),
    date1904:descendants(book,"workbookPr").some((x)=>x.getAttribute("date1904")==="1"),
  };
}
function findHeader(ws) {
  for(let row=1;row<=100;row++){
    const col=(ch)=>(normalizeText(ws.get(row,ch))||"").toUpperCase();
    if(col("B")!=="REFERENCIA"||col("C")!=="MATERIAL")continue;
    if(col("D")==="PVP" && col("E").includes("DTO")
       && col("F")==="PRECIO NETO" && col("G")==="PRECIO TOTAL") {
      return {row,unit_header:normalizeText(ws.get(row,"A")),pvp:"D",discounts:["E"],net:"F",total:"G",variant:"current"};
    }
    if(col("D")==="PRECIO"&&col("E").includes("DTO")&&col("F").includes("DTO")
       && col("G")==="PRECIO NETO"&&col("H")==="PRECIO TOTAL"){
      return {row,unit_header:normalizeText(ws.get(row,"A")),pvp:"D",discounts:["E","F"],net:"G",total:"H",variant:"legacy_two_discount"};
    }
  }
  throw new Error("No se encontró la tabla de líneas (REFERENCIA / MATERIAL / PVP / NETO).");
}
function labelValue(ws,...needles){
  for(let row=1;row<=80;row++){
    const label=normalizeText(ws.get(row,"A"));
    if(!label)continue;
    if(needles.some((needle)=>label.toUpperCase().includes(needle))) {
      return {value:ws.get(row,"C"),label};
    }
  }
  return {value:null,label:null};
}
function excelDate(value,book1904){
  if(typeof value==="number") {
    const epoch=Date.UTC(book1904?1904:1899,book1904?0:11,book1904?1:30);
    const date=new Date(epoch+Math.floor(value)*86400000);
    return Number.isFinite(date.getTime())?date.toISOString().slice(0,10):null;
  }
  const raw=normalizeText(value);if(!raw)return null;
  let m=/^(\d{2})[/-](\d{2})[/-](\d{2}|\d{4})$/.exec(raw);
  if(m){
    const year=m[3].length===2?2000+Number(m[3]):Number(m[3]);
    const date=new Date(Date.UTC(year,Number(m[2])-1,Number(m[1])));
    return date.getUTCDate()===Number(m[1])&&date.getUTCMonth()===Number(m[2])-1
      ?date.toISOString().slice(0,10):null;
  }
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
  return null;
}
function fold(value){
  return String(value||"").replace(/\n/g," ").trim().toUpperCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");
}
function normalizeReference(value){
  return String(value||"").trim().toUpperCase()
    .replace(/[‐‑‒–—−]/g,"-").replace(/\s+/g,"");
}
async function shaHex(data){
  const bytes=typeof data==="string"?new TextEncoder().encode(data):data;
  const hash=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
  return [...hash].map((v)=>v.toString(16).padStart(2,"0")).join("");
}
function classifyLine(reference,description){
  const ref=fold(reference),d=fold(description);
  const relevant=(pattern)=>pattern.test(d);
  if(["RAEE","RAE","ECOTASA","TASA"].includes(ref)||/\b(?:ECOTASA|RAEE)\b/.test(d))return {
    kind:"environmental_fee",confidence:0.995,reasons:["Referencia o descripción explícita de RAEE/ecotasa"],review:"auto"};
  if(["PORTES","PORT.","POR","PP","PORTES VENT.NAC","PORTES VENT.NAC."].includes(ref)
    ||/^PORTES?\b|\bGASTOS? DE? TRANSPORTE\b|\bTRANSPORTE NACIONAL\b|\bENVIO SOLICITADO POR FABRICA\b/.test(d))return {
    kind:"freight",confidence:0.99,reasons:["Referencia o descripción explícita de portes/transporte"],review:"auto"};
  if(/^SERVICIO DE\b|^PROYECTO (ELECTRICO|PCI|TECNICO)\b|^PUESTA EN MARCHA\b|\bINSPECCION REGLAMENTARIA\b|^EVALUACION DE RIESGOS\b|\bREALIZACION DE EMPALMES\b|\bREALIZACION DE FUSIONES\b/.test(d))return {
    kind:"service",confidence:0.97,reasons:["Descripción explícita de servicio profesional o ejecución"],review:"auto"};
  if(/^REPARACION\b|^SANEADO DE\b|\bCONFIGURACION\b/.test(d))return {
    kind:"service_candidate",confidence:0.80,reasons:["Descripción compatible con servicio, requiere revisión"],review:"pending"};
  return {kind:"unknown",confidence:0,reasons:[],review:"pending"};
}

export async function readProsoelXlsx(file){
  if(!file||!file.name.toLowerCase().endsWith(".xlsx"))throw new Error("Selecciona un único archivo .xlsx de pedido.");
  if(file.size<100 || file.size>15*MB)throw new Error("El Excel debe tener menos de 15 MB.");
  const buffer=await file.arrayBuffer();
  const zip=zipIndex(buffer);
  const ws=await readOrderCells(zip);
  const header=findHeader(ws);
  const warnings=[];
  const lines=[];
  for(const row of ws.rows){
    if(row<=header.row)continue;
    const qty=asDecimal(ws.get(row,"A")), desc=normalizeText(ws.get(row,"C"));
    if(qty===null||!desc)continue;
    const reference=normalizeText(ws.get(row,"B"));
    const discounts=header.discounts.map((ch)=>normalizeText(ws.get(row,ch))).filter((d)=>d!==null);
    const net=asDecimal(ws.get(row,header.net));
    const total=asDecimal(ws.get(row,header.total));
    const pvp=asDecimal(ws.get(row,header.pvp));
    const type=classifyLine(reference,desc);
    const status=net===null||total===null?"incomplete":Math.abs(Math.round(qty*net*100)/100-Math.round(total*100)/100)<=0.0100001?"valid":"mismatch";
    if(status!=="valid")warnings.push("Fila "+row+": precio "+(status==="incomplete"?"incompleto":"no cuadra con cantidad × neto")+".");
    lines.push({
      source_row:row,line_number:lines.length+1,quantity:String(qty),
      supplier_reference:reference,description_original:desc,
      pvp:pvp===null?null:String(pvp),
      discount_raw:discounts.length?discounts.join(" | "):null,
      discount_components_raw:discounts,
      net_unit_price:net===null?null:String(net),
      total_price:total===null?null:String(total),
      price_validation_status:status,line_kind:type.kind,
      line_kind_confidence:type.confidence,line_kind_reasons:type.reasons,
      line_kind_review_status:type.review,
      commercial_variant_key:await shaHex((reference?normalizeReference(reference):"<NO_REFERENCE>")+"\x1f"+fold(desc)),
    });
  }
  if(lines.length<1||lines.length>250)throw new Error("El pedido debe contener de 1 a 250 líneas con cantidad y descripción.");
  const get=(...names)=>normalizeText(labelValue(ws,...names).value);
  const referenceRow=labelValue(ws,"REFERENCIA PEDIDO","Nº PEDIDO","N° PEDIDO","N. PEDIDO");
  const internalNumber=normalizeText(referenceRow.value);
  const worksheetYear=(referenceRow.label||"").match(/([0-9]{2})\s*\//);
  const prefix=worksheetYear?worksheetYear[1]:null;
  const reference=internalNumber?(prefix?prefix+"/"+internalNumber:internalNumber):null;
  const order_date=excelDate(labelValue(ws,"FECHA:").value,ws.date1904);
  if(!order_date)throw new Error("No se ha podido leer la fecha de pedido en la hoja.");
  const year=Number(order_date.slice(0,4));
  const supplier=get("ALMACÉN:");
  if(!supplier)throw new Error("El pedido no contiene un almacén/proveedor reconocible.");
  const fromFile=/\bPEDIDO\b\s*-?\s*(\d+)(?:\s*[.-]\s*(\d+))?/i.exec(file.name);
  const fromSheet=internalNumber?parseInt((internalNumber.match(/\d+/)||[])[0],10):null;
  const num=fromFile?Number(fromFile[1]):fromSheet;
  const sub=fromFile&&fromFile[2]?fromFile[2]:null;
  if(!Number.isInteger(num)||num<1)throw new Error("No se reconoce el número de pedido del nombre o de la hoja.");
  const mismatch=(fromFile&&Number.isInteger(fromSheet)&&fromSheet!==num)
    ||(prefix&&2000+Number(prefix)!==year);
  if(mismatch)warnings.push("Hay diferencias entre nombre de archivo, número interno o año; revisa la identidad antes de importar.");
  if(lines.some((l)=>l.line_kind!=="unknown"))warnings.push("Hay conceptos clasificados como tasas, portes o servicios: se conservarán en el pedido, separados del catálogo.");
  const declared=asDecimal(labelValue(ws,"IMPORTE PEDIDO").value);
  const calculated=lines.reduce((acc,l)=>acc+(l.total_price===null?0:Number(l.total_price)),0);
  const incomplete=lines.some((l)=>l.net_unit_price===null||l.total_price===null);
  const totalStatus=incomplete?"incomplete_prices":declared!==null&&Math.abs(Math.round(calculated*100)/100-Math.round(declared*100)/100)<=0.0100001?"valid":"total_mismatch";
  if(totalStatus!=="valid")warnings.push(totalStatus==="total_mismatch"?"La suma de líneas difiere del importe del pedido.":"Hay precios incompletos.");
  const payload={
    source_sha256:await shaHex(buffer),source_filename:file.name,
    order_reference:reference,order_year:year,order_number:num,order_subnumber:sub,
    order_identity_source:fromFile?"filename":"worksheet",
    order_identity_status:mismatch?"conflict":"verified_candidate",
    order_date,responsible:get("RESPONSABLE OFICINA"),supplier,
    supplier_contact:get("CONTACTO:"),supplier_email:get("MAIL CONTACTO:"),
    project:get("REFERENCIA AUX OBRA","REFERENCIA OBRA"),
    project_address:get("DIRECCIÓN MATERIAL"),project_contact:get("PERSONA CONTACTO"),
    declared_total:declared===null?null:String(declared),
    unit_header:header.unit_header,template_variant:header.variant,
    internal_order_reference:reference,validation_status:totalStatus,
    lines,
  };
  return {payload,warnings,computedTotal:calculated};
}
