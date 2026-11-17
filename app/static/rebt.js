import { REBT_LESSONS } from "./rebt_lessons.js?v=20261117-r1";
const BOE = "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099";
const GUIDE = "https://industria.gob.es/Calidad-Industrial/seguridadindustrial/instalacionesindustriales/baja-tension/Paginas/guia-tecnica-aplicacion.aspx";
const escapeHtml = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
export function madridDate(date = new Date()) {
  const pieces = new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Madrid",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const get = (type) => pieces.find((p) => p.type === type).value;
  return get("year") + "-" + get("month") + "-" + get("day");
}
export function dailyRebtLesson(date = madridDate()) {
  const [year,month,day] = date.split("-").map(Number);
  const number = Math.floor((Date.UTC(year,month-1,day)-Date.UTC(2026,10,17))/86400000);
  return REBT_LESSONS[((number % REBT_LESSONS.length)+REBT_LESSONS.length)%REBT_LESSONS.length];
}
export function initRebt({container,teaser,client,canOpen,onNavigate}) {
  let userId = null, loaded = false, selectedId = null, selectedAnswer = null, checked = false, saving = false;
  let records = new Map(), filter = "all", search = "", message = "";
  const allowed = () => Boolean(userId && canOpen());
  const progress = (id) => records.get(id) || {lesson_id:id,completed_at:null,favorite:false,last_answered_correct:null};
  function reset() {
    userId=null;loaded=false;selectedId=null;selectedAnswer=null;checked=false;saving=false;
    records.clear();filter="all";search="";message="";
    container.replaceChildren();teaser.replaceChildren();teaser.classList.add("hidden");
  }
  function setUser(user) { reset(); if (!canOpen() || !user?.id) return; userId=user.id; renderTeaser(); }
  function renderTeaser() {
    if (!allowed()) { teaser.classList.add("hidden"); return; }
    const lesson=dailyRebtLesson(), done=Boolean(progress(lesson.id).completed_at);
    teaser.classList.remove("hidden");
    teaser.innerHTML='<div class="rebt-teaser-copy"><small>APRENDE REBT · 2 MIN AL DÍA</small><strong>'+escapeHtml(lesson.title)+
      '</strong><span>'+escapeHtml(lesson.code)+(done?' · ✓ Aprendida':' · Lección de hoy')+'</span></div><button type="button" class="rebt-primary">Estudiar ahora</button>';
    teaser.querySelector("button").addEventListener("click",()=>{if(allowed())onNavigate();});
  }
  async function load() {
    if (loaded || !allowed()) return;
    const actor=userId;
    const {data,error}=await client.from("rebt_lesson_progress")
      .select("lesson_id,completed_at,favorite,last_answered_correct").eq("user_id",actor);
    if (!allowed() || actor!==userId) return;
    if (error) { message="Progreso no sincronizado: comprobar migración REBT en Supabase."; return; }
    records=new Map((data||[]).map((row)=>[row.lesson_id,row]));loaded=true;message="";
    renderTeaser();
  }
  async function save(id,change) {
    if (!allowed() || saving) return;
    const actor=userId, next={...progress(id),...change,user_id:actor,updated_at:new Date().toISOString()};
    saving=true;
    const {error}=await client.from("rebt_lesson_progress").upsert(next,{onConflict:"user_id,lesson_id"});
    saving=false;
    if (!allowed() || actor!==userId) return;
    if (error) message="No se ha guardado. Comprueba la migración y los permisos.";
    else { records.set(id,next);loaded=true;message="Progreso guardado.";renderTeaser(); }
    render();
  }
  function list() {
    const host=container.querySelector("#rebtLibrary");
    if (!host) return;
    const q=search.trim().toLocaleLowerCase("es");
    const items=REBT_LESSONS.filter((l)=>{
      const p=progress(l.id);
      return (filter==="all" || (filter==="completed"&&p.completed_at) ||
        (filter==="pending"&&!p.completed_at) || (filter==="favorite"&&p.favorite)) &&
        (!q || [l.title,l.topic,l.code,l.summary].join(" ").toLocaleLowerCase("es").includes(q));
    });
    host.innerHTML=items.length ? items.map((l)=>{
      const p=progress(l.id);
      return '<button type="button" data-lesson="'+l.id+'" class="rebt-list-button'+(l.id===selectedId?' active':'')+'"><span><strong>'+
        escapeHtml(l.title)+'</strong><small>'+escapeHtml(l.code)+' · '+escapeHtml(l.topic)+'</small></span><span>'+
        (p.favorite?'★ ':'')+(p.completed_at?'✓':'→')+'</span></button>';
    }).join("") : '<p class="rebt-empty">No hay resultados.</p>';
    host.querySelectorAll("[data-lesson]").forEach((b)=>b.addEventListener("click",()=>{
      if (!allowed()) return;
      selectedId=b.dataset.lesson;selectedAnswer=null;checked=false;message="";render();
    }));
  }
  function render() {
    if (!allowed()) { container.replaceChildren(); return; }
    const lesson=REBT_LESSONS.find((l)=>l.id===selectedId)||dailyRebtLesson();
    selectedId=lesson.id;
    const p=progress(lesson.id), count=[...records.values()].filter((r)=>r.completed_at).length;
    const answers=lesson.options.map((text,i)=>{
      const style=checked?(i===lesson.correct?' right':selectedAnswer===i?' wrong':''):'';
      return '<label class="rebt-answer'+style+'"><input type="radio" name="rebtAnswer" value="'+i+'"'+
        (selectedAnswer===i?' checked':'')+(checked?' disabled':'')+'> '+escapeHtml(text)+'</label>';
    }).join("");
    container.innerHTML='<header class="rebt-head"><div><span>HERRAMIENTAS · FORMACIÓN</span><h2>Aprende REBT</h2><p>Microlecciones aplicadas a presupuestos eléctricos.</p></div><strong>Solo Sergio</strong></header>'+
      '<div class="rebt-count">'+count+' de '+REBT_LESSONS.length+' lecciones completadas · Contenido piloto</div>'+
      '<div class="rebt-layout"><aside class="rebt-library"><h3>Biblioteca</h3><input id="rebtSearch" type="search" placeholder="Buscar ITC o tema" value="'+escapeHtml(search)+'">'+
      '<div class="rebt-filters">'+[["all","Todas"],["pending","Pendientes"],["favorite","Favoritas"],["completed","Completadas"]].map(([key,name])=>
        '<button type="button" data-filter="'+key+'"'+(filter===key?' class="active"':'')+'>'+name+'</button>').join("")+
      '</div><div id="rebtLibrary" class="rebt-list"></div></aside><article class="rebt-lesson"><small>'+escapeHtml(lesson.code)+' · '+escapeHtml(lesson.topic)+' · 2 min</small>'+
      '<h3>'+escapeHtml(lesson.title)+'</h3><p class="rebt-summary">'+escapeHtml(lesson.summary)+'</p>'+
      '<section class="rebt-case"><strong>Aplicación en PROSOEL</strong><p>'+escapeHtml(lesson.application)+'</p></section>'+
      '<section class="rebt-quiz"><h4>Pregunta rápida</h4><p>'+escapeHtml(lesson.question)+'</p>'+answers+
      (checked?'<p class="'+(selectedAnswer===lesson.correct?'correct':'incorrect')+'">'+
        (selectedAnswer===lesson.correct?'✓ Correcto. ':'Revisar: ')+escapeHtml(lesson.explanation)+'</p>':'')+
      '<button class="rebt-primary" id="rebtCheck" type="button"'+(selectedAnswer===null||checked||saving?' disabled':'')+'>Comprobar respuesta</button></section>'+
      '<div class="rebt-links"><strong>Fuente: '+escapeHtml(lesson.code)+'</strong><a href="'+BOE+'" target="_blank" rel="noopener noreferrer">REBT consolidado · BOE</a>'+
      '<a href="'+GUIDE+'" target="_blank" rel="noopener noreferrer">Guías del Ministerio (no vinculantes)</a>'+
      '<small>Lectura divulgativa. Comprobar siempre la norma vigente y las condiciones del proyecto. Revisado: '+lesson.reviewedOn+'</small></div>'+
      '<div class="rebt-actions"><button id="rebtFav" type="button">'+(p.favorite?'★ Favorita':'☆ Añadir a favoritos')+'</button>'+
      '<button id="rebtDone" type="button">'+(p.completed_at?'✓ Marcar pendiente':'Marcar aprendida')+'</button>'+
      '<button id="rebtToday" type="button">Lección de hoy</button></div><p class="rebt-message" role="status">'+escapeHtml(message)+'</p></article></div>';
    const input=container.querySelector("#rebtSearch");
    input.addEventListener("input",()=>{search=input.value;list();});
    container.querySelectorAll("[data-filter]").forEach((b)=>b.addEventListener("click",()=>{filter=b.dataset.filter;render();}));
    container.querySelectorAll('[name="rebtAnswer"]').forEach((b)=>b.addEventListener("change",()=>{
      selectedAnswer=Number(b.value);container.querySelector("#rebtCheck").disabled=false;
    }));
    container.querySelector("#rebtCheck").addEventListener("click",()=>{if(selectedAnswer!==null&&!checked){checked=true;save(lesson.id,{last_answered_correct:selectedAnswer===lesson.correct});}});
    container.querySelector("#rebtFav").addEventListener("click",()=>save(lesson.id,{favorite:!p.favorite}));
    container.querySelector("#rebtDone").addEventListener("click",()=>save(lesson.id,{completed_at:p.completed_at?null:new Date().toISOString()}));
    container.querySelector("#rebtToday").addEventListener("click",()=>{selectedId=dailyRebtLesson().id;selectedAnswer=null;checked=false;render();});
    list();
  }
  async function open(){if(!allowed()){reset();return false;}if(!selectedId)selectedId=dailyRebtLesson().id;await load();if(!allowed())return false;render();return true;}
  return {setUser,renderTeaser,open,reset};
}
