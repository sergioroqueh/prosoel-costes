// Recuperación de ofertas históricas, exclusivamente con los XLSX originales.
// Los ZIP y XLSX se procesan en el navegador; nunca se envían a Supabase.
// Solo se envían registros metadato de oferta tras confirmación del administrador.
import {zipIndex, readSupplierOfferFromXlsxBytes} from "./order_import.js?v=20261026-recovery-v1";

export function normalizedSourceName(value) {
  return String(value??"").replaceAll("\\","/").split("/").at(-1).normalize("NFC").trim().toLocaleLowerCase("es");
}

export function shaHex(bytes) {
  return crypto.subtle.digest("SHA-256", bytes).then(array =>
    [...new Uint8Array(array)].map(x=>x.toString(16).padStart(2,"0")).join(""));
}

export async function fetchOriginalOrderIndex(client) {
  const rows = [];
  for(let start=0; ;start+=1000) {
    const response=await client.from("orders")
      .select("id,order_reference,source_sha256,source_filename,supplier_offer_reference")
      .order("id",{ascending:true})
      .range(start,start+999);
    if(response.error) throw response.error;
    const page=response.data||[];
    rows.push(...page);
    if(page.length<1000)break;
    if(rows.length>50000)throw new Error("Demasiados pedidos para esta herramienta.");
  }
  const byHash=new Map();
  for(const order of rows) {
    const key=String(order.source_sha256??"").trim().toLowerCase();
    if(!/^[a-f0-9]{64}$/.test(key))continue;
    if(!byHash.has(key))byHash.set(key,[]);
    byHash.get(key).push(order);
  }
  return {rows,byHash};
}

