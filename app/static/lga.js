// PROSOEL JUST_2, 28/10/2026. Calculation only; no network or storage.
export const EXAMPLE = Object.freeze({homes:24, watts:7360, night:"No", services:0, shops:0, garage:0, ev:0, other:0, central:"Única", length:42.98, voltage:400, cos:1, material:"Cu", mounting:"Tubo en edificio", temp:90, x:0.08, kt:1, kg:1, ko:1, fuse:200, forced:0, ifRatio:1.6});
export const SECTIONS = Object.freeze([10,16,25,35,50,70,95,120,150,185,240]);
const coeff = [0,1,2,3,3.8,4.6,5.4,6.2,7,7.8,8.5,9.2,9.9,10.6,11.3,11.9,12.5,13.1,13.7,14.3,14.8,15.3];
// S, Iz Cu edificio/enterrado, Iz Al edificio/enterrado, N min Cu/Al, tubo Cu/Al
const data = [
[10,60,77,0,0,10,0,75,0],[16,80,100,65,78,10,16,75,75],
[25,106,128,82,100,16,16,110,110],[35,131,152,102,120,16,16,110,110],
[50,159,184,124,144,25,25,125,125],[70,202,224,158,186,35,35,140,140],
[95,245,268,192,208,50,50,140,140],[120,284,304,223,236,70,70,160,160],
[150,338,340,258,264,70,70,160,160],[185,386,384,294,300,95,95,180,180],
[240,455,440,372,344,120,120,200,200]];
const numeric = ["homes","watts","services","shops","garage","ev","other","length","voltage","cos","temp","x","kt","kg","ko","fuse","forced","ifRatio"];
export function calculateLga(d) {
  const errors=[];
  if(numeric.some(k=>typeof d[k]!=="number" || !Number.isFinite(d[k]))) return {errors:["Completa todos los campos numéricos con valores válidos."]};
  if(!Number.isInteger(d.homes)||d.homes<0) errors.push("El número de viviendas debe ser un entero no negativo.");
  if(["watts","services","shops","garage","ev","other"].some(k=>d[k]<0)) errors.push("Las potencias no pueden ser negativas.");
  if(d.homes>0 && d.watts<=0) errors.push("Indica la potencia por vivienda.");
  if(d.length<=0||d.voltage<=0||d.cos<=0||d.cos>1) errors.push("Longitud y tensión positivas; cos φ entre 0 (excluido) y 1.");
  if(d.temp<0||d.temp>90||d.x<0) errors.push("Temperatura del conductor entre 0 y 90 °C y reactancia no negativa (modelo XLPE).");
  if(["kt","kg","ko"].some(k=>d[k]<=0)) errors.push("Los coeficientes de corrección deben ser positivos.");
  if(d.fuse<16||d.ifRatio<=0) errors.push("Fusible gG ≥ 16 A y relación If/In positiva.");
  if(d.forced!==0&&!SECTIONS.includes(d.forced)) errors.push("Selecciona una sección comercial de la tabla.");
  if(!["Cu","Al"].includes(d.material)||!["No","Sí"].includes(d.night)||!["Única","Parcial"].includes(d.central)||!["Tubo en edificio","Tubo enterrado"].includes(d.mounting)) errors.push("Selecciona una configuración válida.");
  if(errors.length) return {errors};
  const simult = d.homes<1?0:d.night==="Sí"?d.homes:d.homes>21?15.3+(d.homes-21)*0.5:coeff[d.homes];
  const homesPower=simult*d.watts, total=homesPower+d.services+d.shops+d.garage+d.ev+d.other;
  const ib=total/(Math.sqrt(3)*d.voltage*d.cos), k=d.kt*d.kg*d.ko, required=ib/k, limit=d.central==="Única"?0.5:1;
  if(total<=0) return {errors:["Introduce una potencia prevista total superior a cero."]};
  if(![total,ib,k,required].every(Number.isFinite)||k<=0) return {errors:["Valores fuera del intervalo numérico de cálculo."]};
  const cu=d.material==="Cu", underground=d.mounting==="Tubo enterrado";
  const rows=data.map(t=>{
    const section=t[0], base=t[cu?(underground?2:1):(underground?4:3)], iz=base*k;
    const resistance=(1000/(cu?56:35))*(1+(cu?0.00393:0.00403)*(d.temp-20))/section;
    const dropV=Math.sqrt(3)*ib*d.length*(resistance*d.cos+d.x*Math.sqrt(1-d.cos*d.cos))/1000;
    const drop=100*dropV/d.voltage;
    const thermal=iz>=ib&&iz>0&&ib>0, voltageOk=drop<=limit&&ib>0;
    const fuseOk=d.fuse>=ib&&d.fuse<=iz&&d.fuse*d.ifRatio<=1.45*iz&&ib>0;
    const eligible=thermal&&voltageOk&&fuseOk;
    return {section,base,iz,resistance,dropV,drop,thermal,voltageOk,fuseOk,eligible,neutral:t[cu?5:6],tube:t[cu?7:8],margin:iz-ib,diagnosis:eligible?"APTA":!thermal?"Iz insuficiente":!voltageOk?"CDT excesiva":"Revisar fusible CGP"};
  });
  if(rows.some(r=>![r.iz,r.drop,r.dropV,r.margin].every(Number.isFinite))) return {errors:["Valores fuera del intervalo numérico de cálculo."]};
  const auto=rows.find(r=>r.eligible)||null, chosen=d.forced?rows.find(r=>r.section===d.forced):auto;
  return {errors:[],simult,homesPower,total,ib,k,required,limit,limitV:d.voltage*limit/100,rows,auto,chosen,ok:Boolean(chosen?.eligible)};
}
const fieldsA=[
["homes","Número de viviendas",1],["watts","Potencia por vivienda (W)",1],["night","Tarifa nocturna con acumulación",["No","Sí"]],
["services","Servicios generales (W)",1],["shops","Locales comerciales (W)",1],["garage","Garaje (W)",1],["ev","Recarga VE BT-52 (W)",1],["other","Otras cargas (W)",1]];
const fieldsB=[
["central","Centralización de contadores",["Única","Parcial"]],["length","Longitud eléctrica LGA (m)","any"],["voltage","Tensión entre fases (V)","any"],["cos","Factor de potencia cos φ","any"],
["material","Material conductor",["Cu","Al"]],["mounting","Canalización / montaje",["Tubo en edificio","Tubo enterrado"]],["temp","Temperatura conductor (°C)","any"],["x","Reactancia X (Ω/km)","any"],["kt","Coef. temperatura kT","any"],["kg","Coef. agrupamiento kG","any"],["ko","Otro coef. kO","any"],["fuse","Fusible CGP gG (A)",1],["forced","Sección fase forzada (mm²)",[0,...SECTIONS]],["ifRatio","Relación If/In del fusible gG","any"]];
const fmt=(v,n=2)=>Number.isFinite(v)?v.toLocaleString("es-ES",{maximumFractionDigits:n,minimumFractionDigits:0}):"—";
const check=(flag)=>'<span class="lga-check '+(flag?'lga-pass':'lga-fail')+'">'+(flag?'OK':'NO')+'</span>';
function inputHtml([k,label,kind]){
  return '<label for="lga-'+k+'">'+label+(Array.isArray(kind)?'<select id="lga-'+k+'" name="'+k+'">'+kind.map(v=>'<option value="'+v+'">'+(k==="forced"&&v===0?"Automática":v)+'</option>').join("")+'</select>':'<input id="lga-'+k+'" name="'+k+'" type="number" step="'+kind+'" required inputmode="decimal">')+'</label>';
}
export function initLga({container,canOpen}){
  let form=null;
  function close(){container.replaceChildren();form=null;}
  function open(){
    if(!canOpen()){close();return false;}
    if(form)return true;
    container.innerHTML='<header class="lga-head"><div><span class="lga-kicker">OFICINA TÉCNICA · HERRAMIENTAS</span><h2>Cálculo de sección de LGA</h2><p>CGP → centralización de contadores · REBT ITC-BT-10 / 14 / 22</p></div><span class="lga-private">Herramienta de Sergio</span></header>'
      +'<p class="lga-note">Verificación preliminar basada en PROSOEL JUST_2 (28/10/2026). Cable RZ1-K Cu / RZ1-Al, tres unipolares cargados. No sustituye la justificación del proyecto.</p>'
      +'<form class="lga-form" novalidate>'
      +'<div class="lga-form-grid lga-priority-grid">'
      +'<fieldset class="lga-priority-panel"><legend>01 · Previsión de cargas <small>USO HABITUAL</small></legend><div class="lga-fields">'+fieldsA.map(inputHtml).join("")+'</div><p class="lga-hint">Recarga VE: introducir manualmente según BT-52, evitando duplicar cargas.</p><div class="lga-load-summary" id="lga-load"></div></fieldset>'
      +'<fieldset class="lga-priority-panel lga-quick-panel"><legend>02 · Datos de la LGA <small>USO HABITUAL</small></legend><div class="lga-fields lga-quick-fields">'+fieldsB.filter(([key])=>key==="length"||key==="material").map(inputHtml).join("")+'</div><p class="lga-hint">La longitud influye directamente en la caída de tensión; el material cambia la resistencia y la intensidad admisible.</p></fieldset>'
      +'</div>'
      +'<details class="lga-advanced" id="lgaAdvanced"><summary><span class="lga-advanced-heading"><strong>Configuración y protección</strong><small id="lgaTechSummary">Centralización única · fusible gG 200 A · tubo en edificio</small></span><span class="lga-advanced-chevron" aria-hidden="true">▾</span></summary>'
      +'<div class="lga-advanced-content"><div class="lga-advanced-grid"><div class="lga-advanced-settings"><h3>Otros parámetros técnicos</h3><div class="lga-fields">'+fieldsB.filter(([key])=>key!=="length"&&key!=="material"&&key!=="fuse").map(inputHtml).join("")+'</div><p class="lga-hint">Centralización única: caída máxima 0,5 %; parcial: 1 %. Los factores k corrigen Iz, no IB.</p></div>'
      +'<div class="lga-protection"><h3>Fusible de CGP</h3><div class="lga-fields">'+fieldsB.filter(([key])=>key==="fuse").map(inputHtml).join("")+'</div><p class="lga-fuse-explainer">Es el calibre nominal In del fusible gG situado en la CGP. Condiciona qué secciones protegen correctamente la LGA: Ib ≤ In ≤ Iz y, para In ≥ 16 A, 1,6 × In ≤ 1,45 × Iz. No cambia directamente la intensidad de consumo ni la caída de tensión.</p><p class="lga-fuse-live" id="lgaFuseDetail"></p><p class="lga-hint">Indica el fusible real o proyectado; no seleccionar solo para hacer que una sección resulte apta. Sigue pendiente la comprobación de cortocircuito y de distribuidora.</p></div></div></div></details>'
      +'<div class="lga-actions"><button type="submit">Calcular LGA</button><button type="button" data-reset="new" class="secondary-button">Nuevo cálculo</button><button type="button" data-reset="example" class="secondary-button">Cargar ejemplo del Excel</button><span class="lga-hint">Cálculo local · sin almacenamiento de datos</span></div></form>'
      +'<div class="lga-result" id="lga-result" aria-live="polite"></div><div id="lga-comparison"></div>'
      +'<details class="lga-notes"><summary>Hipótesis, alcance y fuentes</summary><p>Tablas orientativas de la Guía BT-14 (40 °C ambiente en edificio, 25 °C enterrado). Temperatura de cálculo del conductor: 90 °C por defecto. Rθ: conductividad 56 Cu / 35 Al a 20 °C y α 0,00393 / 0,00403. Modelo trifásico con reactancia editable. No se aplica el factor 1,25 de BT-40.</p><p>Neutro aconsejado igual a fase; reducción solo con estudio de desequilibrio y armónicos. Tubo mínimo de tabla 1: comprobar ocupación y requisitos de distribuidora. No se verifica Icc, poder de corte, condición adiabática, energía pasante, selectividad, CGP, RVE, trazado real ni reparto entre varias LGA.</p><p><a href="https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099" target="_blank" rel="noopener noreferrer">REBT</a> · <a href="https://industria.gob.es/Calidad-Industrial/seguridadindustrial/instalacionesindustriales/baja-tension/Documents/bt/guia_bt_14_sep03R1.pdf" target="_blank" rel="noopener noreferrer">Guía BT-14</a> · <a href="https://industria.gob.es/Calidad-Industrial/seguridadindustrial/instalacionesindustriales/baja-tension/Documents/bt/guia_bt_22_oct05R1.pdf" target="_blank" rel="noopener noreferrer">Guía BT-22</a></p></details>';
    form=container.querySelector("form");
    const result=container.querySelector("#lga-result"), comparison=container.querySelector("#lga-comparison"), load=container.querySelector("#lga-load"), techSummary=container.querySelector("#lgaTechSummary"), fuseDetail=container.querySelector("#lgaFuseDetail");
    function update(){
      if(!canOpen()){close();return;}
      const d={};
      for(const [key] of [...fieldsA,...fieldsB]){
        const el=form.elements.namedItem(key);
        d[key]=numeric.includes(key)?(el.value.trim()===""?NaN:Number(el.value)):el.value;
      }
      const r=calculateLga(d);
      const validFuse=Number.isFinite(d.fuse)&&d.fuse>=16;
      const fuseView=validFuse?fmt(d.fuse,0)+" A":"sin definir";
      techSummary.textContent="Centralización "+String(d.central||"—").toLowerCase()+" · fusible gG "+fuseView+" · "+String(d.mounting||"—").toLowerCase();
      const fusingCurrent=validFuse?d.fuse*d.ifRatio:NaN;
      fuseDetail.textContent=r.errors.length?"El valor de CGP se comprobará cuando los datos estén completos.":"Ib "+fmt(r.ib,2)+" A · In "+fuseView+" · If "+fmt(fusingCurrent,2)+" A"+(validFuse&&d.fuse<r.ib?" · ATENCIÓN: In es menor que Ib":"");
      fuseDetail.classList.toggle("lga-fuse-live-warning",!r.errors.length&&validFuse&&d.fuse<r.ib);
      if(r.errors.length){
        result.innerHTML='<div class="lga-alert"><strong>Completa o revisa los datos</strong><p>'+r.errors.join(" ")+'</p></div>';
        load.replaceChildren();comparison.replaceChildren();return;
      }
      load.innerHTML='<span>Coef. simultaneidad <strong>'+fmt(r.simult,2)+'</strong></span><span>Potencia viviendas <strong>'+fmt(r.homesPower/1000,3)+' kW</strong></span><span>Potencia total <strong>'+fmt(r.total/1000,3)+' kW</strong></span>';
      const c=r.chosen;
      const fuseWarning=Number.isFinite(d.fuse)&&d.fuse<r.ib?'<p class="lga-fuse-warning">El fusible gG indicado ('+fmt(d.fuse,0)+' A) es inferior a la intensidad prevista Ib ('+fmt(r.ib,2)+' A). Revisa la configuración y protección.</p>':"";
      const metrics=[
        ["Sección fase usada",c?fmt(c.section,0)+" mm² · "+d.material:"Sin sección apta"],
        ["Sección automática",r.auto?fmt(r.auto.section,0)+" mm²":"Ninguna"],
        ["Intensidad IB",fmt(r.ib,2)+" A"],["Caída de tensión",c?fmt(c.drop,3)+" %":"—"],
        ["Límite de caída",fmt(r.limit,1)+" % · "+fmt(r.limitV,2)+" V"],
        ["Iz corregida",c?fmt(c.iz,2)+" A":"—"],["Intensidad térmica req.",fmt(r.required,2)+" A"],
        ["Factor kT · kG · kO",fmt(r.k,4)],["Neutro mínimo BT-14",c&&c.neutral?fmt(c.neutral,0)+" mm²":"—"],
        ["Neutro recomendado",c&&c.base?fmt(c.section,0)+" mm²":"—"],["Tubo mínimo BT-14",c&&c.tube?"Ø "+fmt(c.tube,0)+" mm":"—"],
        ["Prechequeo fusible CGP",c&&c.fuseOk?"OK":"REVISAR"]];
      result.innerHTML='<div class="lga-result-head"><h3>03 · Resultados de dimensionamiento</h3><span class="lga-status '+(r.ok?'lga-pass':'lga-fail')+'">'+(r.ok?'PRE-CHEQUEO OK*':'REVISAR')+'</span></div><div class="lga-metrics">'+metrics.map(m=>'<div><span>'+m[0]+'</span><strong>'+m[1]+'</strong></div>').join("")+'</div><p class="lga-hint">'+(r.ok?'* Pendiente de verificaciones de proyecto.':c?c.diagnosis:"Ninguna sección comercial de la tabla supera las tres comprobaciones. No extrapolar.")+'</p>'+fuseWarning;
      comparison.innerHTML='<div class="lga-table-card"><h3>04 · Comparativa de secciones comerciales</h3><div class="lga-scroll"><table><thead><tr>'+["Fase mm²","Iz base A","Iz corr. A","Rθ Ω/km","CDT V","CDT %","Térmica","CDT","Fusible gG","N mín mm²","Ø tubo mm","Margen A","Diagnóstico"].map(h=>'<th scope="col">'+h+'</th>').join("")+'</tr></thead><tbody>'+r.rows.map(t=>'<tr class="'+(c?.section===t.section?'lga-selected':'')+'"><th scope="row">'+t.section+(c?.section===t.section?' · usada':'')+'</th>'+[fmt(t.base,2),fmt(t.iz,2),fmt(t.resistance,4),fmt(t.dropV,3),fmt(t.drop,3),check(t.thermal),check(t.voltageOk),check(t.fuseOk),t.neutral||"—",t.tube||"—",fmt(t.margin,2),t.diagnosis].map(v=>'<td>'+v+'</td>').join("")+'</tr>').join("")+'</tbody></table></div></div>';
    }
    function fill(values){if(!canOpen()){close();return;}for(const [key] of [...fieldsA,...fieldsB])form.elements.namedItem(key).value=values[key]??"";update();}
    form.addEventListener("submit",e=>{e.preventDefault();update();});
    form.addEventListener("input",update);
    form.addEventListener("change",update);
    form.querySelector('[data-reset="new"]').addEventListener("click",()=>fill({...EXAMPLE,homes:0,watts:0,services:0,shops:0,garage:0,ev:0,other:0,length:""}));
    form.querySelector('[data-reset="example"]').addEventListener("click",()=>fill(EXAMPLE));
    fill(EXAMPLE);return true;
  }
  return {open,close};
}
