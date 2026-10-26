// Consulta de pedidos originales: solo lecturas, sin normalizar ni modificar precios.
export function parseOrderReference(raw) {
  const match = String(raw ?? "").trim().toUpperCase()
    .match(/^(\d{2}|\d{4})\s*[/-]\s*(\d{1,6})(?:\s*\.\s*([A-Z0-9_-]{1,30}))?$/);
  if (!match) return null;
  const year = match[1].length === 2 ? 2000 + Number(match[1]) : Number(match[1]);
  const orderNumber = Number(match[2]);
  if (year < 2000 || year > 2099 || orderNumber < 1) return null;
  const subnumber = match[3] || null;
  return {
    year,
    orderNumber,
    subnumber,
    label: String(year).slice(-2) + "/" + orderNumber + (subnumber ? "." + subnumber : ""),
  };
}

// Conservar cada registro por separado, incluso cuando el numero se repite.
export async function fetchOrdersByReference(client, parsed) {
  const ordersResponse = await client.from("orders")
    .select("id,order_reference,order_year,order_number,order_subnumber,order_date,order_identity_status,validation_status,declared_total,source_filename,suppliers(name),projects(name)")
    .eq("order_year", parsed.year)
    .eq("order_number", parsed.orderNumber)
    .order("id", { ascending: true })
    .limit(200);
  if (ordersResponse.error) throw ordersResponse.error;

  const candidates = ordersResponse.data || [];
  if (candidates.length === 200) {
    throw new Error("Demasiadas coincidencias para mostrar de forma segura.");
  }
  const orders = candidates.filter((order) =>
    !parsed.subnumber ||
    String(order.order_subnumber ?? "").trim().toUpperCase() === parsed.subnumber
  );
  if (!orders.length) return [];
  const ids = orders.map((order) => order.id);

  // El limite habitual de la API es de 1000 filas. Paginar para NO ocultar
  // ninguna partida cuando hay varios pedidos con la misma numeracion.
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const response = await client.from("order_lines")
      .select("id,order_id,line_number,source_row,quantity,supplier_reference,description_original,pvp,discount_raw,net_unit_price,total_price,line_kind")
      .in("order_id", ids)
      .order("order_id", { ascending: true })
      .order("line_number", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (response.error) throw response.error;
    const page = response.data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  const byOrder = new Map(ids.map((id) => [String(id), []]));
  for (const row of rows) {
    const group = byOrder.get(String(row.order_id));
    if (group) group.push(row);
  }
  return orders.map((order) => ({ ...order, lines: byOrder.get(String(order.id)) || [] }));
}

export function initOrderLookup({ client, money, number, displayDiscount, escapeHtml, projectLookup = null, classifyOriginalLine = null }) {
  const form = document.getElementById("orderLookupForm");
  const input = document.getElementById("orderLookupInput");
  const button = document.getElementById("orderLookupButton");
  const status = document.getElementById("orderLookupStatus");
  const results = document.getElementById("orderLookupResults");
  let generation = 0;

  function displayLineKind(kind) {
    const kinds = {
      unknown: "Sin clasificar",
      environmental_fee: "RAEE / ecotasa",
      freight: "Portes / transporte",
      service: "Servicio",
      service_candidate: "Posible servicio",
    };
    return kinds[kind] || (kind ? String(kind) : "Sin clasificar");
  }
  function formattedDate(value) {
    const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? match[3] + "/" + match[2] + "/" + match[1] : (value || "Sin fecha");
  }
  function relationName(relation, fallback) {
    const item = Array.isArray(relation) ? relation[0] : relation;
    return item?.name || fallback;
  }
  function fact(label, value) {
    return '<div class="order-lookup-fact"><span>' + escapeHtml(label) +
      '</span><strong>' + escapeHtml(value) + '</strong></div>';
  }
  function showOrders(orders, parsed) {
    if (!orders.length) {
      results.innerHTML = '<div class="order-lookup-empty">No se ha encontrado el pedido ' +
        escapeHtml(parsed.label) + ' entre los pedidos cargados. Comprueba el año o la numeración.</div>';
      status.textContent = "Sin coincidencias.";
      return;
    }
    status.textContent = orders.length + (orders.length === 1 ? " pedido encontrado." : " registros de pedido encontrados.");
    const html = [];
    if (orders.length > 1) {
      html.push('<p class="order-lookup-warning">Hay varios registros con esta numeración. Se muestran por separado para no mezclar proveedores, archivos ni líneas originales.</p>');
    }
    for (const order of orders) {
      const label = order.order_reference || parsed.label;
      const supplier = relationName(order.suppliers, "Proveedor sin identificar");
      const project = relationName(order.projects, "Obra sin identificar");
      html.push('<article class="order-lookup-card"><div class="order-lookup-card-head"><div>');
      html.push('<div class="order-lookup-kicker">Pedido original</div><h3>' + escapeHtml(label) + '</h3>');
      html.push('</div><span class="order-lookup-linecount">' + order.lines.length +
        (order.lines.length === 1 ? " línea" : " líneas") + '</span></div>');
      html.push('<div class="order-lookup-facts">');
      html.push(fact("Fecha", formattedDate(order.order_date)));
      html.push(fact("Proveedor", supplier));
      html.push(fact("Obra", project));
      html.push(fact("Total declarado", money(order.declared_total)));
      html.push('</div><p class="order-lookup-source"><strong>Archivo de origen:</strong> ' +
        escapeHtml(order.source_filename || "No indicado") + '</p>');
      if (order.order_identity_status === "conflict") {
        html.push('<p class="order-lookup-warning">Este pedido tiene un conflicto de identidad pendiente de revisar.</p>');
      }
      if (!order.lines.length) {
        html.push('<p class="order-lookup-empty">Pedido registrado sin líneas consultables.</p>');
      } else {
        if (classifyOriginalLine) {
          const proposed = order.lines.map((line) => classifyOriginalLine(line));
          const materials = proposed.filter((item) => item.kind === "material").length;
          const pending = proposed.filter((item) =>
            item.kind === "pending" || item.kind === "service_candidate").length;
          html.push('<p class="order-lookup-classification-summary">Propuestas: ' + materials +
            ' materiales · ' + pending + ' pendientes de revisión</p>');
        }
        html.push('<div class="order-lookup-table-scroll"><table class="order-lookup-table"><thead><tr>' +
          '<th>Nº</th><th>Referencia</th><th>Descripción original</th><th>Cantidad</th>' +
          '<th>PVP/u</th><th>Descuento</th><th>Neto/u</th><th>Total</th><th>Clasificación sugerida</th><th>Familia</th>' +
          '</tr></thead><tbody>');
        for (const line of order.lines) {
          const classification = classifyOriginalLine ? classifyOriginalLine(line) : {
            kindLabel: displayLineKind(line.line_kind), familyLabel: "—",
            reason: "Clasificación registrada en el pedido",
          };
          html.push('<tr><td>' + escapeHtml(line.line_number ?? "—") +
            '</td><td>' + escapeHtml(line.supplier_reference || "—") +
            '</td><td class="order-lookup-description">' + escapeHtml(line.description_original || "—") +
            '</td><td>' + escapeHtml(number(line.quantity, 4)) +
            '</td><td>' + escapeHtml(money(line.pvp)) +
            '</td><td>' + escapeHtml(displayDiscount(line.discount_raw)) +
            '</td><td>' + escapeHtml(money(line.net_unit_price)) +
            '</td><td>' + escapeHtml(money(line.total_price)) +
            '</td><td class="order-line-kind" title="' + escapeHtml(classification.reason) +
            '">' + escapeHtml(classification.kindLabel) +
            '</td><td>' + escapeHtml(classification.familyLabel) + '</td></tr>');
        }
        html.push('</tbody></table></div>');
      }
      html.push('</article>');
    }
    html.push('<p class="order-lookup-footnote">Consulta de solo lectura. Se incluyen todas las líneas originales, también portes y ecotasas si existen. No se recalculan ni se consolidan precios.</p>');
    results.innerHTML = html.join("");
  }

  async function search(event) {
    if (event) event.preventDefault();
    const raw = input.value.trim();
    const parsed = parseOrderReference(raw);
    const requestId = ++generation;
    projectLookup?.cancel();
    results.replaceChildren();
    if (!parsed) {
      if (!raw || /^d{2,4}s*[/-]/.test(raw) || !projectLookup) {
        button.disabled = false;
        status.textContent = raw
          ? "Referencia de pedido incompleta. Usa, por ejemplo, 26/775."
          : "Escribe un número de pedido o el nombre de una obra.";
        input.focus();
        return;
      }
      button.disabled = true;
      try {
        await projectLookup.search(raw);
      } finally {
        if (requestId === generation) button.disabled = false;
      }
      return;
    }
    button.disabled = true;
    status.textContent = "Consultando el pedido " + parsed.label + "…";
    try {
      const orders = await fetchOrdersByReference(client, parsed);
      if (requestId !== generation) return;
      showOrders(orders, parsed);
    } catch (error) {
      if (requestId !== generation) return;
      console.error("Error al consultar el pedido:", error);
      status.textContent = "No se ha podido consultar el pedido. Comprueba la conexión e inténtalo de nuevo.";
    } finally {
      if (requestId === generation) button.disabled = false;
    }
  }

  form.addEventListener("submit", search);
  return {
    focus() { input.focus(); },
    reset() {
      ++generation;
      input.value = "";
      button.disabled = false;
      status.textContent = 'Escribe un número de pedido o el nombre de una obra.';
      projectLookup?.cancel();
      results.replaceChildren();
    },
  };
}
