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

export async function downloadTrackingClaimsXlsx(groups, {from, to, generatedAt, supplier}) {
  if (!groups.length) throw new Error("No hay materiales pendientes entre los pedidos mostrados.");
  // Se carga únicamente al hacer clic. Los datos no salen del navegador: solo se descarga la biblioteca.
  const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
  const workbook = XLSX.utils.book_new();
  const names = safeTrackingSheetNames(groups);
  const heading = ["Pedido", "Fecha pedido", "Obra", "Referencia", "Material pendiente",
    "Cantidad solicitada", "Pendiente orientativo", "Estado / observaciones", "Albarán"];
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
    ws["!cols"] = [{wch:15},{wch:14},{wch:38},{wch:19},{wch:70},{wch:20},{wch:23},{wch:77},{wch:22}];
    ws["!merges"] = [0,1,2,3].map(r => ({s:{r,c:0},e:{r,c:8}}));
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
