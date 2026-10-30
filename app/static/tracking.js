// Seguimiento de pedidos: lectura del snapshot privado y cierres manuales auditables.
// Nunca introduce datos de Drive directamente en el repositorio publico.
export function interpretTrackingObservation(raw, requested) {
  const text = String(raw || "").trim();
  if (!text) return {kind:"none", received:null, description:"Sin cantidad anotada"};
  const match = text.match(/^(?:recibid[oa]s?\s*:?\s*)?(\d+(?:[.,]\d+)?)\s*(ud(?:s)?\.?|unidades|m\.?|metros?)$/i);
  if (!match) return {kind:"review", received:null, description:"Observación libre: revisar antes de cuantificar"};
  const value = Number(match[1].replace(",","."));
  if (!Number.isFinite(value) || value < 0 || requested == null || value > Number(requested))
    return {kind:"review", received:null, description:"Cantidad anotada incompatible: revisar"};
  return {kind:"probable", received:value, description:"Cantidad anotada, pendiente de verificar"};
}

export function trackingEffectiveState(order, decision) {
  if (order.drive_finalized) return "closed_drive";
  if (decision && decision.decision === "closed") return "closed_manual";
  return "open";
}

export function initTracking({client,escapeHtml}) {
  const root = document.getElementById("trackingWorkspace");
  const dateFrom = document.getElementById("trackingFrom");
  const dateTo = document.getElementById("trackingTo");
  const period = document.getElementById("trackingPeriod");
  const supplier = document.getElementById("trackingSupplier");
  const state = document.getElementById("trackingState");
  const search = document.getElementById("trackingSearch");
  const status = document.getElementById("trackingStatus");
  const stats = document.getElementById("trackingStats");
  const list = document.getElementById("trackingResults");
  const source = document.getElementById("trackingSource");
  const refresh = document.getElementById("trackingRefresh");
  const alertDays = document.getElementById("trackingAlertDays");
  let orders = [], decisions = new Map(), sources = [], loaded = false, busy = false, generation = 0;
  const fmt = (value) => value == null ? "—" : new Intl.NumberFormat("es-ES",{maximumFractionDigits:3}).format(Number(value));
  const iso = (d) => [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  const today = () => iso(new Date());
  const shift = (days) => {const d=new Date(); d.setDate(d.getDate()+days); return iso(d);};
  const pretty = (s) => /^\d{4}-\d\d-\d\d$/.test(s || "") ? s.slice(8,10)+"/"+s.slice(5,7)+"/"+s.slice(0,4) : "—";
  const age = (s) => Math.max(0,Math.floor((new Date(today()+"T12:00:00")-new Date(s+"T12:00:00"))/86400000));
  function setPeriod(v) {
    if(v==="7") dateFrom.value=shift(-6);
    else if(v==="30") dateFrom.value=shift(-29);
    else if(v==="90") dateFrom.value=shift(-89);
    if(v!=="custom") dateTo.value=today();
  }
  setPeriod("30");
  function lineSummary(line) {
    const parsed=interpretTrackingObservation(line.observations,line.requested_qty);
    const req=line.requested_qty==null ? "—" : fmt(line.requested_qty);
    let note="Sin recepción cuantificable";
    if(parsed.kind==="probable") note="Anotadas "+fmt(parsed.received)+" · Posible resto "+fmt(Math.max(0,Number(line.requested_qty)-parsed.received))+" (revisar)";
    if(parsed.kind==="review") note="Observación por interpretar";
    return '<tr><td><span class="tracking-ref">'+escapeHtml(line.reference || "—")+'</span><small>'+escapeHtml(line.description || "—")+'</small></td>'+
      '<td>'+escapeHtml(req)+'</td><td>'+escapeHtml(note)+'</td><td>'+escapeHtml(line.albaran || "—")+'</td>'+
      '<td>'+escapeHtml(line.observations || "—")+'</td></tr>';
  }
  async function readPages(queryFactory, limit=12000) {
    const all=[], size=800;
    for(let off=0;off<limit;off+=size) {
      const response=await queryFactory(off,size);
      if(response.error) throw response.error;
      const data=response.data || []; all.push(...data);
      if(data.length<size) return all;
    }
    throw new Error("El periodo supera el limite de seguridad. Reduce las fechas.");
  }
  async function load() {
    if(busy) return;
    if(!dateFrom.value || !dateTo.value || dateFrom.value>dateTo.value) {
      status.textContent="Selecciona un rango de fechas valido.";return;
    }
    busy=true; refresh.disabled=true; status.textContent="Consultando pedidos autorizados…";
    const request=++generation;
    try {
      const src=await client.from("tracking_sources").select("id,display_name,drive_url,synced_at,modified_at_source,sync_mode").order("display_name");
      if(src.error) throw src.error;
      sources=src.data || [];
      if(!sources.length) {orders=[];decisions.clear();loaded=true;render();status.textContent="No hay fuentes importadas para este usuario.";return;}
      const rows=await readPages((off,size)=>client.from("tracking_orders")
        .select("id,source_id,source_row,order_reference,order_date,supplier,responsible,delivery_location,drive_finalized,reception_date")
        .gte("order_date",dateFrom.value).lte("order_date",dateTo.value)
        .order("order_date",{ascending:false}).order("id",{ascending:false}).range(off,off+size-1));
      const ids=rows.map(x=>x.id);
      const lines=[],events=[];
      for(let i=0;i<ids.length;i+=150) {
        const group=ids.slice(i,i+150);
        const lineList=await readPages((off,size)=>client.from("tracking_lines")
          .select("id,order_id,source_row,reference,description,requested_qty,albaran,observations")
          .in("order_id",group).order("source_row").range(off,off+size-1));
        const eventList=await readPages((off,size)=>client.from("tracking_decisions")
          .select("id,order_id,decision,reason,created_at")
          .in("order_id",group).order("created_at",{ascending:false}).order("id",{ascending:false}).range(off,off+size-1));
        lines.push(...lineList);events.push(...eventList);
      }
      if(request!==generation)return;
      const lineMap=new Map();
      for(const row of lines){if(!lineMap.has(row.order_id))lineMap.set(row.order_id,[]);lineMap.get(row.order_id).push(row);}
      orders=rows.map(row=>({...row,lines:lineMap.get(row.id)||[]}));
      decisions=new Map();
      // Devolver primero las decisiones mas recientes, sin perder el historial.
      for(const d of events.sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id-a.id))
        if(!decisions.has(d.order_id))decisions.set(d.order_id,d);
      loaded=true;
      updateSuppliers();render();
      status.textContent=orders.length+" pedidos recuperados del periodo seleccionado. La actualizacion de Drive no es automatica todavia.";
    } catch(e) {
      console.error("Seguimiento:",e);
      status.textContent="No se pudieron recuperar los pedidos. Comprueba tu sesion y la conexion.";
    } finally {busy=false;refresh.disabled=false;}
  }
  function updateSuppliers() {
    const old=supplier.value;
    const values=[...new Set(orders.map(x=>x.supplier).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));
    supplier.replaceChildren();
    const all=new Option("Todos los almacenes / proveedores","");supplier.add(all);
    for(const s of values)supplier.add(new Option(s,s));
    supplier.value=values.includes(old)?old:"";
  }
  function render() {
    if(!loaded)return;
    const current=orders.map(o=>({...o,_state:trackingEffectiveState(o,decisions.get(o.id))}));
    const open=current.filter(o=>o._state==="open");
    const eligible=open.filter(o=>age(o.order_date)>=Number(alertDays.value||7));
    const review=open.filter(o=>o.lines.some(l=>interpretTrackingObservation(l.observations,l.requested_qty).kind==="review"));
    stats.innerHTML=
      '<div class="tracking-metric"><span>Pedidos del periodo</span><strong>'+current.length+'</strong></div>'+
      '<div class="tracking-metric"><span>Sin finalizar</span><strong>'+open.length+'</strong></div>'+
      '<div class="tracking-metric tracking-metric-accent"><span>Superan plazo · '+escapeHtml(alertDays.value||"7")+' dias</span><strong>'+eligible.length+'</strong></div>'+
      '<div class="tracking-metric"><span>Observaciones para revisar</span><strong>'+review.length+'</strong></div>';
    const s=sources[0];
    if(s) {
      const validUrl=/^https:\/\/docs\.google\.com\/spreadsheets\//.test(s.drive_url||"");
      source.innerHTML='<span>Fuente: '+escapeHtml(s.display_name)+'</span> · <strong>Copia puntual, no sincronizacion en vivo</strong> · '+
        escapeHtml(new Date(s.synced_at).toLocaleString("es-ES"))+
        (validUrl?' · <a href="'+escapeHtml(s.drive_url)+'" target="_blank" rel="noopener noreferrer">Abrir original en Drive</a>':"");
    } else source.textContent="Sin fuente conectada";
    const q=search.value.trim().toLocaleLowerCase("es");
    const visible=current.filter(o=>{
      if(supplier.value && o.supplier!==supplier.value)return false;
      if(state.value==="open" && o._state!=="open")return false;
      if(state.value==="due" && (o._state!=="open"||age(o.order_date)<Number(alertDays.value||7)))return false;
      if(state.value==="closed" && o._state==="open")return false;
      if(state.value==="review" && (o._state!=="open"||!o.lines.some(l=>interpretTrackingObservation(l.observations,l.requested_qty).kind==="review")))return false;
      return !q||[o.order_reference,o.supplier,o.responsible,...o.lines.flatMap(l=>[l.reference,l.description])].some(v=>String(v||"").toLocaleLowerCase("es").includes(q));
    });
    document.getElementById("trackingVisible").textContent=visible.length+" de "+current.length+" pedidos";
    if(!visible.length) {list.innerHTML='<div class="tracking-empty">No hay pedidos que coincidan con los filtros elegidos.</div>';return;}
    list.innerHTML=visible.slice(0,300).map(o=>{
      const closed=o._state!=="open", manual=o._state==="closed_manual", n=age(o.order_date);
      const badge=closed?(manual?"Finalizado manualmente":"Finalizado en Drive"):(n>=Number(alertDays.value||7)?"Revisar plazo":"Pendiente");
      const cls=closed?"is-closed":n>=Number(alertDays.value||7)?"is-alert":"is-open";
      const decision=decisions.get(o.id);
      const desc=closed?"Cierre prevalente; no se calculan cantidades pendientes.":o.lines.some(x=>interpretTrackingObservation(x.observations,x.requested_qty).kind==="probable")?
        "Existen cantidades anotadas, pendientes de verificar.":"No hay evidencia suficiente para cuantificar todas las entregas.";
      return '<article class="tracking-order '+cls+'"><div class="tracking-order-head"><div><div class="tracking-order-ref">'+escapeHtml(o.order_reference)+
        '<span class="tracking-badge">'+escapeHtml(badge)+'</span></div><div class="tracking-order-meta">'+
        escapeHtml(o.supplier||"Sin proveedor")+' · '+escapeHtml(pretty(o.order_date))+' · '+n+' dias · '+o.lines.length+' materiales</div></div>'+
        '<button type="button" class="tracking-action" data-action="'+(closed?"reopen":"close")+'" data-order-id="'+o.id+'"'+
        (o.drive_finalized?' disabled title="El SI del Drive tiene prioridad: no se puede reabrir aqui"':'')+'>'+
        (closed?"Reabrir":"Marcar finalizado")+'</button></div>'+
        '<div class="tracking-order-note">'+escapeHtml(desc)+'</div>'+
        (decision?'<div class="tracking-order-note">Ultima decision manual: '+escapeHtml(decision.decision==="closed"?"Cierre":"Reapertura")+
          ' · '+escapeHtml(pretty(String(decision.created_at).slice(0,10)))+' · '+escapeHtml(decision.reason)+'</div>':"")+
        '<details class="tracking-details"><summary>Ver las '+o.lines.length+' lineas de material</summary>'+
        '<div class="tracking-table-wrap"><table><thead><tr><th>Referencia y concepto</th><th>Solicitado</th><th>Lectura prudente</th><th>Albaran</th><th>Observaciones originales</th></tr></thead>'+
        '<tbody>'+o.lines.map(lineSummary).join("")+'</tbody></table></div></details></article>';
    }).join("")+(visible.length>300?'<p class="tracking-empty">Mostrando los 300 primeros. Acota el rango para ver mas.</p>':"");
  }
  period.addEventListener("change",()=>{setPeriod(period.value);if(period.value!=="custom")load();});
  [dateFrom,dateTo].forEach(el=>el.addEventListener("change",()=>{period.value="custom";load();}));
  [supplier,state,alertDays].forEach(el=>el.addEventListener("change",render));
  search.addEventListener("input",render);
  refresh.addEventListener("click",load);
  list.addEventListener("click",async event=>{
    const btn=event.target.closest("button[data-action]");
    if(!btn || busy)return;
    const order=orders.find(x=>x.id===Number(btn.dataset.orderId));
    if(!order||order.drive_finalized)return;
    const closing=btn.dataset.action==="close";
    const msg=closing?"Marcar "+order.order_reference+" como FINALIZADO solo en PROSOEL Costes?":"Reabrir "+order.order_reference+" en PROSOEL Costes?";
    if(!window.confirm(msg+"\nEl Excel de Drive no cambiara."))return;
    const reason=window.prompt("Motivo obligatorio (minimo 4 caracteres):",closing?"Comprobado por Sergio":"Reapertura tras revision");
    if(reason===null)return;
    if(reason.trim().length<4||reason.trim().length>500){window.alert("El motivo debe tener entre 4 y 500 caracteres.");return;}
    btn.disabled=true;
    const response=await client.from("tracking_decisions").insert({order_id:order.id,decision:closing?"closed":"reopened",reason:reason.trim()});
    if(response.error){console.error(response.error);window.alert("No se pudo guardar la decision. No se ha modificado Drive.");btn.disabled=false;return;}
    status.textContent="Decision registrada con auditoria. Drive permanece intacto.";
    await load();
  });
  return {open(){if(!loaded)load();else render();},reset(){++generation;orders=[];decisions.clear();sources=[];loaded=false;list.replaceChildren();stats.replaceChildren();source.textContent="";status.textContent="Selecciona un periodo para consultar pedidos.";setPeriod("30");period.value="30";}};
}