export async function scanOriginalArchives(files,index,onProgress) {
  const all=[...files];
  if(all.length<1||all.length>4)throw new Error("Selecciona entre 1 y 4 archivos ZIP de pedidos.");
  const result={processed:0,hashVerified:0,offers:[],incidents:[],noOffer:0,
    unmatched:0,already:0,nonXlsx:0,totalXlsx:0,failed:0};
  const identifiedOrders=new Set();
  for(const file of all) {
    if(!/\.zip$/i.test(file.name)||file.size>600*1024*1024) {
      throw new Error("Selecciona archivos .zip de menos de 600 MB.");
    }
    onProgress("Abriendo "+file.name+"…");
    const compressed=await file.arrayBuffer();
    const archive=zipIndex(compressed);
    const names=archive.names();
    const xlsx=names.filter(name=>/\.xlsx$/i.test(name)&&!/(?:^|\/)__MACOSX\//i.test(name)&&!/(?:^|\/)~\$/.test(name));
    result.totalXlsx+=xlsx.length;
    result.nonXlsx+=names.filter(name=>/\.xls$/i.test(name)).length;
    for(const name of xlsx) {
      result.processed++;
      if(result.processed%10===0) {
        onProgress("Verificados "+result.processed+" Excel. Ofertas identificadas: "+result.offers.length);
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      try {
        const originalBytes=await archive.open(name);
        if(originalBytes.byteLength>15*1024*1024) {
          result.failed++; result.incidents.push({name,reason:"Excel demasiado grande"});continue;
        }
        const digest=await shaHex(originalBytes);
        const matches=index.byHash.get(digest);
        if(!matches) { result.unmatched++;continue; }
        if(matches.length!==1) {
          result.failed++;
          result.incidents.push({name,reason:"Varios pedidos comparten la misma huella; revisión manual"});
          continue;
        }
        const found=matches[0];
        result.hashVerified++;
        if(normalizedSourceName(name)!==normalizedSourceName(found.source_filename)) {
          result.failed++;
          result.incidents.push({name,reason:"SHA correcto, pero el nombre del Excel no coincide con el registrado"});
          continue;
        }
        if(identifiedOrders.has(String(found.id)))continue;
        identifiedOrders.add(String(found.id));
        const offer=await readSupplierOfferFromXlsxBytes(originalBytes);
        if(!offer) {result.noOffer++;continue;}
        if(found.supplier_offer_reference) {
          result.already++;
          if(String(found.supplier_offer_reference).trim()!==offer.reference) {
            result.incidents.push({name,reason:"La oferta del histórico difiere de la oferta leída en Excel"});
          }
          continue;
        }
        result.offers.push({
          order_id:found.id,
          order_reference:found.order_reference||"Pedido ID "+found.id,
          source_filename:found.source_filename,
          source_sha256:digest,
          supplier_offer_reference:offer.reference,
          supplier_offer_label:offer.sourceLabel,
        });
      } catch(error) {
        result.failed++;
        result.incidents.push({name,reason:"No se pudo leer el Excel: "+String(error.message||error).slice(0,170)});
      }
    }
  }
  return result;
}

export function initHistoricalOfferBackfill({client,escapeHtml,isAdmin}) {
  const filesInput=document.getElementById("historicalOfferZips");
  const scanButton=document.getElementById("historicalOfferScan");
  const confirm=document.getElementById("historicalOfferAck");
  const submit=document.getElementById("historicalOfferApply");
  const exportButton=document.getElementById("historicalOfferExport");
  const status=document.getElementById("historicalOfferStatus");
  const output=document.getElementById("historicalOfferPreview");
  if(!filesInput||!scanButton||!confirm||!submit||!exportButton||!status||!output) {
    throw new Error("Faltan controles de recuperación de ofertas históricas.");
  }
  let active=0;
  let candidateOffers=[];
  let working=false;
  let lastReport=null;
  const progress=(s)=>{status.textContent=s;};
  const offerView=(item)=>
    '<tr><td>'+escapeHtml(item.order_reference)+'</td><td>'+escapeHtml(item.supplier_offer_reference)+
    '</td><td>'+escapeHtml(item.supplier_offer_label)+'</td><td>'+
    escapeHtml(item.source_filename)+'</td></tr>';

  function reset() {
    ++active;
    candidateOffers=[];
    lastReport=null;
    exportButton.disabled=true;
    working=false;
    confirm.checked=false;
    submit.disabled=true;
    scanButton.disabled=false;
    output.replaceChildren();
    progress("Selecciona los ZIP originales de 2024, 2025 y/o 2026 para comprobar su contenido.");
  }
  async function scan() {
    if(!isAdmin()||working) return;
    const batch=[...(filesInput.files||[])];
    if(!batch.length){progress("Selecciona uno o varios ZIP originales.");return;}
    ++active;
    const token=active;
    working=true;
    scanButton.disabled=true;
    submit.disabled=true;
    confirm.checked=false;
    output.replaceChildren();
    candidateOffers=[];
    lastReport=null;
    exportButton.disabled=true;
    try{
      progress("Cargando huellas de los pedidos de Supabase…");
      const index=await fetchOriginalOrderIndex(client);
      if(token!==active)return;
      const result=await scanOriginalArchives(batch,index,progress);
      if(token!==active)return;
      candidateOffers=result.offers;
      lastReport=result;
      exportButton.disabled=false;
      const text=[
        ["Pedidos en Supabase",index.rows.length],
        ["Excel examinados",result.processed],
        ["Huella SHA-256 verificada",result.hashVerified],
        ["Ofertas nuevas verificadas",result.offers.length],
        ["Excel sin oferta explícita",result.noOffer],
        ["Excel no correspondientes al histórico",result.unmatched],
        ["Ofertas ya registradas",result.already],
        ["Excel no interpretables / incidencias",result.failed],
        ["Archivos XLS antiguos no compatibles",result.nonXlsx],
      ];
      const statistics='<div class="historical-offer-stats">'+text.map(([label,count])=>
        '<div><span>'+escapeHtml(label)+'</span><strong>'+escapeHtml(count)+'</strong></div>').join("")+'</div>';
      const head='<p class="historical-offer-privacy">Solo se guarda la oferta con su procedencia una vez confirmada. Los ZIP y Excel originales no se envían al servidor.</p>';
      const table=result.offers.length
        ? '<div class="order-lookup-table-scroll"><table class="order-lookup-table"><thead><tr>'+
          '<th>Pedido</th><th>Oferta recuperada</th><th>Etiqueta original</th><th>Archivo Excel</th>'+
          '</tr></thead><tbody>'+result.offers.slice(0,50).map(offerView).join("")+'</tbody></table></div>'+
          (result.offers.length>50?'<p class="hint">Se muestran 50 de '+result.offers.length+' ofertas verificadas.</p>':'')
        : '<p class="hint">Ninguna oferta nueva verificable con los archivos seleccionados.</p>';
      const incidents=result.incidents.slice(0,30).map(x=>'<li>'+escapeHtml(x.name)+': '+escapeHtml(x.reason)+'</li>').join("");
      const warnings=incidents?'<details class="historical-offer-incidents"><summary>Incidencias detectadas ('+
        result.incidents.length+')</summary><ul>'+incidents+'</ul></details>':'';
      output.innerHTML=statistics+head+table+warnings;
      progress("Revisión terminada: "+result.offers.length+" ofertas pendientes de confirmar.");
      submit.disabled=!confirm.checked || result.offers.length===0;
    }catch(error){
      if(token!==active)return;
      console.error("Recuperación de ofertas:",error);
      progress("No se pudo revisar los ZIP: "+String(error.message||error));
      output.replaceChildren();
    }finally{if(token===active){working=false;scanButton.disabled=false;}}
  }

  async function apply() {
    if(!isAdmin()||working||!confirm.checked||!candidateOffers.length)return;
    working=true;scanButton.disabled=true;submit.disabled=true;
    const token=active;
    let committed=0;
    try{
      for(let offset=0;offset<candidateOffers.length;offset+=50){
        if(token!==active)break;
        const batch=candidateOffers.slice(offset,offset+50).map(
          ({order_id,source_sha256,source_filename,supplier_offer_reference,supplier_offer_label})=>({
            order_id,source_sha256,source_filename,supplier_offer_reference,supplier_offer_label
          }));
        progress("Guardando ofertas verificadas "+Math.min(offset+50,candidateOffers.length)+
          " de "+candidateOffers.length+"…");
        const result=await client.rpc("apply_verified_order_offers",{p_items:batch});
        if(result.error)throw result.error;
        committed+=(result.data||[]).filter(r=>r.outcome==="updated").length;
      }
      if(token!==active)return;
      candidateOffers=[];
      confirm.checked=false;
      progress("Guardadas "+committed+" ofertas con auditoría. Ya aparecen en el buscador de pedidos y obras.");
      filesInput.value="";
    }catch(error) {
      if(token!==active)return;
      console.error("No se pudieron guardar todas las ofertas:",error);
      progress("Guardadas "+committed+" ofertas. Se detuvo el lote por un error: "+
        String(error.message||error)+". Vuelve a escanear los ZIP para reintentar solo las pendientes.");
    }finally{
      if(token===active){working=false;scanButton.disabled=false;submit.disabled=true;}
    }
  }
  exportButton.addEventListener("click",()=>{
    if(!lastReport || working)return;
    const field=(raw)=>{
      let value=String(raw??"");
      if(/^[\s]*[=+@\-]/.test(value))value="'"+value; // anti fórmula Excel
      return '"'+value.replaceAll('"','""')+'"';
    };
    const header=["Estado","Pedido","Oferta","Etiqueta","Archivo","SHA256","Incidencia"];
    const lines=[header];
    for(const x of lastReport.offers){
      lines.push(["Verificada",x.order_reference,x.supplier_offer_reference,
        x.supplier_offer_label,x.source_filename,x.source_sha256,""]);
    }
    for(const x of lastReport.incidents){
      lines.push(["Revisar","","","",x.name,"",x.reason]);
    }
    const csv="\uFEFF"+lines.map(row=>row.map(field).join(";")).join("\r\n")+"\r\n";
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;link.download="PROSOEL_Auditoria_Ofertas_Historicas.csv";
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  scanButton.addEventListener("click",scan);
  confirm.addEventListener("change",()=>{submit.disabled=working||!confirm.checked||!candidateOffers.length;});
  submit.addEventListener("click",apply);
  return {reset};
}
