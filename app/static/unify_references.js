// PROSOEL Costes — Unificación autoservicio de referencias, solo Sergio.
// No escribe Excel, pedidos ni precios. El servidor decide los permisos y guarda
// las revisiones y reglas en una sola transacción.
const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&#039;");

const normalizeSource = (value) => String(value ?? "").trim().replace(/\s+/g," ").toUpperCase();
const euro = (value) => {
  const amount=Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:4}).format(amount)
    : "Sin precio";
};
const dateEs = (date) => {
  const parts=String(date||"").split("-");
  return parts.length===3 ? parts.reverse().join("/") : "Sin fecha";
};
const validRef = (value) => /^[a-zA-Z0-9._/+\-, ]{3,100}$/.test(value.trim());

export function initUnifyReferences({client,canEdit,onSaved=()=>{}}) {
  const $=(id)=>document.getElementById(id);
  const form=$("unifySearchForm");
  const input=$("unifyReference");
  const status=$("unifyStatus");
  const results=$("unifySelection");
  const groupsNode=$("unifyGroups");
  const titleInput=$("unifyCanonical");
  const future=$("unifyFuture");
  const note=$("unifyNote");
  const ack=$("unifyAcknowledge");
  const save=$("unifySave");
  const selectedCount=$("unifySelectedCount");
  const selectAll=$("unifySelectAll");
  const clear=$("unifyClear");
  if (!form || !client) return;

  let rows=[];
  let groups=[];
  let selected=new Set();
  let reference="";
  let busy=false;
  let loadToken=0;

  function message(text,error=false) {
    status.textContent=text;
    status.classList.toggle("is-error",error);
    status.classList.toggle("is-success",!error && text.startsWith("Guardado"));
  }
  function grouping(lines) {
    const grouped=new Map();
    for(const line of lines) {
      const key=String(line.supplier_id)+"|"+normalizeSource(line.source_description);
      if(!grouped.has(key))grouped.set(key,{
        supplier:line.supplier_name,source:line.source_description,
        key,lines:[]});
      grouped.get(key).lines.push(line);
    }
    return [...grouped.values()];
  }
  function selectable(line) {
    return !line.excluded && !line.material_linked &&
      !["environmental_fee","freight","service"].includes(line.line_kind);
  }
  function updateControls() {
    const chosen=rows.filter(l=>selected.has(String(l.line_id)));
    const counts=new Set(chosen.map(l=>String(l.supplier_id))).size;
    let partial=false;
    for(let i=0;i<groups.length;i++) {
      const g=groups[i],included=g.lines.filter(l=>selected.has(String(l.line_id))).length;
      const check=groupsNode.querySelector('[data-unify-group="'+i+'"]');
      if(check) {
        check.checked=included===g.lines.length && included>0;
        check.indeterminate=included>0 && included<g.lines.length;
        check.disabled=g.lines.some(l=>!selectable(l));
      }
      if(included>0 && included<g.lines.length)partial=true;
    }
    selectedCount.textContent=chosen.length+" compras seleccionadas · "+counts+" proveedores";
    const invalid=chosen.length>200 || (future.checked && partial);
    save.disabled=busy || !canEdit() || chosen.length===0 || invalid || !ack.checked ||
      titleInput.value.trim().length<10 || titleInput.value.trim().length>350;
    if(invalid) {
      selectedCount.textContent += chosen.length>200
        ? " · Máximo 200 por operación"
        : " · Para crear reglas, selecciona variantes completas";
    }
    selectAll.disabled=busy;
    clear.disabled=busy;
  }
  function renderGroups() {
    groups=grouping(rows);
    const eligible=rows.filter(selectable).length;
    $("unifyFound").textContent=rows.length+" líneas en "+groups.length+" variantes · "+eligible+" seleccionables";
    groupsNode.innerHTML=groups.map((g,i)=>{
      const eligibleGroup=g.lines.every(selectable);
      const priceList=g.lines.map(l=>Number(l.net_unit_price)).filter(v=>Number.isFinite(v)&&v>0);
      const min=priceList.length?Math.min(...priceList):null;
      const max=priceList.length?Math.max(...priceList):null;
      const range=min===null?"Sin precio":min===max?euro(min):euro(min)+" – "+euro(max);
      return '<article class="unify-group">'+
        '<div class="unify-group-top"><label class="unify-group-title">'+
        '<input type="checkbox" data-unify-group="'+i+'"'+(eligibleGroup?"":" disabled")+'>'+
        '<span><strong>'+escapeHtml(g.supplier)+'</strong><small>'+
        escapeHtml(g.source)+'</small></span></label>'+
        '<span class="unify-group-count">'+g.lines.length+' compras · '+escapeHtml(range)+'</span></div>'+
        '<details><summary>Ver pedidos y seleccionar líneas</summary>'+
        '<div class="unify-group-lines">'+g.lines.map(line=>
          '<label class="unify-line"><input type="checkbox" data-unify-line="'+escapeHtml(line.line_id)+'"'+(selectable(line)?"":" disabled")+'>'+
          '<span><strong>'+escapeHtml(line.order_reference)+'</strong> · '+dateEs(line.order_date)+
          ' · '+euro(line.net_unit_price)+' /ud'+
          (!selectable(line)?' · No editable':'')+
          (line.effective_description!==line.source_description
            ? '<small>Actual: '+escapeHtml(line.effective_description)+'</small>':'')+
          '</span></label>'
        ).join("")+'</div></details></article>';
    }).join("");
    groupsNode.querySelectorAll("[data-unify-group]").forEach(check=>{
      check.addEventListener("change",()=>{
        const g=groups[Number(check.dataset.unifyGroup)];
        g.lines.forEach(line=>{
          const id=String(line.line_id);
          if(check.checked && selectable(line)) selected.add(id);
          else selected.delete(id);
        });
        groupsNode.querySelectorAll("[data-unify-line]").forEach(lineCheck=>{
          lineCheck.checked=selected.has(lineCheck.dataset.unifyLine);
        });
        updateControls();
      });
    });
    groupsNode.querySelectorAll("[data-unify-line]").forEach(check=>{
      check.addEventListener("change",()=>{
        if(check.checked)selected.add(check.dataset.unifyLine);
        else selected.delete(check.dataset.unifyLine);
        updateControls();
      });
    });
    updateControls();
  }
  async function load({preserveText=false}={}) {
    if(!canEdit())return;
    const ref=input.value.trim();
    if(!validRef(ref)) {
      message("Introduce una referencia válida (por ejemplo 069801L o A9F79425).",true);
      return;
    }
    const token=++loadToken;
    busy=true;
    form.querySelector("button").disabled=true;
    message("Buscando compras y sus descripciones originales…");
    results.classList.add("hidden");
    const {data,error}=await client.rpc("normalization_unify_lookup",{p_reference:ref});
    if(token!==loadToken)return;
    busy=false;
    form.querySelector("button").disabled=false;
    if(error){message("No se pudo consultar la referencia: "+(error.message||"Error de permisos"),true);return;}
    const found=data||[];
    if(found.length>300){
      rows=[];selected.clear();
      message("La referencia supera las 300 líneas. Esta primera versión requiere revisar el grupo por lotes antes de unificar.",true);
      return;
    }
    if(!found.length){
      rows=[];selected.clear();
      message("No hay compras con esa referencia exacta.",true);
      return;
    }
    const previous=reference;
    reference=ref;
    rows=found;
    selected.clear();
    ack.checked=false;
    if(!preserveText || previous!==ref){titleInput.value="";note.value="";future.checked=true;}
    renderGroups();
    results.classList.remove("hidden");
    message("Referencia localizada. Selecciona únicamente materiales técnicamente equivalentes y confirma el texto definitivo.");
  }

  async function persist() {
    if(busy||!canEdit())return;
    updateControls();
    if(save.disabled)return;
    const chosen=rows.filter(l=>selected.has(String(l.line_id)));
    const canonical=titleInput.value.trim().replace(/\s+/g," ");
    if(!canonical||chosen.length===0)return;
    const confirmTitle=canonical;
    const proceed=window.confirm(
      "¿Unificar "+chosen.length+" compras de la referencia "+reference+
      " bajo esta descripción?\n\n"+confirmTitle+
      "\n\n"+(future.checked
        ?"Se guardarán también reglas para futuras importaciones con el mismo proveedor, código y texto original."
        :"Solo se actualizará el historial, sin reglas futuras.")+
      "\n\nLos precios, descuentos y pedidos originales no se modificarán."
    );
    if(!proceed)return;
    busy=true;
    save.disabled=true;
    form.querySelector("button").disabled=true;
    message("Guardando correcciones y auditoría…");
    const payload={
      p_reference:reference,
      p_line_ids:chosen.map(l=>Number(l.line_id)),
      p_expected_revisions:chosen.map(l=>Number(l.line_revision)),
      p_description:canonical,
      p_create_rules:future.checked,
      p_note:note.value.trim()||null,
    };
    const {data,error}=await client.rpc("normalization_unify_save",payload);
    busy=false;
    form.querySelector("button").disabled=false;
    if(error || data?.result!=="saved"){
      message("No se pudo guardar: "+(error?.message||"Error al aplicar la unificación"),true);
      updateControls();
      return;
    }
    await load({preserveText:true});
    message("Guardado: "+data.updated_lines+" descripciones corregidas, "+
      data.already_correct+" ya correctas y "+data.future_rules+
      " reglas para nuevas importaciones. Histórico y precios originales intactos.");
    onSaved(data);
  }

  form.addEventListener("submit",e=>{e.preventDefault();load();});
  save.addEventListener("click",persist);
  selectAll.addEventListener("click",()=>{
    selected=new Set(rows.filter(selectable).map(l=>String(l.line_id)));
    groupsNode.querySelectorAll("[data-unify-line]").forEach(x=>x.checked=selected.has(x.dataset.unifyLine));
    updateControls();
  });
  clear.addEventListener("click",()=>{
    selected.clear();
    groupsNode.querySelectorAll("[data-unify-line]").forEach(x=>x.checked=false);
    updateControls();
  });
  for(const field of [titleInput,future,ack]) field.addEventListener("input",updateControls);
  return {openReference(ref){
    if(!canEdit())return;
    input.value=String(ref||"");
    $("unifyTool").open=true;
    load();
    $("unifyTool").scrollIntoView?.({behavior:"smooth",block:"start"});
  }};
}
