import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";
import { XMLParser } from "npm:fast-xml-parser@4.5.3";

// OOXML reader (strict): keeps per-line green fill + merged FINALIZADO SI.
// This module never writes to Drive or Supabase and never interprets free-text notes as delivery proof.
const parser=new XMLParser({
  ignoreAttributes:false, attributeNamePrefix:"@_", textNodeName:"#text",
  parseTagValue:false, parseAttributeValue:false, trimValues:false, removeNSPrefix:true
});
const items=x=>x===undefined||x===null?[]:Array.isArray(x)?x:[x];
const val=x=>x===undefined||x===null?"":typeof x==="object"?String(x["#text"]??""):String(x);
const GREEN=new Set(["FFD9EAD3","FF92D050","FF93C47D","FF00B050"]);
function fail(msg){throw new Error("xlsx_"+msg);}
function excelDate(raw){
  if(raw===null||raw===undefined||raw==="")return null;
  if(/^\d{4}-\d{2}-\d{2}/.test(String(raw)))return String(raw).slice(0,10);
  const days=Number(raw);
  if(!Number.isFinite(days)||days<30000||days>80000)return null;
  return new Date(Date.UTC(1899,11,30)+Math.trunc(days)*86400000).toISOString().slice(0,10);
}
function refCol(ref){return String(ref||"").match(/^[A-Z]+/)?.[0]||"";}
function cellText(node,ss){
  if(!node)return "";
  if(node["@_t"]==="inlineStr")return val(node.is?.t)||items(node.is?.r).map(r=>val(r.t)).join("");
  const value=val(node.v);
  if(node["@_t"]==="s") {
    const i=Number(value);
    if(!Number.isInteger(i)||i<0||i>=ss.length)fail("invalid_shared_string_index");
    return ss[i];
  }
  return value;
}
function sharedText(si){
  if(si.t!==undefined)return val(si.t);
  return items(si.r).map(x=>val(x.t)).join("");
}
function normalizeRef(raw){
  const t=String(raw||"").trim();
  if(!t)return "";
  // String cells may contain meaningful leading zeros (e.g. albarán 038750).
  // Scientific-notation numeric cells are normalized separately below.
  if(/^0\d+$/.test(t)) return t;
  if(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(t)) {
    const n=Number(t);
    if(Number.isSafeInteger(n))return String(n);
  }
  return t;
}
function dateOrNull(node,ss){return excelDate(cellText(node,ss));}
function parseWorkbookEntry(bytes,path){
  const xml=bytes[path];
  if(!xml)fail("missing_"+path.replace(/[^a-z0-9]/gi,"_"));
  return parser.parse(strFromU8(xml));
}
export function readPedidosXlsx(buffer){
  if(buffer.byteLength>12_000_000)fail("file_too_large");
  let files;
  try{files=unzipSync(new Uint8Array(buffer));}catch{fail("invalid_zip");}
  const workbook=parseWorkbookEntry(files,"xl/workbook.xml");
  const sheetNames=items(workbook.workbook?.sheets?.sheet).map(s=>s["@_name"]);
  if(sheetNames.length!==1||sheetNames[0]!=="PEDIDOS")fail("unexpected_sheet_structure");
  // Existing approved pilot has the sole PEDIDOS worksheet as sheet1.xml.
  // Reject other layouts until explicitly validated; never guess a worksheet.
  const sheet=parseWorkbookEntry(files,"xl/worksheets/sheet1.xml").worksheet;
  if(!sheet)fail("worksheet_not_found");
  const strings=files["xl/sharedStrings.xml"]?
    items(parseWorkbookEntry(files,"xl/sharedStrings.xml").sst?.si).map(sharedText):[];
  const styles=parseWorkbookEntry(files,"xl/styles.xml").styleSheet;
  const fillList=items(styles?.fills?.fill);
  const xfList=items(styles?.cellXfs?.xf);
  const greenFillIds=new Set();
  for(let i=0;i<fillList.length;i++){
    const color=String(fillList[i]?.patternFill?.fgColor?.["@_rgb"]||"").toUpperCase();
    if(GREEN.has(color))greenFillIds.add(i);
  }
  if(!greenFillIds.size)fail("green_fill_missing");
  const getIsGreen=c=>{
    if(!c)return false;
    const style=xfList[Number(c["@_s"]||0)];
    const fill=Number(style?.["@_fillId"]??0);
    return greenFillIds.has(fill);
  };
  const rowMap=new Map();
  for(const r of items(sheet.sheetData?.row)){
    const rowNum=Number(r["@_r"]);
    if(!Number.isInteger(rowNum))continue;
    const cells=new Map();
    for(const c of items(r.c)){
      const col=refCol(c["@_r"]);if(col)cells.set(col,c);
    }
    rowMap.set(rowNum,cells);
  }
  const read=(n,col)=>cellText(rowMap.get(n)?.get(col),strings).trim();
  if(read(2,"M").toUpperCase()!=="FINALIZADO" ||
     read(2,"H").toUpperCase()!=="CONCEPTO" ||
     read(2,"F").toUpperCase()!=="UDS.")fail("unexpected_headers");

  const mergedSi=new Map();
  for(const m of items(sheet.mergeCells?.mergeCell)){
    const match=String(m["@_ref"]||"").match(/^M(\d+):M(\d+)$/i);
    if(!match)continue;
    const from=Number(match[1]),to=Number(match[2]);
    if(to<from||to-from>1000)fail("bad_merged_status");
    const status=read(from,"M").toUpperCase();
    if(status!=="SI")continue;
    for(let row=from;row<=to;row++) {
      if(mergedSi.has(row))fail("overlapping_status_merges");
      mergedSi.set(row,true);
    }
  }
  const allRows=[...rowMap.keys()].sort((a,b)=>a-b);
  const orders=[];let current=null;
  for(const row of allRows){
    if(row<3)continue;
    const id=read(row,"A");
    if(/^\d{2}\/\d{1,5}(?:\.\d{1,3})?(?:-[A-Za-z0-9]+)?$/.test(id)) {
      const date=dateOrNull(rowMap.get(row)?.get("B"),strings);
      if(!date)fail("missing_order_date_"+row);
      current={source_row:row,order_reference:id,order_date:date,
        supplier:read(row,"C"),responsible:read(row,"D"),
        delivery_location:read(row,"E"),drive_finalized:false,
        reception_date:null,lines:[]};
      orders.push(current);
    } else if(id && /^\d{2}\//.test(id)) {
      fail("unrecognized_order_reference_"+row);
    }
    if(!current)continue;
    const description=read(row,"H");
    const qtyText=read(row,"F");
    if(!description||!qtyText)continue;
    // Only literal unit labels with unambiguous numeric quantities are normalized.
    // Never infer package sizes, e.g. "2 cajas (24)" remains blocked for review.
    const unitMatch=qtyText.match(/^(\d+(?:[.,]\d+)?)\s*(?:ud(?:s)?\.?|unidad(?:es)?\.?)$/i);
    const qty=Number((unitMatch?unitMatch[1]:qtyText).replace(",","."));
    if(!Number.isFinite(qty)||qty<0)fail("invalid_quantity_"+row);
    const lineSi=read(row,"M").toUpperCase()==="SI" || mergedSi.get(row)===true;
    const green=getIsGreen(rowMap.get(row)?.get("H"));
    const line={source_row:row,reference:normalizeRef(read(row,"G")),
      description,requested_qty:qty,albaran:normalizeRef(read(row,"J")),
      observations:read(row,"K"),
      source_green:green,source_si:lineSi,drive_line_finalized:green&&lineSi};
    current.lines.push(line);
    const rec=dateOrNull(rowMap.get(row)?.get("L"),strings);
    if(rec)current.reception_date=rec;
  }
  for(const o of orders) {
    if(!o.lines.length)fail("order_without_lines_"+o.source_row);
    o.drive_finalized=o.lines.every(l=>l.drive_line_finalized);
  }
  if(!orders.length)fail("no_orders");
  if(orders.length>20000)fail("too_many_orders");
  const rowCount=orders.reduce((n,o)=>n+o.lines.length,0);
  if(rowCount>120000)fail("too_many_lines");
  return {orders,summary:{
    orders:orders.length,lines:rowCount,
    completed:orders.filter(o=>o.drive_finalized).length,
    partial:orders.filter(o=>!o.drive_finalized&&o.lines.some(l=>l.drive_line_finalized)).length,
    noneReceived:orders.filter(o=>o.lines.every(l=>!l.drive_line_finalized)).length,
    received:orders.reduce((n,o)=>n+o.lines.filter(l=>l.drive_line_finalized).length,0)
  }};
}

