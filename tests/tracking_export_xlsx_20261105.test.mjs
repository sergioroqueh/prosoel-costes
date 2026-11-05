import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const js = read("app/static/tracking.js");
const html = read("app/static/index.html");
const exportSrc = read("app/static/tracking_export.js");
const moduleUrl = "data:text/javascript;base64," + Buffer.from(exportSrc).toString("base64");
const {buildTrackingClaimGroups, safeTrackingSheetNames, styleTrackingClaimsWorksheet, trackingQuantityNumberFormat} = await import(moduleUrl);
const opts = {
  isDelivered:line => Boolean(line.source_green && line.source_si && line.drive_line_finalized),
  interpretObservation:(raw, requested) => {
    if(!raw)return {kind:"none"};
    const m=String(raw).match(/^(\d+)\s*ud$/i);
    return m && Number(m[1])<=requested
      ? {kind:"probable", received:Number(m[1])}
      : {kind:"review"};
  },
  workName:id => ({a:"GOMENDIO",b:"BAYON Y AZA"}[id]||id),
  prettyDate:s=>s
};
const order = (overrides={}) => ({
  id:1,source_id:"a",order_reference:"26/779",order_date:"2026-10-10",
  supplier:"RIAS",_state:"open",lines:[],...overrides
});
const line = (overrides={}) => ({
  reference:"CR50",description:"Tubo Aiscan CR50",requested_qty:200,
  source_green:false,source_si:false,drive_line_finalized:false,
  observations:"",albaran:"",...overrides
});

