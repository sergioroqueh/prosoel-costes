import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const js = read("app/static/tracking.js");
const html = read("app/static/index.html");
const exportSrc = read("app/static/tracking_export.js");
const moduleUrl = "data:text/javascript;base64," + Buffer.from(exportSrc).toString("base64");
const {buildTrackingClaimGroups, safeTrackingSheetNames} = await import(moduleUrl);
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
  assert.match(exportSrc,/xlsx-0\.20\.3\/package\/xlsx\.mjs/);
  assert.match(exportSrc,/bookType:"xlsx"/);
  assert.match(exportSrc,/URL\.createObjectURL\(blob\)/);
  assert.doesNotMatch(exportSrc,/\.from\(|\.insert\(|\.update\(|functions\.invoke|fetch\(/);
  assert.match(html,/Exportar reclamación Excel/);
});