export function compareSource(orders,existingOrders,existingLines){
  // First pass must be zero-change for the already imported pilot.
  // When rows move, report a structural change rather than silently overwriting a manual closure.
  const indexed=new Map(existingOrders.map(o=>[o.order_reference,o]));
  const linesByOrder=new Map();
  for(const line of existingLines) {
    if(!linesByOrder.has(line.order_id))linesByOrder.set(line.order_id,[]);
    linesByOrder.get(line.order_id).push(line);
  }
  const counters={new_orders:0,removed_orders:0,new_lines:0,
    missing_lines:0,row_moved:0,changed_status:0,changed_quantity:0,
    changed_reference:0,changed_observations:0,changed_albarans:0};
  const examples=[];
  const seen=new Set();
  for(const order of orders){
    if(seen.has(order.order_reference))fail("duplicate_order_reference");
    seen.add(order.order_reference);
    const known=indexed.get(order.order_reference);
    if(!known){counters.new_orders++;if(examples.length<8)examples.push(order.order_reference+" nuevo");continue;}
    if(Number(known.source_row)!==order.source_row)counters.row_moved++;
    const oldLines=(linesByOrder.get(known.id)||[]).sort((a,b)=>a.source_row-b.source_row);
    const nowLines=order.lines;
    if(oldLines.length!==nowLines.length){
      if(nowLines.length>oldLines.length)counters.new_lines+=nowLines.length-oldLines.length;
      else counters.missing_lines+=oldLines.length-nowLines.length;
    }
    // Compare by stable reference + description + occurrence index; never infer identity only by Excel row.
    const sig=l=>String(l.reference||"").toUpperCase()+"|"+String(l.description||"").trim().toUpperCase();
    const oldBySig=new Map();
    for(const l of oldLines){
      const k=sig(l);if(!oldBySig.has(k))oldBySig.set(k,[]);
      oldBySig.get(k).push(l);
    }
    for(const n of nowLines){
      const prev=oldBySig.get(sig(n))?.shift();
      if(!prev){counters.changed_reference++;continue;}
      if(Number(prev.source_row)!==n.source_row)counters.row_moved++;
      if(Boolean(prev.drive_line_finalized)!==n.drive_line_finalized)counters.changed_status++;
      if(Number(prev.requested_qty)!==n.requested_qty)counters.changed_quantity++;
      if(String(prev.observations||"")!==n.observations)counters.changed_observations++;
      if(String(prev.albaran||"")!==n.albaran)counters.changed_albarans++;
    }
  }
  for(const known of existingOrders)if(!seen.has(known.order_reference))counters.removed_orders++;
  return {counts:counters,examples,requires_review:
    counters.row_moved>0||counters.missing_lines>0||counters.changed_reference>0||
    counters.removed_orders>0||counters.changed_albarans>20};
}


