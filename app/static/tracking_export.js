// Exportación local, bajo demanda, de las reclamaciones de la vista filtrada.
// Nunca sube el libro a ningún servidor ni transforma observaciones dudosas en entregas confirmadas.

export function buildTrackingClaimGroups(visibleOrders, {isDelivered, interpretObservation, workName, prettyDate}) {
  const groups = new Map();
  for (const order of visibleOrders) {
    if (order._state !== "open") continue;
    const pending = (order.lines || []).filter(line => !isDelivered(line));
    if (!pending.length) continue;
    const supplier = String(order.supplier || "SIN PROVEEDOR").trim() || "SIN PROVEEDOR";
    if (!groups.has(supplier)) groups.set(supplier, {supplier, rows: [], orders: new Set()});
    const group = groups.get(supplier);
    group.orders.add(String(order.source_id) + ":" + String(order.id));
    for (const line of pending) {
      const observation = interpretObservation(line.observations, line.requested_qty);
      const requested = line.requested_qty == null ? null : Number(line.requested_qty);
      const validQty = Number.isFinite(requested) && requested >= 0;
      const manuallyMarked = Boolean(line.source_green && !line.source_si);
      // No afirmar como cierta la cantidad restante inferida de una observación.
      const estimated = !validQty || manuallyMarked || observation.kind === "review" ? null :
        observation.kind === "probable" ? Math.max(0, requested - observation.received) : requested;
      let note = "Sin recepción confirmada · verificar con almacén";
      if (manuallyMarked) note = "Marca verde sin SI · revisar antes de reclamar";
      else if (observation.kind === "review") note = "Observación libre · REVISAR ANTES DE RECLAMAR";
      else if (observation.kind === "probable") note = "POSIBLE RESTO, NO CONFIRMADO · " +
        observation.received + " anotadas como recibidas";
      if (line.observations) note += " · Nota origen: " + String(line.observations);
      group.rows.push([
        String(order.order_reference || ""),
        prettyDate(order.order_date),
        String(workName(order.source_id) || ""),
        String(line.reference || ""),
        String(line.description || ""),
        validQty ? requested : "",
        estimated == null ? "" : estimated,
        note,
        String(line.albaran || "")
      ]);
    }
  }
  return [...groups.values()].sort((a,b) => a.supplier.localeCompare(b.supplier,"es"));
}

export function safeTrackingSheetNames(groups) {
  const used = new Set();
  return groups.map(group => {
    const base = String(group.supplier).replace(/[\\/?*\[\]:]/g, " ").replace(/\s+/g," ").trim().slice(0,31) || "Proveedor";
    let name = base;
    for (let i = 2; used.has(name.toLocaleLowerCase("es")); i++) {
      const suffix = " " + i;
      name = base.slice(0,31 - suffix.length) + suffix;
    }
    used.add(name.toLocaleLowerCase("es"));
    return name;
  });
}

// La edición libre de SheetJS no escribe los estilos .s del libro.
// Esta variante es compatible con la API existente y sí conserva los estilos de celda.
let styledXlsxPromise;
function loadStyledXlsx() {
  if (window.XLSX?.utils?.aoa_to_sheet) return Promise.resolve(window.XLSX);
  if (!styledXlsxPromise) {
    styledXlsxPromise = new Promise((resolve,reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.min.js";
      script.async = true;
      script.onload = () => window.XLSX?.utils?.aoa_to_sheet
        ? resolve(window.XLSX)
        : reject(new Error("La librería de Excel no se inicializó correctamente."));
      script.onerror = () => reject(new Error("No se pudo cargar la librería de Excel."));
      document.head.appendChild(script);
    }).catch(error => { styledXlsxPromise = null; throw error; });
  }
  return styledXlsxPromise;
}

// Paleta PROSOEL: azul técnico, naranja corporativo y fondos suaves para lectura.
// Formato Excel con decimales reales: evita que enteros como 2 se muestren "2,".
export function trackingQuantityNumberFormat(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || Number.isInteger(n)) return "#,##0";
  const fraction = n.toFixed(10).split(".")[1].replace(/0+$/, "");
  return fraction ? "#,##0." + "0".repeat(fraction.length) : "#,##0";
}

