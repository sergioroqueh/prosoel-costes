// Gráfico SVG propio y accesible, sin dependencias, sin cambios de datos.
export const PRICE_SERIES_COLORS = [
  "#0e9887", "#7456c8", "#205b9b", "#c77937",
  "#3688aa", "#bd5887", "#728e40", "#4c6d84"
];
const DAY = 86400000;

function safe(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatDate(date) {
  const m = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + "/" + m[2] + "/" + m[1] : String(date || "—");
}

function shortDate(stamp) {
  return new Intl.DateTimeFormat("es-ES", { month:"short", year:"2-digit", timeZone:"UTC" })
    .format(new Date(stamp)).replace(".", "");
}

function linePath(points) {
  if (!points.length) return "";
  let d = "M " + points[0].x.toFixed(2) + " " + points[0].y.toFixed(2);
  for(let i=1;i<points.length;i++){
    const a=points[i-1], b=points[i], mid=(a.x+b.x)/2;
    // Tangentes horizontales; pasa por todos los puntos, sin sobresalir del rango.
    d+=" C "+mid.toFixed(2)+" "+a.y.toFixed(2)+" "+
      mid.toFixed(2)+" "+b.y.toFixed(2)+" "+b.x.toFixed(2)+" "+b.y.toFixed(2);
  }
  return d;
}

export function mountPriceTimeline(root, rows, outliers, {
  money, number, validComparisonPrice, orderLabel, supplierOrder = []
}) {
  if (!root) return;
  const full = rows.filter((row)=>validComparisonPrice(row) &&
    Number.isFinite(Date.parse(String(row.order_date || "")+"T00:00:00Z")))
    .map((row) => ({...row, stamp:Date.parse(row.order_date+"T00:00:00Z"),
      price:Number(row.net_unit_price), provider:row.supplier||"Sin proveedor"}))
    .sort((a,b)=>a.stamp-b.stamp || Number(a.order_id||0)-Number(b.order_id||0));
  if(!full.length){
    root.innerHTML='<p class="comparison-note">Sin precios fechados y validados para representar la evolución.</p>';
    return;
  }
  const allProviders=[...new Set([...supplierOrder,...full.map(x=>x.provider)])];
  const colors=new Map(allProviders.map((name,i)=>[name,PRICE_SERIES_COLORS[i%PRICE_SERIES_COLORS.length]]));
  const visible=new Set(allProviders);
  let period="all";
  const maxStamp=full[full.length-1].stamp;
  const periods=[["6m","6M"],["1y","1A"],["2y","2A"],["all","Todo"]];
  const uid="pc"+(++mountPriceTimeline.sequence);
  const W=820, H=290, L=70, R=18, T=23, B=46;

  function refresh(){
    const periodMs=period==="6m"?183*DAY:period==="1y"?365*DAY:period==="2y"?730*DAY:Infinity;
    const filtered=full.filter((row)=>row.stamp>=maxStamp-periodMs);
    const plotted=filtered.filter((row)=>visible.has(row.provider));
    const amounts=plotted.map((row)=>row.price);
    const fromData=filtered.length?filtered[0].stamp:maxStamp;
    const toData=maxStamp;
    const from=fromData===toData?fromData-15*DAY:fromData;
    const to=fromData===toData?toData+15*DAY:toData;
    const min=amounts.length?Math.min(...amounts):0;
    const max=amounts.length?Math.max(...amounts):1;
    const span=Math.max(0.01,max-min);
    const padding=Math.max(span*.22,max*.035,.08);
    const lo=Math.max(0,min-padding);
    const hi=Math.max(max+padding,lo+.01);
    const px=(stamp)=>L+(stamp-from)/(to-from)*(W-L-R);
    const py=(v)=>H-B-(v-lo)/(hi-lo)*(H-T-B);
    const yBottom=H-B;
    let svg='<svg viewBox="0 0 '+W+' '+H+'" class="price-timeline" role="img" aria-label="Precios de compra según fecha y proveedor, con datos reales" preserveAspectRatio="xMidYMid meet">';
    svg+='<defs><filter id="'+uid+'-halo" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4"/></filter>';
    for(let i=0;i<allProviders.length;i++){
      svg+='<linearGradient id="'+uid+'-area-'+i+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+PRICE_SERIES_COLORS[i%PRICE_SERIES_COLORS.length]+'" stop-opacity=".18"/><stop offset="100%" stop-color="'+PRICE_SERIES_COLORS[i%PRICE_SERIES_COLORS.length]+'" stop-opacity="0"/></linearGradient>';
    }
    svg+='</defs>';
    for(let i=0;i<=4;i++){
      const v=lo+(hi-lo)*i/4, yy=py(v);
      svg+='<line x1="'+L+'" y1="'+yy.toFixed(2)+'" x2="'+(W-R)+'" y2="'+yy.toFixed(2)+'" class="price-gridline"/>';
      svg+='<text x="'+(L-12)+'" y="'+(yy+4).toFixed(2)+'" text-anchor="end" class="price-axis-label">'+safe(number(v,2))+'</text>';
    }
    for(let i=0;i<=5;i++){
      const stamp=from+(to-from)*i/5,xx=px(stamp);
      svg+='<line x1="'+xx.toFixed(2)+'" y1="'+T+'" x2="'+xx.toFixed(2)+'" y2="'+yBottom+'" class="price-gridline price-gridline-vertical"/>';
      svg+='<text x="'+xx.toFixed(2)+'" y="'+(H-14)+'" text-anchor="middle" class="price-axis-label">'+safe(shortDate(stamp))+'</text>';
    }
    svg+='<text x="'+L+'" y="12" class="price-axis-unit">NETO €/UD</text>';
    let pointIndex=0;
    const pointsData=[];
    for(const provider of allProviders){
      if(!visible.has(provider))continue;
      const entries=plotted.filter((row)=>row.provider===provider);
      const color=colors.get(provider);
      const pts=entries.map((row)=>({x:px(row.stamp),y:py(row.price),row}));
      const path=linePath(pts);
      const index=allProviders.indexOf(provider);
      if(pts.length>1){
        const first=pts[0],last=pts[pts.length-1];
        svg+='<path d="'+path+' L '+last.x.toFixed(2)+' '+yBottom+' L '+first.x.toFixed(2)+' '+yBottom+' Z" fill="url(#'+uid+'-area-'+index+')" stroke="none"/>';
        svg+='<path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" class="price-series-line"/>';
      }
      for(const point of pts){
        const outlier=outliers.has(point.row.order_line_id);
        const dot=outlier?"#c27425":color;
        const summary=provider+" · "+formatDate(point.row.order_date)+" · "+money(point.row.price)+
          " · Pedido "+orderLabel(point.row)+(outlier?" · Posible precio atípico":"");
        svg+='<circle class="price-point-halo" cx="'+point.x.toFixed(2)+'" cy="'+point.y.toFixed(2)+'" r="10" fill="'+dot+'" opacity=".10"/>';
        svg+='<circle class="price-point" tabindex="0" role="button" data-price-point="'+pointIndex+
          '" aria-label="'+safe(summary)+'" cx="'+point.x.toFixed(2)+'" cy="'+point.y.toFixed(2)+
          '" r="'+(outlier?6:5)+'" fill="'+dot+'" stroke="#ffffff" stroke-width="2.2"><title>'+safe(summary)+'</title></circle>';
        pointsData.push({row:point.row,x:point.x,y:point.y,outlier,color:dot});
        pointIndex++;
      }
    }
    svg+='</svg>';

    root.innerHTML='<section class="price-viz"><div class="price-viz-heading">'+
      '<div class="price-viz-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 6-6 4 3 8-9"/></svg></div>'+
      '<div class="price-viz-heading-copy"><h4>Evolución de precios de compra</h4><span>Neto unitario · compras registradas</span></div>'+
      '<div class="price-viz-toolbar" role="group" aria-label="Periodo de la gráfica">'+
      periods.map(([key,label])=>'<button class="price-period'+(period===key?' active':'')+
        '" type="button" data-period="'+key+'" aria-pressed="'+(period===key)+'">'+label+'</button>').join("")+
      '</div></div>'+
      '<p class="price-viz-scope">Periodo hasta la última compra · '+filtered.length+' de '+full.length+
      ' compras fechadas'+(visible.size!==allProviders.length?' · '+visible.size+' proveedores visibles':'')+'</p>'+
      '<div class="price-svg-wrap">'+svg+
      '<div class="price-insight-tooltip" role="status" aria-live="polite" hidden></div></div>'+
      '<div class="price-viz-legend" role="group" aria-label="Mostrar u ocultar proveedores">'+
      allProviders.map((provider)=>'<button type="button" class="price-legend-chip'+(visible.has(provider)?'':' is-muted')+
        '" data-provider="'+safe(provider)+'" aria-pressed="'+visible.has(provider)+'">'+
        '<span class="price-legend-dot" style="background:'+colors.get(provider)+'"></span>'+safe(provider)+'</button>').join("")+
      '</div><p class="price-viz-footnote">Cada punto representa una línea de compra validada. Precios históricos, no ofertas vigentes; las diferencias pueden reflejar descuentos, cantidades o condiciones comerciales.</p></section>';

    root.querySelectorAll("[data-period]").forEach((button)=>
      button.addEventListener("click",()=>{period=button.dataset.period;refresh();}));
    root.querySelectorAll("[data-provider]").forEach((button)=>
      button.addEventListener("click",()=>{
        const name=button.dataset.provider;
        if(visible.has(name))visible.delete(name); else visible.add(name);
        refresh();
      }));
    const tip=root.querySelector(".price-insight-tooltip");
    const points=root.querySelectorAll("[data-price-point]");
    function show(point){
      const value=pointsData[Number(point.dataset.pricePoint)];
      if(!value)return;
      tip.replaceChildren();
      const label=document.createElement("span");
      label.className="price-tip-provider";
      label.textContent=value.row.provider;
      const valueNode=document.createElement("strong");
      valueNode.textContent=money(value.row.price);
      const info=document.createElement("small");
      info.textContent=formatDate(value.row.order_date)+" · Pedido "+orderLabel(value.row)+(value.outlier?" · Revisar precio atípico":"");
      tip.append(label,valueNode,info);
      tip.style.left=Math.min(80,Math.max(20,value.x/W*100))+"%";
      tip.style.top=Math.max(23,value.y/H*100)+"%";
      tip.hidden=false;
      points.forEach((p)=>p.classList.toggle("is-hovered",p===point));
    }
    function hide(){
      tip.hidden=true;
      points.forEach((p)=>p.classList.remove("is-hovered"));
    }
    points.forEach((point)=>{
      point.addEventListener("pointerenter",()=>show(point));
      point.addEventListener("focus",()=>show(point));
      point.addEventListener("pointerleave",hide);
      point.addEventListener("blur",hide);
      point.addEventListener("click",()=>show(point));
    });
    const wrap=root.querySelector(".price-svg-wrap");
    wrap.addEventListener("pointerleave",hide);
    if(!plotted.length){
      const noData=document.createElement("p");
      noData.className="price-no-visible";
      noData.textContent="No hay compras visibles con estos filtros. Activa otro proveedor o cambia de periodo.";
      wrap.appendChild(noData);
    }
  }
  refresh();
}
mountPriceTimeline.sequence=0;