/**
 * Conservative legacy reader. Returns ONLY fully trustworthy orders on/after the
 * selected order DATE. Ambiguous orders and materials are quarantined as complete
 * review records, never partially treated as finished or pending.
 * This intentionally does not interpret all historical orders in the workbook.
 */
export function readLegacyRecentXlsx(buffer,fromDate="2026-07-01") {
  if (!/^\d{4}-\d\d-\d\d$/.test(fromDate)) fail("invalid_cutoff_date");
  if (buffer.byteLength > 12_000_000) fail("file_too_large");
  let files;
  try { files=unzipSync(new Uint8Array(buffer)); } catch { fail("invalid_zip"); }
  const wb=parseWorkbookEntry(files,"xl/workbook.xml");
  const sheets=items(wb.workbook?.sheets?.sheet);
  const rels=files["xl/_rels/workbook.xml.rels"]?
    items(parseWorkbookEntry(files,"xl/_rels/workbook.xml.rels").Relationships?.Relationship):[];
  const relationships=new Map(rels.map(x=>[String(x["@_Id"]||""),String(x["@_Target"]||"")]));
  const shared=files["xl/sharedStrings.xml"]?
    items(parseWorkbookEntry(files,"xl/sharedStrings.xml").sst?.si).map(sharedText):[];
  const style=parseWorkbookEntry(files,"xl/styles.xml").styleSheet;
  const xfList=items(style?.cellXfs?.xf),fills=items(style?.fills?.fill);
  const greenFills=new Set();
  for(let i=0;i<fills.length;i++) {
    const rgb=String(fills[i]?.patternFill?.fgColor?.["@_rgb"]||"").toUpperCase();
    if(GREEN.has(rgb))greenFills.add(i);
  }
  if(!greenFills.size) fail("green_fill_missing");
  const isGreen=node=>{
    if(!node)return false;
    const xf=xfList[Number(node["@_s"]||0)];
    return greenFills.has(Number(xf?.["@_fillId"]||0));
  };
  const candidates=[];
  const inspected=[];
  for(let i=0;i<sheets.length;i++){
    const name=String(sheets[i]["@_name"]||"");
    const rid=String(sheets[i]["@_r:id"]||sheets[i]["@_id"]||"");
    let target=relationships.get(rid)||("worksheets/sheet"+(i+1)+".xml");
    target=target.replace(/^\/+/,"").replace(/^xl\//,"");
    // Only worksheet targets inside the XLSX package are accepted.
    if(target.includes("..")||!target.startsWith("worksheets/"))continue;
    const path="xl/"+target;
    if(!files[path])continue;
    const sheet=parseWorkbookEntry(files,path).worksheet;
    const rows=new Map();
    for(const row of items(sheet?.sheetData?.row)){
      const n=Number(row["@_r"]);
      if(!Number.isInteger(n)||n<1)continue;
      const cells=new Map();
      for(const node of items(row.c)){
        const col=refCol(node["@_r"]);if(col)cells.set(col,node);
      }
      rows.set(n,cells);
    }
    const read=(n,c)=>cellText(rows.get(n)?.get(c),shared).trim();
    const normalized=x=>x.toUpperCase().replace(/[\s.]+/g," ").trim();
    const headerOK=normalized(read(2,"M"))==="FINALIZADO" &&
      normalized(read(2,"H"))==="CONCEPTO" && /^UDS/.test(normalized(read(2,"F")));
    inspected.push({sheet:name,header_ok:headerOK});
    if(headerOK)candidates.push({name,rows,read,sheet});
  }
  // Books can have a separate archival worksheet. It is safe to choose
  // PEDIDOS only when ALL other valid worksheets are explicitly archived and
  // none of those archived sheets contains a July 2026+ dated order.
  let chosen=null;
  if(candidates.length===1)chosen=candidates[0];
  else if(candidates.length>1) {
    const main=candidates.filter(s=>s.name.trim().toUpperCase()==="PEDIDOS");
    const secondary=candidates.filter(s=>s!==main[0]);
    const allArchived=secondary.every(s=>/ANTIGU[OA]S?/.test(s.name.toUpperCase()));
    const recentElsewhere=secondary.some(s=>[...s.rows.keys()].some(n=>{
      if(n<3)return false;
      const date=dateOrNull(s.rows.get(n)?.get("B"),shared);
      return date!==null && date>=fromDate &&
        (/^\\d{2}\\//.test(s.read(n,"A")) || Boolean(s.read(n,"H")));
    }));
    if(main.length===1&&allArchived&&!recentElsewhere)chosen=main[0];
    else return {compatible:false,reason:recentElsewhere?
      "recent_orders_in_secondary_sheet":"legacy_multiple_pedidos_sheets",
      sheet_check:inspected,summary:null,orders:[],review:[]};
  }
  if(!chosen) {
    return {compatible:false,reason:"legacy_no_valid_pedidos_sheet",
      sheet_check:inspected,summary:null,orders:[],review:[]};
  }
  const {name:sheetName,rows,read,sheet}=chosen;
  const siMerged=new Set();
  for(const merge of items(sheet?.mergeCells?.mergeCell)){
    const m=String(merge["@_ref"]||"").match(/^M(\d+):M(\d+)$/);
    if(!m)continue;
    const a=Number(m[1]),b=Number(m[2]);
    if(b<a||b-a>1000)fail("bad_merged_status");
    if(read(a,"M").toUpperCase()!=="SI")continue;
    for(let i=a;i<=b;i++)siMerged.add(i);
  }
  const rowNos=[...rows.keys()].sort((a,b)=>a-b);
  const validRef=/^\d{2}\/\d{1,5}(?:\.\d{1,3})?(?:-[A-Za-z0-9]+)?$/;
  const quantity=/^(\d+(?:[.,]\d+)?)(?:\s*(?:ud(?:s)?\.?|unidad(?:es)?\.?))?$/i;
  const all=[],review=[];
  let active=null,mostRecentStart=Infinity;
  for(const n of rowNos) {
    if(n<3)continue;
    const id=read(n,"A"),dateRaw=read(n,"B");
    const parsedDate=dateOrNull(rows.get(n)?.get("B"),shared);
    const newOrder=validRef.test(id);
    const maybeOrder=/^\d{2}\//.test(id);
    if(newOrder||maybeOrder||(dateRaw && !id && read(n,"C") && read(n,"H"))) {
      active=null;
      if(parsedDate && parsedDate>=fromDate) {
        mostRecentStart=Math.min(mostRecentStart,n);
        if(newOrder){
          active={source_row:n,order_reference:id,order_date:parsedDate,
            supplier:read(n,"C"),responsible:read(n,"D"),
            delivery_location:read(n,"E"),drive_finalized:false,
            reception_date:null,lines:[],_issues:[],sheet_name:sheetName};
          all.push(active);
        } else {
          review.push({source_row:n,order_reference:id||null,order_date:parsedDate,
            reason:newOrder?"unknown":"missing_or_malformed_order_reference",
            raw_date:dateRaw,source_sheet:sheetName,lines:[]});
        }
      } else if(dateRaw && !parsedDate){
        review.push({source_row:n,order_reference:id||null,order_date:null,
          reason:"unparseable_order_date",raw_date:dateRaw,source_sheet:sheetName,lines:[]});
      }
    }
    if(!active)continue;
    const description=read(n,"H"),qRaw=read(n,"F");
    if(!description && !qRaw)continue;
    if(!description){active._issues.push({source_row:n,reason:"missing_description",qty_raw:qRaw});continue;}
    const m=qRaw.match(quantity);
    const qty=m?Number(m[1].replace(",",".")):null;
    if(qty===null||!Number.isFinite(qty)||qty<0){
      active._issues.push({source_row:n,reason:"ambiguous_quantity",qty_raw:qRaw,
        description,reference:read(n,"G")});
      continue;
    }
    const si=read(n,"M").toUpperCase()==="SI"||siMerged.has(n);
    const green=isGreen(rows.get(n)?.get("H"));
    active.lines.push({source_row:n,reference:normalizeRef(read(n,"G")),description,
      requested_qty:qty,albaran:normalizeRef(read(n,"J")),
      observations:read(n,"K"),source_green:green,source_si:si,
      drive_line_finalized:green&&si});
    const receipt=dateOrNull(rows.get(n)?.get("L"),shared);
    if(receipt)active.reception_date=receipt;
  }
  const accepted=[];
  const refCounts=new Map();
  for(const order of all)refCounts.set(order.order_reference,(refCounts.get(order.order_reference)||0)+1);
  for(const order of all){
    if(refCounts.get(order.order_reference)>1)order._issues.push({
      source_row:order.source_row,reason:"duplicate_order_reference"});
    if(!order.lines.length)order._issues.push({
      source_row:order.source_row,reason:"order_without_materials"});
    order.drive_finalized=order.lines.length>0&&order.lines.every(x=>x.drive_line_finalized);
    if(order._issues.length){
      review.push({source_row:order.source_row,order_reference:order.order_reference,
        order_date:order.order_date,reason:"order_contains_ambiguous_lines",
        raw_date:order.order_date,source_sheet:sheetName,lines:order.lines,
        issues:order._issues});
    }else{
      const {_issues,sheet_name,...safe}=order;
      accepted.push(safe);
    }
  }
  // A bad date at an earlier row is almost certainly historical.
  const relevantReview=review.filter(x=>
    (x.order_date && x.order_date>=fromDate)||
    (!x.order_date && x.source_row>=mostRecentStart));
  const countLines=accepted.reduce((n,o)=>n+o.lines.length,0);
  return {compatible:true,source_sheet:sheetName,cutoff:fromDate,orders:accepted,
    review:relevantReview,
    summary:{
      recent_orders:all.length,accepted_orders:accepted.length,
      quarantined_orders:all.length-accepted.length,
      review_records:relevantReview.length,
      lines:countLines,
      received:accepted.reduce((n,o)=>n+o.lines.filter(l=>l.drive_line_finalized).length,0),
      completed:accepted.filter(o=>o.drive_finalized).length,
      partial:accepted.filter(o=>!o.drive_finalized&&o.lines.some(l=>l.drive_line_finalized)).length,
      noneReceived:accepted.filter(o=>o.lines.every(l=>!l.drive_line_finalized)).length
    }};
}