export function styleTrackingClaimsWorksheet(ws, rows) {
  const C = {
    navy:"0B2342", blue:"144A65", teal:"1B5362", orange:"E86C38",
    pale:"E9F2F7", stripe:"F3F8FB", white:"FFFFFF", ink:"21384D",
    muted:"597185", edge:"D8E5ED", amber:"FFF3DE", amberInk:"9B561F",
    orangePale:"FFF7ED"
  };
  const fill = rgb => ({patternType:"solid",fgColor:{rgb}});
  const font = (rgb,sz=10,bold=false,italic=false) =>
    ({name:"Aptos",sz,bold,italic,color:{rgb}});
  const baseBorder = {bottom:{style:"hair",color:{rgb:C.edge}}};
  const cellAt = (r,c) => {
    const address = String.fromCharCode(65+c) + (r+1);
    return ws[address] || (ws[address] = {t:"s",v:""});
  };
  const paint = (r, config) => {
    for (let c=0;c<9;c++) cellAt(r,c).s = {
      fill:fill(config.bg),
      font:font(config.fg,config.size,config.bold,config.italic),
      alignment:{vertical:"center",horizontal:config.horizontal||"left",wrapText:!!config.wrap},
      ...(config.border?{border:config.border}:{})
    };
  };
  paint(0,{bg:C.navy,fg:C.white,size:19,bold:true});
  paint(1,{bg:C.blue,fg:C.white,size:12,bold:true});
  paint(2,{bg:C.pale,fg:C.ink,size:10});
  paint(3,{bg:C.amber,fg:C.amberInk,size:10,italic:true,wrap:true});
  paint(4,{bg:C.white,fg:C.ink,size:10});
  // Encabezados azul corporativo con una línea naranja de separación.
  paint(5,{bg:C.navy,fg:C.white,size:10,bold:true,wrap:true,
    border:{bottom:{style:"medium",color:{rgb:C.orange}}}});
  const footer = rows.length+7;
  paint(footer,{bg:C.pale,fg:C.muted,size:10,italic:true,wrap:true});
  for (let i=0;i<rows.length;i++) {
    const r=i+6, line=rows[i], background=i%2===0?C.white:C.stripe;
    paint(r,{bg:background,fg:C.ink,size:10,wrap:true,border:baseBorder});
    for (const c of [0,1,3]) {
      const cell = cellAt(r,c);
      cell.s.font = font(C.blue,10,c===0||c===3);
    }
    for (const c of [1,5,6]) cellAt(r,c).s.alignment.horizontal="center";
    for (const c of [5,6]) cellAt(r,c).s.numFmt=trackingQuantityNumberFormat(line[c]);
    // Se distingue la cantidad pendiente sin alterar los números calculados.
    if (line[6] !== "" && line[6] != null) {
      const pending = cellAt(r,6);
      pending.s.font = font(C.amberInk,11,true);
      pending.s.fill = fill(C.orangePale);
    }
    const flagged = /REVISAR|NO CONFIRMADO|sin SI/i.test(String(line[7]||""));
    if (flagged) {
      cellAt(r,7).s.fill = fill(C.amber);
      cellAt(r,7).s.font = font(C.amberInk,10);
    }
    const previous=rows[i-1];
    const isNewOrder = !previous ||
      [0,1,2].some(k => previous[k] !== line[k]);
    if (isNewOrder) {
      cellAt(r,0).s.border={
        left:{style:"medium",color:{rgb:C.orange}},
        bottom:{style:"hair",color:{rgb:C.edge}}
      };
    }
  }
  ws["!rows"] = [
    {hpt:39},{hpt:29},{hpt:24},{hpt:32},{hpt:10},{hpt:36},
    ...rows.map(()=>({hpt:43})),
    {hpt:11},{hpt:29}
  ];
}

export async function downloadTrackingClaimsXlsx(groups, {from, to, generatedAt, supplier}) {
  if (!groups.length) throw new Error("No hay materiales pendientes entre los pedidos mostrados.");
  // Se carga únicamente al hacer clic. Los datos no salen del navegador: solo se descarga la biblioteca.
  const XLSX = await loadStyledXlsx();
  const workbook = XLSX.utils.book_new();
  const names = safeTrackingSheetNames(groups);
  const heading = ["Pedido", "Fecha pedido", "Obra", "Referencia", "Material pendiente",
    "Cantidad solicitada", "Pendiente", "Estado / observaciones", "Albarán"];
  groups.forEach((group,index) => {
    const table = [
      ["PROSOEL · RECLAMACIÓN DE MATERIAL PENDIENTE"],
      ["Proveedor / almacén: " + group.supplier],
      ["Generado: " + generatedAt + "  |  Pedidos: " + from + " a " + to],
      ["DATOS PARA REVISAR: las cantidades parciales son orientativas, no entregas faltantes confirmadas."],
      [],
      heading,
      ...group.rows,
      [],
      ["Documento de seguimiento para consulta del proveedor. Contrastar cantidades y observaciones antes de enviar."]
    ];
    const ws = XLSX.utils.aoa_to_sheet(table);
    ws["!cols"] = [{wch:15},{wch:16},{wch:36},{wch:20},{wch:60},{wch:20},{wch:17},{wch:67},{wch:22}];
    styleTrackingClaimsWorksheet(ws,group.rows);
    ws["!merges"] = [0,1,2,3,group.rows.length+7].map(r => ({s:{r,c:0},e:{r,c:8}}));
    ws["!autofilter"] = {ref:"A6:I" + (group.rows.length + 6)};
    XLSX.utils.book_append_sheet(workbook,ws,names[index]);
  });
  workbook.Props = {Title:"Reclamación de material pendiente", Subject:"Seguimiento PROSOEL", Author:"PROSOEL"};
  const bytes = XLSX.write(workbook,{bookType:"xlsx",type:"array",compression:true});
  const blob = new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const url = URL.createObjectURL(blob);
  const day = generatedAt.replace(/\D/g,"").slice(0,8) || "fecha";
  const selected = supplier ? "_" + supplier.replace(/[^a-z0-9-]/gi,"_").slice(0,40) : "_Por_proveedor";
  const filename = "PROSOEL_Reclamaciones" + selected + "_" + day + ".xlsx";
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url),60000); }
  return {
    filename,
    supplierCount: groups.length,
    lineCount: groups.reduce((n,group) => n + group.rows.length,0),
    orderCount: groups.reduce((n,group) => n + group.orders.size,0)
  };
}
