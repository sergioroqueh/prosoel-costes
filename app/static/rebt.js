import { REBT_COURSE, REBT_SOURCE } from "./rebt_normas.js?v=20261117-r5";
import { initRebtLegacy } from "./rebt_legacy.js?v=20261117-r5";

const html = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const isStudy = (id) => /^N-(ART|ITC)-\d\d$/.test(String(id || ""));
const asDay = (value) => {
  if (!value) return "—";
  try { return new Date(value).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"numeric",timeZone:"Europe/Madrid"}); }
  catch { return "—"; }
};
function staticLink(item) {
  return '<a class="rebt5-official-link" href="'+html(item.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Abrir texto íntegro del '+html(item.code)+' en el BOE ↗</a>';
}

export function initRebt({container,teaser,client,canOpen,onNavigate}) {
  const legacyContainer=document.createElement("div");
  const legacyTeaser=document.createElement("div");
  const legacy=initRebtLegacy({
    container:legacyContainer,teaser:legacyTeaser,client,canOpen,onNavigate:()=>activateView("repaso")
  });
  let userId=null, authGeneration=0, progress=new Map(), progressLoaded=false;
  let progressPromise=null, selectedId=null, mode="normativa", filter="all", query="", isSaving=false, notice="", mounted=false;
  const allowed=()=>Boolean(userId&&canOpen());
  const completed=(id)=>Boolean(progress.get(id)?.completed_at);
  const nextPending=()=>REBT_COURSE.find((item)=>!completed(item.id))||REBT_COURSE[0];
  const selected=()=>REBT_COURSE.find((item)=>item.id===selectedId)||nextPending();
  let normHost, listHost, detailHost, countHost, titleHost, searchHost, statusHost;

  function reset() {
    authGeneration++;
    legacy.reset();
    userId=null;
    progress.clear();progressLoaded=false;progressPromise=null;
    selectedId=null;mode="normativa";filter="all";query="";isSaving=false;notice="";mounted=false;
    container.replaceChildren();teaser.replaceChildren();teaser.classList.add("hidden");
    normHost=null;listHost=null;detailHost=null;countHost=null;titleHost=null;searchHost=null;statusHost=null;
  }
  function setUser(user) {
    reset();
    if(!canOpen()||!user?.id)return;
    userId=user.id;
    legacy.setUser(user);
    showTeaser();
    void loadProgress();
  }
  function showTeaser() {
    if(!allowed()){teaser.classList.add("hidden");return;}
    const item=nextPending(), allDone=REBT_COURSE.every(x=>completed(x.id));
    teaser.classList.remove("hidden");
    teaser.innerHTML='<div class="rebt-teaser-copy"><small>REBT · Estudio normativo</small><strong>'+
      (allDone?'Recorrido completo':html(item.code+" · "+item.title))+
      '</strong></div><button type="button" class="rebt-primary">Continuar</button>';
    teaser.querySelector("button").addEventListener("click",()=>{if(allowed())onNavigate();});
  }
  async function loadProgress() {
    if(progressLoaded||!allowed())return;
    if(progressPromise)return progressPromise;
    const actor=userId,generation=authGeneration;
    progressPromise=(async()=>{
      try{
        const {data,error}=await client.from("rebt_lesson_progress")
          .select("lesson_id,completed_at,favorite,last_answered_correct").eq("user_id",actor);
        if(!allowed()||actor!==userId||generation!==authGeneration)return;
        if(error)throw error;
        progress=new Map((data||[]).filter(row=>isStudy(row.lesson_id)).map(row=>[row.lesson_id,row]));
        progressLoaded=true;notice="";
        showTeaser();
        if(mounted)renderView();
      }catch(error){
        if(allowed()&&actor===userId&&generation===authGeneration){
          notice="No se ha podido sincronizar el progreso. La lectura del BOE sigue disponible.";
          if(mounted)renderView();
        }
      }
    })();
    try{await progressPromise;}finally{if(generation===authGeneration)progressPromise=null;}
  }
  function mount() {
    if(mounted)return;
    container.innerHTML='<div class="rebt5-app">'+
      '<header class="rebt5-top"><div><small>FORMACIÓN · REGULACIÓN ELÉCTRICA</small><h2>Aprende REBT</h2>'+
      '<p>Estudia norma por norma, siguiendo el texto reglamentario.</p></div><span class="rebt5-owner">Privado · Sergio</span></header>'+
      '<nav class="rebt5-switch" aria-label="Tipo de estudio"><button type="button" data-course-view="normativa">Mi recorrido por el REBT</button>'+
      '<button type="button" data-course-view="repaso">Repaso de conocimientos (88)</button></nav>'+
      '<div class="rebt5-norm" id="rebt5Norm"></div>'+
      '<div class="rebt5-legacy hidden" id="rebt5Legacy"></div></div>';
    normHost=container.querySelector("#rebt5Norm");
    const legacyMount=container.querySelector("#rebt5Legacy");
    legacyMount.append(legacyContainer);
    container.querySelectorAll("[data-course-view]").forEach(btn=>btn.addEventListener("click",()=>activateView(btn.dataset.courseView)));
    normHost.innerHTML='<div class="rebt5-progress" id="rebt5Progress"></div>'+
      '<div class="rebt5-layout"><aside class="rebt5-contents" aria-label="Índice del REBT">'+
      '<div class="rebt5-toc-heading"><strong>Índice del reglamento</strong><small>29 artículos · 52 ITC</small></div>'+
      '<input id="rebt5Search" type="search" placeholder="Buscar artículo, ITC o materia..." aria-label="Buscar en el índice">'+
      '<div class="rebt5-filters"><button type="button" data-status="all">Todas</button>'+
      '<button type="button" data-status="pending">Pendientes</button>'+
      '<button type="button" data-status="completed">Leídas</button></div>'+
      '<div id="rebt5Toc" class="rebt5-toc" role="navigation" aria-label="Artículos e ITC"></div></aside>'+
      '<article id="rebt5Detail" class="rebt5-detail" aria-live="polite"></article></div>';
    listHost=normHost.querySelector("#rebt5Toc");
    detailHost=normHost.querySelector("#rebt5Detail");
    countHost=normHost.querySelector("#rebt5Progress");
    searchHost=normHost.querySelector("#rebt5Search");
    searchHost.addEventListener("input",()=>{query=searchHost.value;renderList({reset:true});});
    normHost.querySelectorAll("[data-status]").forEach(btn=>btn.addEventListener("click",()=>{
      filter=btn.dataset.status;renderList({reset:true});
    }));
    mounted=true;
  }
  async function activateView(which) {
    if(!allowed())return;
    mount();
    mode=which==="repaso"?"repaso":"normativa";
    renderView();
    if(mode==="repaso")await legacy.open();
  }
  function renderView(){
    if(!mounted||!allowed())return;
    const normative=mode!=="repaso";
    normHost.classList.toggle("hidden",!normative);
    container.querySelector("#rebt5Legacy").classList.toggle("hidden",normative);
    container.querySelectorAll("[data-course-view]").forEach(btn=>{
      const chosen=btn.dataset.courseView===mode;
      btn.classList.toggle("is-current",chosen);
      btn.setAttribute("aria-pressed",String(chosen));
    });
    if(normative){renderProgress();renderList();renderDetail();}
  }
  function renderProgress() {
    const count=REBT_COURSE.filter(item=>completed(item.id)).length;
    countHost.innerHTML='<div><strong>'+count+' / '+REBT_COURSE.length+'</strong> apartados registrados como leídos'+
      '<small>Lectura secuencial · sin ciclo automático que borre tu avance</small></div>'+
      '<div class="rebt5-bar" role="progressbar" aria-valuemin="0" aria-valuemax="'+REBT_COURSE.length+'" aria-valuenow="'+count+'">'+
      '<span style="width:'+(count/REBT_COURSE.length*100).toFixed(1)+'%"></span></div>';
  }
  function renderList({reset=false}={}) {
    if(!listHost)return;
    const scroll=reset?0:listHost.scrollTop;
    normHost.querySelectorAll("[data-status]").forEach(btn=>btn.classList.toggle("is-current",btn.dataset.status===filter));
    const q=query.trim().toLocaleLowerCase("es");
    const items=REBT_COURSE.filter(item=>(filter==="all" || (filter==="completed"&&completed(item.id)) || (filter==="pending"&&!completed(item.id))) &&
      (!q || [item.code,item.title,item.section,...(item.points||[])].join(" ").toLocaleLowerCase("es").includes(q)));
    let previousType="";
    listHost.innerHTML=items.map(item=>{
      const heading=item.type!==previousType?'<div class="rebt5-group-label">'+(item.type==="art"?"REGLAMENTO · ARTÍCULOS":"INSTRUCCIONES TÉCNICAS")+'</div>':"";
      previousType=item.type;
      return heading+'<button type="button" data-unit="'+item.id+'" class="rebt5-unit'+(selected().id===item.id?' selected':'')+'"><span>'+
        '<strong>'+html(item.code)+'</strong><small>'+html(item.title)+'</small></span><span class="rebt5-mark">'+(completed(item.id)?"✓":"·")+'</span></button>';
    }).join("")||'<p class="rebt5-empty">No hay apartados con estos filtros.</p>';
    listHost.scrollTop=scroll;
    listHost.querySelectorAll("[data-unit]").forEach(btn=>btn.addEventListener("click",()=>{
      selectedId=btn.dataset.unit;
      listHost.querySelectorAll("[data-unit]").forEach(other=>other.classList.toggle("selected",other===btn));
      renderDetail();
      if(window.matchMedia("(max-width:900px)").matches){
        requestAnimationFrame(()=>detailHost.scrollIntoView({block:"start",behavior:"smooth"}));
      }
    }));
  }
  function renderDetail() {
    if(!detailHost||!allowed())return;
    const item=selected();
    const studied=completed(item.id);
    const isSummary=item.readMode==="synopsis";
    let content;
    if(isSummary) {
      content='<details class="rebt5-reading rebt5-notes"><summary>Notas de comprensión (opcional)</summary>'+
        '<p>'+html(item.summary)+'</p><ul>'+item.points.map(point=>'<li>'+html(point)+'</li>').join("")+'</ul></details>';
    } else {
      content='<section class="rebt5-reading rebt5-source-mode"><h4>Lectura del texto oficial</h4>'+
        '<p>Esta instrucción todavía no tiene una ficha interna revisada apartado por apartado. Para estudiarla, abre el texto íntegro del BOE y sigue sus apartados, tablas, notas y excepciones. No se muestra un resumen inventado.</p>'+
        '</section>';
    }
    const excerpt=item.sourceExcerpt?
      '<div class="rebt5-verbatim"><strong>Texto reglamentario · extracto literal</strong><blockquote>'+html(item.sourceExcerpt)+
      '</blockquote><small>Es un fragmento; no reemplaza la lectura del artículo o ITC completos.</small></div>':"";
    detailHost.innerHTML='<div class="rebt5-path">'+html(item.section)+'</div>'+
      '<h3>'+html(item.code)+' · '+html(item.title)+'</h3>'+
      '<p class="rebt5-source-date">RD 842/2002 · BOE, texto consolidado; última actualización publicada: 03/09/2025</p>'+
      excerpt+
      '<div class="rebt5-primary"><strong>Texto oficial íntegro</strong><p>Consulta en el BOE todos los apartados, tablas, condiciones y excepciones antes de marcar esta unidad como estudiada.</p>'+
      staticLink(item)+'</div>'+
      (isSummary?'<p class="rebt5-synthesis-note">Síntesis orientada y contrastada con el BOE: NO es una transcripción literal ni reemplaza apartados, tablas o excepciones.</p>':"")+
      content+
      '<div class="rebt5-confirm"><label><input type="checkbox" id="rebt5ReadAck"'+(studied?' checked':'')+
        '> He consultado el texto completo de esta unidad en el BOE</label>'+
      '<div class="rebt5-buttons"><button type="button" id="rebt5Save" class="rebt5-main-action"'+(studied?' disabled':'')+
        '>'+(studied?'✓ Marcada como leída':'Registrar lectura')+'</button>'+
      '<button type="button" id="rebt5Next">Ir al siguiente apartado</button>'+
      (studied?'<button type="button" id="rebt5Undo">Marcar como pendiente</button>':'')+'</div>'+
      (studied?'<small>Estudiada el '+asDay(progress.get(item.id)?.completed_at)+'</small>':"")+
      '<p id="rebt5Status" role="status">'+html(notice)+'</p></div>';
    const acknowledge=detailHost.querySelector("#rebt5ReadAck");
    const saveButton=detailHost.querySelector("#rebt5Save");
    saveButton.disabled=studied||!acknowledge.checked||isSaving;
    acknowledge.addEventListener("change",()=>{saveButton.disabled=studied||!acknowledge.checked||isSaving;});
    saveButton.addEventListener("click",()=>{if(acknowledge.checked&&!studied)void save(item.id,{completed_at:new Date().toISOString()});});
    detailHost.querySelector("#rebt5Undo")?.addEventListener("click",()=>void save(item.id,{completed_at:null}));
    detailHost.querySelector("#rebt5Next").addEventListener("click",()=>{
      const currentIndex=REBT_COURSE.findIndex(unit=>unit.id===item.id);
      const candidate=REBT_COURSE.slice(currentIndex+1).find(unit=>!completed(unit.id))||
        REBT_COURSE.find(unit=>!completed(unit.id))||
        REBT_COURSE[(currentIndex+1)%REBT_COURSE.length];
      selectedId=candidate.id;notice="";renderList();renderDetail();
      if(window.matchMedia("(max-width:900px)").matches)requestAnimationFrame(()=>detailHost.scrollIntoView({block:"start",behavior:"smooth"}));
    });
  }
  async function save(id,patch) {
    if(!allowed()||isSaving)return;
    const actor=userId,generation=authGeneration;
    const prior=progress.get(id)||{lesson_id:id,completed_at:null,favorite:false,last_answered_correct:null};
    const next={...prior,...patch,user_id:actor,updated_at:new Date().toISOString()};
    isSaving=true;notice="Guardando...";
    const status=detailHost.querySelector("#rebt5Status");
    if(status)status.textContent=notice;
    try {
      const {error}=await client.from("rebt_lesson_progress").upsert(next,{onConflict:"user_id,lesson_id"});
      if(!allowed()||actor!==userId||generation!==authGeneration)return;
      if(error)throw error;
      progress.set(id,next);progressLoaded=true;notice="Lectura guardada en tu cuenta.";
      showTeaser();
    }catch {
      if(allowed()&&actor===userId&&generation===authGeneration)notice="No se pudo guardar la lectura. Comprueba tu conexión y vuelve a intentarlo.";
    }finally {
      if(allowed()&&actor===userId&&generation===authGeneration){
        isSaving=false;renderProgress();renderList();renderDetail();
      }
    }
  }
  async function open() {
    if(!allowed())return false;
    mount();renderView();await loadProgress();
    if(!allowed())return false;
    renderView();return true;
  }
  return {reset,setUser,open,renderTeaser:showTeaser};
}
