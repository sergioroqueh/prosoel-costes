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

// Contrato de recepción de este Excel: material verde Y SI (incluyendo SI combinado).
export function trackingLineDelivered(line) {
  return Boolean(line && line.source_green === true && line.source_si === true && line.drive_line_finalized === true);
}

// Orden en el periodo YA filtrado. El desempate respeta el orden físico de Drive.
export function sortTrackingOrders(items, orderBy="oldest") {
  return items.sort((a,b)=>{
    const diff=String(a.order_date).localeCompare(String(b.order_date)) ||
      Number(a.source_row)-Number(b.source_row) || Number(a.id)-Number(b.id);
    return orderBy==="newest" ? -diff : diff;
  });
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
  const sort = document.getElementById("trackingSort");
  const project = document.getElementById("trackingProject");
  const viewButtons=[...root.querySelectorAll("[data-tracking-view]")];
  let viewMode="queue";
  let catalog=[],folders=[],syncSettings=null;
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
    const received=trackingLineDelivered(line);
    let note=received?"Recibido · verde + SI en Drive":"Pendiente de confirmar entrega";
    if(!received && parsed.kind==="probable") note="Anotadas "+fmt(parsed.received)+" · Posible resto "+fmt(Math.max(0,Number(line.requested_qty)-parsed.received))+" (revisar)";
    if(!received && parsed.kind==="review") note="Observación libre: revisar";
    if(!received && line.source_green && !line.source_si) note+=" · Verde sin SI";
    return '<tr class="'+(received?"tracking-row-received":"tracking-row-pending")+'"><td><span class="tracking-ref">'+escapeHtml(line.reference || "—")+'</span><small>'+escapeHtml(line.description || "—")+'</small></td>'+
      '<td>'+escapeHtml(req)+'</td><td>'+escapeHtml(note)+'</td><td>'+escapeHtml(line.albaran || "—")+'</td>'+
      '<td>'+escapeHtml(line.observations || "—")+'</td></tr>';
  }
  function pendingPreview(lines) {
    if(!lines.length)return "";
    const shown=lines.slice(0,4);
    return '<div class="tracking-pending-materials"><strong>Material pendiente de entrega</strong>'+
      shown.map(line=>{
        const hint=interpretTrackingObservation(line.observations,line.requested_qty);
        const quantity=hint.kind==="probable" ? 'Posible resto '+fmt(Math.max(0,Number(line.requested_qty)-hint.received))+
          ' de '+fmt(line.requested_qty) : fmt(line.requested_qty)+' solicitadas';
        return '<div class="tracking-pending-item"><span class="tracking-pending-ref">'+escapeHtml(line.reference||"Sin referencia")+'</span>'+
          '<span class="tracking-pending-description">'+escapeHtml(line.description||"Material sin descripción")+'</span>'+
          '<span class="tracking-pending-qty">'+escapeHtml(quantity)+'</span></div>';
      }).join("")+
      (lines.length>shown.length?'<div class="tracking-pending-more">Y '+(lines.length-shown.length)+' materiales pendientes más · despliega el detalle</div>':"")+'</div>';
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
      const [src,cat,folderResults,settings]=await Promise.all([
        client.from("tracking_sources").select("id,display_name,drive_url,synced_at,modified_at_source,sync_mode").order("display_name"),
        client.from("tracking_drive_catalog").select("file_id,folder_id,source_title,status,reason,drive_modified_at,last_imported_at,automatic_import_enabled").order("source_title").limit(1000),
        client.from("tracking_drive_folders").select("folder_id,folder_label,classification").limit(1000),
        client.from("tracking_sync_settings").select("requested_interval_minutes,automatic_sync_enabled,auth_setup").eq("id",1).maybeSingle()
      ]);
      if(src.error||cat.error||folderResults.error||settings.error) throw (src.error||cat.error||folderResults.error||settings.error);
      sources=src.data || [];
      catalog=cat.data || [];
      folders=folderResults.data || [];
      syncSettings=settings.data || null;
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
          .select("id,order_id,source_row,reference,description,requested_qty,albaran,observations,source_green,source_si,drive_line_finalized")
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
      updateSuppliers();updateProjects();render();
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
  function folderName(id) {
    const origin=catalog.find(c=>c.file_id===id);
    if(!origin)return sources.find(s=>s.id===id)?.display_name || "Obra no identificada";
    return folders.find(f=>f.folder_id===origin.folder_id)?.folder_label || origin.source_title;
  }
  function updateProjects() {
    const before=project.value;
    const ids=[...new Set(orders.map(o=>o.source_id))];
    project.replaceChildren(new Option("Todas las obras cargadas",""));
    for(const id of ids.sort((a,b)=>folderName(a).localeCompare(folderName(b),"es")))
      project.add(new Option(folderName(id),id));
    project.value=ids.includes(before)?before:"";
  }
  function renderSources() {
    const counts={
      approved:catalog.filter(x=>x.status==="approved").length,
      candidate:catalog.filter(x=>x.status==="candidate").length,
      review:catalog.filter(x=>x.status==="review").length,
      excluded:folders.filter(x=>x.classification==="excluded"||x.classification==="archive").length
    };
    const scheduled=Boolean(syncSettings?.automatic_sync_enabled && syncSettings?.auth_setup==="validated");
    const headline='<section class="tracking-source-overview"><h3>Fuentes de pedidos de Drive</h3>'+
      '<p>'+counts.approved+' libro aprobado · '+counts.candidate+' candidatos · '+counts.review+' por revisar · '+counts.excluded+' carpetas apartadas</p>'+
      '<div class="tracking-sync-note '+(scheduled?"tracking-sync-on":"")+'">'+
      (scheduled?"Sincronización automática configurada cada ":"Sincronización horaria prevista (" )+
      escapeHtml(syncSettings?.requested_interval_minutes??60)+' minutos'+(scheduled?'.':'), pendiente de autorizar la conexión permanente de Google.')+
      '</div><div class="tracking-drive-connect-actions">'+
      '<button type="button" class="tracking-refresh" id="trackingCheckGoogle" aria-label="Comprobar acceso de solo lectura a Google Drive">Comprobar conexión a Drive</button>'+
      '<span id="trackingGoogleResult" role="status" aria-live="polite">No se ha comprobado la conexión técnica.</span>'+
      '</div></section>';
    const items=[...catalog].sort((a,b)=>{
      const ranks={approved:0,candidate:1,review:2,excluded:3};
      return (ranks[a.status]??9)-(ranks[b.status]??9)||
        folderName(a.file_id).localeCompare(folderName(b.file_id),"es");
    });
    const cards=items.map(x=>{
      const label=x.status==="approved"?"Importado":x.status==="candidate"?"Pendiente de validar":x.status==="review"?"Revisión manual":"Excluido";
      const date=x.drive_modified_at?new Date(x.drive_modified_at).toLocaleDateString("es-ES"):"Sin fecha";
      return '<article class="tracking-source-item"><div><strong>'+escapeHtml(folderName(x.file_id))+
        '</strong><small>'+escapeHtml(x.source_title)+' · modificado '+escapeHtml(date)+'</small></div>'+
        '<span class="tracking-source-state tracking-source-state-'+escapeHtml(x.status)+'">'+escapeHtml(label)+'</span></article>';
    }).join("");
    list.innerHTML=headline+'<div class="tracking-source-list">'+cards+'</div>';
    document.getElementById("trackingVisible").textContent=items.length+" libros identificados";
  }
  function render() {
    if(!loaded)return;
    const current=orders.filter(o=>!project.value || o.source_id===project.value).map(o=>({...o,_state:trackingEffectiveState(o,decisions.get(o.id))}));
    const open=current.filter(o=>o._state==="open");
    const eligible=open.filter(o=>age(o.order_date)>=Number(alertDays.value||7));
    const review=open.filter(o=>o.lines.some(l=>!trackingLineDelivered(l) && (l.source_green && !l.source_si || interpretTrackingObservation(l.observations,l.requested_qty).kind==="review")));
    const distinctWorks=new Set(open.map(o=>o.source_id)).size;
    stats.innerHTML=
      '<div class="tracking-metric"><span>Pedidos del periodo</span><strong>'+current.length+'</strong></div>'+
      '<div class="tracking-metric"><span>Sin finalizar</span><strong>'+open.length+'</strong></div>'+
      '<div class="tracking-metric tracking-metric-accent"><span>Superan plazo · '+escapeHtml(alertDays.value||"7")+' dias</span><strong>'+eligible.length+'</strong></div>'+
      '<div class="tracking-metric"><span>Obras con pendientes</span><strong>'+distinctWorks+'</strong></div>'+
      '<div class="tracking-metric"><span>Observaciones para revisar</span><strong>'+review.length+'</strong></div>';
    const first=sources[0];
    const last=first?.synced_at ? new Date(first.synced_at).toLocaleString("es-ES") : "—";
    source.textContent=sources.length+" fuentes importadas · "+catalog.filter(c=>c.status==="candidate").length+
      " candidatos por validar · última copia: "+last+
      " · Google Drive aún no se sincroniza automáticamente";
    if(viewMode==="sources") {renderSources();return;}
    const q=search.value.trim().toLocaleLowerCase("es");
    const visible=current.filter(o=>{
      if(supplier.value && o.supplier!==supplier.value)return false;
      if(project.value && o.source_id!==project.value)return false;
      if(state.value==="open" && o._state!=="open")return false;
      if(state.value==="due" && (o._state!=="open"||age(o.order_date)<Number(alertDays.value||7)))return false;
      if(state.value==="closed" && o._state==="open")return false;
      if(state.value==="review" && (o._state!=="open"||!o.lines.some(l=>!trackingLineDelivered(l) && (l.source_green && !l.source_si || interpretTrackingObservation(l.observations,l.requested_qty).kind==="review"))))return false;
      return !q||[o.order_reference,o.supplier,o.responsible,...o.lines.flatMap(l=>[l.reference,l.description])].some(v=>String(v||"").toLocaleLowerCase("es").includes(q));
    });
    // Ordenar SOLO las coincidencias del periodo, no volver a mezclar registros fuera del rango.
    sortTrackingOrders(visible,sort.value);
    document.getElementById("trackingVisible").textContent=visible.length+" de "+current.length+" pedidos";
    if(!visible.length) {list.innerHTML='<div class="tracking-empty">No hay pedidos que coincidan con los filtros elegidos.</div>';return;}
    const renderCard=(o)=>{
      const closed=o._state!=="open", manual=o._state==="closed_manual", n=age(o.order_date);
      const pending=o.lines.filter(line=>!trackingLineDelivered(line));
      const delivered=o.lines.filter(line=>trackingLineDelivered(line));
      const badge=closed?(manual?"Finalizado manualmente":"Completo en Drive"):
        (delivered.length ? "Entrega parcial" : n>=Number(alertDays.value||7)?"Revisar plazo":"Pendiente");
      const cls=closed?"is-closed":n>=Number(alertDays.value||7)?"is-alert":"is-open";
      const decision=decisions.get(o.id);
      const desc=closed?"Pedido cerrado. Las anotaciones parciales anteriores no generan reclamaciones.":
        pending.length+" materiales sin marca verde + SI · "+delivered.length+" recibidos según Drive.";
      const linesToShow=closed?o.lines:pending;
      const table='<div class="tracking-table-wrap"><table><thead><tr><th>Referencia y concepto</th><th>Solicitado</th><th>Estado / cantidad</th><th>Albarán</th><th>Observaciones originales</th></tr></thead>'+
        '<tbody>'+linesToShow.map(lineSummary).join("")+'</tbody></table></div>';
      const deliveredDetail=!closed && delivered.length?
        '<details class="tracking-details tracking-received-details"><summary>Ver '+delivered.length+' materiales ya recibidos</summary>'+
        '<div class="tracking-table-wrap"><table><thead><tr><th>Referencia y concepto</th><th>Solicitado</th><th>Estado</th><th>Albarán</th><th>Observaciones</th></tr></thead><tbody>'+
        delivered.map(lineSummary).join("")+'</tbody></table></div></details>':"";
      return '<article class="tracking-order '+cls+'"><div class="tracking-order-head"><div><div class="tracking-order-ref">'+escapeHtml(o.order_reference)+
        '<span class="tracking-badge">'+escapeHtml(badge)+'</span></div><div class="tracking-order-meta">'+
        escapeHtml(o.supplier||"Sin proveedor")+' · '+escapeHtml(pretty(o.order_date))+' · '+n+' días · <strong>'+
        pending.length+' pendientes</strong> / '+delivered.length+' recibidos</div></div>'+
        '<button type="button" class="tracking-action" data-action="'+(closed?"reopen":"close")+'" data-order-id="'+o.id+'"'+
        (o.drive_finalized?' disabled title="Todas las líneas están marcadas recibidas en Drive"':'')+'>'+
        (closed?"Reabrir":"Marcar finalizado")+'</button></div>'+
        '<div class="tracking-order-note">'+escapeHtml(desc)+'</div>'+
        (!closed?pendingPreview(pending):"")+
        (decision?'<div class="tracking-order-note">Última decisión manual: '+escapeHtml(decision.decision==="closed"?"Cierre":"Reapertura")+
          ' · '+escapeHtml(pretty(String(decision.created_at).slice(0,10)))+' · '+escapeHtml(decision.reason)+'</div>':"")+
        '<details class="tracking-details"><summary>'+(closed?"Ver todos los materiales recibidos":"Consultar detalle de los "+pending.length+" materiales pendientes")+
        '</summary>'+table+'</details>'+deliveredDetail+'</article>';
    };
    const shown=visible.slice(0,300);
    const overflow=visible.length>300?'<p class="tracking-empty">Mostrando los 300 primeros. Acota el rango para ver más.</p>':"";
    if(viewMode==="works") {
      const grouped=new Map();
      for(const order of shown){
        const name=folderName(order.source_id);
        if(!grouped.has(name)) grouped.set(name,[]);
        grouped.get(name).push(order);
      }
      // Los grupos se ordenan por la primera fecha pendiente, no por el nombre de la obra.
      list.innerHTML=[...grouped.entries()].map(([name,items],i)=>{
        const pendingCount=items.reduce((n,o)=>n+(o._state==="open"?o.lines.filter(l=>!trackingLineDelivered(l)).length:0),0);
        return '<details class="tracking-project-group" '+(i<2?'open':'')+'><summary><span>'+
          escapeHtml(name)+'</span><small>'+items.length+' pedidos · '+pendingCount+' materiales pendientes</small></summary>'+
          '<div class="tracking-project-cards">'+items.map(renderCard).join("")+'</div></details>';
      }).join("")+overflow;
    } else {
      list.innerHTML=shown.map(renderCard).join("")+overflow;
    }
  }
  period.addEventListener("change",()=>{setPeriod(period.value);if(period.value!=="custom")load();});
  [dateFrom,dateTo].forEach(el=>el.addEventListener("change",()=>{period.value="custom";load();}));
  [supplier,state,alertDays,sort,project].forEach(el=>el.addEventListener("change",render));
  for(const button of viewButtons) button.addEventListener("click",()=>{
    viewMode=button.dataset.trackingView;
    for(const b of viewButtons){
      const active=b===button;
      b.classList.toggle("is-active",active);
      b.setAttribute("aria-pressed",String(active));
    }
    render();
  });
  // Comprobar Google a través del servidor: el navegador nunca ve la clave privada.
  list.addEventListener("click",async event=>{
    const button=event.target.closest("#trackingCheckGoogle");
    if(!button)return;
    const result=list.querySelector("#trackingGoogleResult");
    button.disabled=true;
    result.textContent="Comprobando acceso privado…";
    try {
      const {data,error}=await client.functions.invoke("drive-connection-check",{body:{probe:true}});
      if(error) {
        result.textContent="No se pudo consultar el verificador. Comprueba tu sesión e inténtalo de nuevo.";
        return;
      }
      const states={
        connected:"Conexión verificada: Google permite leer el Excel aprobado. Sincronización horaria todavía inactiva.",
        pending_credentials:"Pendiente de configurar la clave de la cuenta de servicio en Supabase.",
        permission_missing:"La cuenta de servicio todavía no tiene acceso de lectura al Excel aprobado.",
        google_auth_failed:"Google no ha aceptado la clave de servicio. Comprueba credenciales y Drive API.",
        download_not_allowed:"Acceso de lectura detectado, pero falta permiso para descargar el Excel.",
      };
      result.textContent=states[data?.state]||String(data?.message||"No se completó la comprobación.");
    } catch {
      result.textContent="Error de conexión con el verificador. No se ha modificado ningún archivo.";
    } finally {button.disabled=false;}
  });
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
  return {open(){if(!loaded)load();else render();},reset(){++generation;orders=[];decisions.clear();sources=[];catalog=[];folders=[];syncSettings=null;loaded=false;viewMode="queue";for(const b of viewButtons){const active=b.dataset.trackingView==="queue";b.classList.toggle("is-active",active);b.setAttribute("aria-pressed",String(active));}list.replaceChildren();stats.replaceChildren();source.textContent="";status.textContent="Selecciona un periodo para consultar pedidos.";setPeriod("30");period.value="30";}};
}