test("El botón y la descarga comparten los filtros activos de las tarjetas",()=>{
  assert.match(html,/id="trackingExport" disabled/);
  assert.match(html,/id="trackingExportStatus"/);
  assert.match(js,/const visible=visibleTrackingOrders\(current\);/);
  assert.match(js,/const visible=visibleTrackingOrders\(currentTrackingOrders\(\)\);/);
  assert.match(js,/const shown=visible\.slice\(0,300\)/);
  assert.match(js,/if\(supplier\.value && o\.supplier!==supplier\.value\)return false/);
  assert.match(js,/if\(project\.value && o\.source_id!==project\.value\)return false/);
  assert.match(js,/if\(state\.value==="closed"/);
  assert.match(js,/exportButton\.disabled=busy\|\|viewMode!=="queue"\|\|!pending/);
});

test("Exporta materiales pendientes de pedidos abiertos, nunca recibidos ni cerrados",()=>{
  const groups=buildTrackingClaimGroups([
    order({lines:[line(),line({reference:"R",source_green:true,source_si:true,drive_line_finalized:true})]}),
    order({id:2,_state:"closed_manual",lines:[line({reference:"C"})]}),
    order({id:3,supplier:"JARAMA",source_id:"b",order_reference:"26/776",lines:[line({reference:"T"})]})
  ],opts);
  assert.deepEqual(groups.map(g=>g.supplier),["JARAMA","RIAS"]);
  assert.equal(groups[0].rows.length,1);
  assert.equal(groups[1].rows.length,1);
  assert.equal(groups[1].rows[0][3],"CR50");
  assert.equal(groups[1].rows[0][5],200);
  assert.equal(groups[1].rows[0][6],200);
});

test("No presenta restos inciertos como cantidades confirmadas",()=>{
  const groups=buildTrackingClaimGroups([order({lines:[
    line({reference:"PARCIAL",observations:"179 ud"}),
    line({reference:"DUDOSA",observations:"Revisar recibidas"}),
    line({reference:"VERDE",source_green:true,source_si:false})
  ]})],opts);
  const rows=groups[0].rows;
  assert.equal(rows[0][6],21);
  assert.match(rows[0][7],/NO CONFIRMADO/);
  assert.equal(rows[1][6],"");
  assert.match(rows[1][7],/REVISAR ANTES DE RECLAMAR/);
  assert.equal(rows[2][6],"");
  assert.match(rows[2][7],/Marca verde sin SI/);
});

test("Los nombres de pestaña Excel no colisionan ni exceden 31 caracteres",()=>{
  const names=safeTrackingSheetNames([
    {supplier:"Almacén/Electricidad: Muy largo Acabado"},
    {supplier:"Almacén/Electricidad: Muy largo Acabado"},
    {supplier:"A[]/?*:B"}
  ]);
  assert.equal(new Set(names).size,3);
  assert.ok(names.every(x=>x.length<=31 && !/[\\/?*\[\]:]/.test(x)));
});

test("La exportación es XLSX local y no altera pedidos ni requiere nuevos permisos",()=>{
  assert.match(exportSrc,/xlsx-js-style@1\.2\.0\/dist\/xlsx\.min\.js/);
  assert.match(exportSrc,/bookType:"xlsx"/);
  assert.match(exportSrc,/URL\.createObjectURL\(blob\)/);
  assert.doesNotMatch(exportSrc,/\.from\(|\.insert\(|\.update\(|functions\.invoke|fetch\(/);
  assert.match(html,/Exportar en Excel/);
});


test("El encabezado Pendiente mantiene el índice de columna G y el aviso de parciales",()=>{
  assert.match(exportSrc,/"Cantidad solicitada", "Pendiente", "Estado \/ observaciones"/);
  assert.doesNotMatch(exportSrc,/"Pendiente orientativo"/);
  assert.match(exportSrc,/DATOS PARA REVISAR: las cantidades parciales son orientativas/);
});

test("Estilos corporativos PROSOEL visibles y alternos en las celdas del XLSX",()=>{
  const ws={};
  const rows=[
    ["26/779","10/10/2026","GOMENDIO","CR50","Tubo Aiscan CR50",200,21,
      "POSIBLE RESTO, NO CONFIRMADO",""],
    ["26/779","10/10/2026","GOMENDIO","CR40","Tubo",80,"",
      "Sin recepción confirmada",""]
  ];
  styleTrackingClaimsWorksheet(ws,rows);
  assert.equal(ws.A1.s.fill.fgColor.rgb,"0B2342");
  assert.equal(ws.A1.s.font.color.rgb,"FFFFFF");
  assert.equal(ws.A6.s.fill.fgColor.rgb,"0B2342");
  assert.equal(ws.A6.s.border.bottom.color.rgb,"E86C38");
  assert.equal(ws.G7.s.fill.fgColor.rgb,"FFF7ED");
  assert.equal(ws.G7.s.font.bold,true);
  assert.equal(ws.H7.s.fill.fgColor.rgb,"FFF3DE");
  assert.equal(ws.A7.s.border.left.color.rgb,"E86C38");
  assert.equal(ws.B8.s.fill.fgColor.rgb,"F3F8FB");
  assert.equal(ws.A10.s.fill.fgColor.rgb,"E9F2F7");
  assert.equal(ws["!rows"].length,10);
});

test("El resto del flujo de exportación continúa descargando un XLSX local",()=>{
  assert.match(exportSrc,/const XLSX = await loadStyledXlsx\(\)/);
  assert.match(exportSrc,/XLSX\.utils\.aoa_to_sheet\(table\)/);
  assert.match(exportSrc,/XLSX\.write\(workbook/);
  assert.match(exportSrc,/styleTrackingClaimsWorksheet\(ws,group\.rows\)/);
  assert.match(exportSrc,/ws\["!autofilter"\]/);
});

test("Enteros sin coma final, cantidades decimales conservadas",()=>{
  assert.equal(trackingQuantityNumberFormat(2),"#,##0");
  assert.equal(trackingQuantityNumberFormat(0),"#,##0");
  assert.equal(trackingQuantityNumberFormat(1000),"#,##0");
  assert.equal(trackingQuantityNumberFormat(2.5),"#,##0.0");
  assert.equal(trackingQuantityNumberFormat(2.75),"#,##0.00");
  assert.equal(trackingQuantityNumberFormat(0.125),"#,##0.000");
  const ws={};
  styleTrackingClaimsWorksheet(ws,[
    ["26/1","2026-11-05","Obra","REF","Material",2,2,"",""],
    ["26/2","2026-11-05","Obra","REF2","Material",2.5,0.125,"",""]
  ]);
  assert.equal(ws.F7.s.numFmt,"#,##0");
  assert.equal(ws.G7.s.numFmt,"#,##0");
  assert.equal(ws.F8.s.numFmt,"#,##0.0");
  assert.equal(ws.G8.s.numFmt,"#,##0.000");
});
