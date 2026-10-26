// Busqueda de obra y pedidos: lecturas bajo el RLS existente, sin RPC ni escrituras.
export const PROJECT_PAGE_SIZE = 20;

export function labelLineKind(kind) {
  const names = {
    unknown: "Sin clasificar",
    environmental_fee: "RAEE / ecotasa",
    freight: "Portes / transporte",
    service: "Servicio",
    service_candidate: "Posible servicio",
  };
  return names[kind] || (kind ? String(kind) : "Sin clasificar");
}

export function projectNamePattern(value) {
  return "%" + String(value).replace(/[%_\\]/g, (m) => "\\" + m) + "%";
}

export async function findMatchingProjects(client, value) {
  const response = await client.from("projects")
    .select("id,name")
    .ilike("name", projectNamePattern(value))
    .order("name", { ascending: true })
    .limit(101);
  if (response.error) throw response.error;
  if ((response.data || []).length > 100) {
    throw new Error("Hay demasiadas obras coincidentes. Escribe un nombre más específico.");
  }
  return response.data || [];
}

export async function fetchProjectOrders(client, projectId, offset, pageSize = PROJECT_PAGE_SIZE) {
  const response = await client.from("orders")
    .select("id,order_reference,order_year,order_number,order_subnumber,order_date,declared_total,source_filename,order_identity_status,suppliers(name)", { count: "exact" })
    .eq("project_id", projectId)
    .order("order_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (response.error) throw response.error;
  return { orders: response.data || [], total: response.count };
}

export async function fetchOriginalOrderLines(client, orderId) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const response = await client.from("order_lines")
      .select("id,order_id,line_number,source_row,quantity,supplier_reference,description_original,pvp,discount_raw,net_unit_price,total_price,line_kind")
      .eq("order_id", orderId)
      .order("line_number", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (response.error) throw response.error;
    const page = response.data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

export function initProjectLookup({ client, money, number, displayDiscount, escapeHtml }) {
  const status = document.getElementById("orderLookupStatus");
  const results = document.getElementById("orderLookupResults");
  const footer = document.getElementById("orderLookupFooter");
  const moreButton = document.getElementById("orderLookupMoreButton");
  let generation = 0;
  let projects = [];
  let selected = null;
  let offset = 0;
  let total = null;
  let loading = false;
  const orderIds = new Set();
  const lineCache = new Map();

  function dateLabel(value) {
    const m = String(value || "").match(/^(\d{4})-(\d\d)-(\d\d)$/);
    return m ? m[3] + "/" + m[2] + "/" + m[1] : (value || "Sin fecha");
  }
  function supplierName(relation) {
    const row = Array.isArray(relation) ? relation[0] : relation;
    return row?.name || "Proveedor sin identificar";
  }
  function orderLabel(order) {
    return order.order_reference ||
      (String(order.order_year || "").slice(-2) + "/" + order.order_number +
        (order.order_subnumber ? "." + order.order_subnumber : ""));
  }
  function statusForCurrent() {
    if (!selected) return;
    const counted = total == null ? "" : " de " + total;
    status.textContent = selected.name + " · Mostrando " + offset + counted +
      (offset === 1 ? " pedido." : " pedidos.") +
      (total != null && offset >= total ? " Fin de resultados." : "");
  }
  function choicesHtml() {
    return '<div class="order-project-chooser"><div class="order-project-chooser-title">' +
      "Obras coincidentes (" + projects.length + "). Selecciona una para no mezclar pedidos de obras distintas." +
      '</div><div class="order-project-options">' +
      projects.map((p) => '<button type="button" class="order-project-option' +
        (selected && String(selected.id) === String(p.id) ? ' is-selected' : '') +
        '" data-project-id="' + escapeHtml(p.id) + '">' + escapeHtml(p.name) + '</button>').join("") +
      '</div></div>';
  }
  function buildCard(order) {
    const id = String(order.id);
    const conflict = order.order_identity_status === "conflict"
      ? '<span class="order-project-conflict">Revisar identidad</span>' : "";
    return '<article class="order-project-card" data-project-order="' + escapeHtml(id) + '">' +
      '<div class="order-project-card-top"><div><span class="order-lookup-kicker">Pedido</span>' +
      '<h3>' + escapeHtml(orderLabel(order)) + '</h3></div>' +
      '<span class="order-project-date">' + escapeHtml(dateLabel(order.order_date)) + '</span></div>' +
      '<div class="order-project-meta">' +
      '<span><strong>Proveedor:</strong> ' + escapeHtml(supplierName(order.suppliers)) + '</span>' +
      '<span><strong>Total declarado:</strong> ' + escapeHtml(money(order.declared_total)) + '</span>' +
      conflict + '</div>' +
      '<p class="order-project-source"><strong>Archivo:</strong> ' +
      escapeHtml(order.source_filename || "No indicado") + '</p>' +
      '<button type="button" class="order-project-expand" data-expand-order="' + escapeHtml(id) +
      '" aria-expanded="false" aria-controls="order-project-lines-' + escapeHtml(id) +
      '">Ver líneas del pedido ▾</button>' +
      '<div id="order-project-lines-' + escapeHtml(id) +
      '" class="order-project-details" data-order-details="' + escapeHtml(id) +
      '" hidden></div></article>';
  }
  function renderLines(lines) {
    if (!lines.length) return '<div class="order-lookup-empty">Pedido sin líneas consultables.</div>';
    const body = lines.map((line) => '<tr><td>' + escapeHtml(line.line_number ?? "—") +
      '</td><td>' + escapeHtml(line.supplier_reference || "—") +
      '</td><td class="order-lookup-description">' + escapeHtml(line.description_original || "—") +
      '</td><td>' + escapeHtml(number(line.quantity, 4)) +
      '</td><td>' + escapeHtml(money(line.pvp)) +
      '</td><td>' + escapeHtml(displayDiscount(line.discount_raw)) +
      '</td><td>' + escapeHtml(money(line.net_unit_price)) +
      '</td><td>' + escapeHtml(money(line.total_price)) +
      '</td><td>' + escapeHtml(labelLineKind(line.line_kind)) + '</td></tr>').join("");
    return '<p class="order-project-linecount">' + lines.length +
      (lines.length === 1 ? " línea original" : " líneas originales") + '</p>' +
      '<div class="order-lookup-table-scroll"><table class="order-lookup-table">' +
      '<thead><tr><th>Nº</th><th>Referencia</th><th>Descripción original</th><th>Cantidad</th>' +
      '<th>PVP/u</th><th>Descuento</th><th>Neto/u</th><th>Total</th><th>Clasificación</th>' +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }
  function cancel() {
    ++generation;
    projects = [];
    selected = null;
    offset = 0;
    total = null;
    loading = false;
    orderIds.clear();
    lineCache.clear();
    footer.classList.add("hidden");
  }
  function selectProject(id) {
    const project = projects.find((p) => String(p.id) === String(id));
    if (!project) return;
    const myGeneration = ++generation;
    selected = project;
    offset = 0;
    total = null;
    loading = false;
    orderIds.clear();
    lineCache.clear();
    footer.classList.add("hidden");
    results.innerHTML = choicesHtml() +
      '<section class="order-project-list" data-project-list></section>' +
      '<p class="order-lookup-footnote">Consulta de solo lectura. Las líneas originales incluyen servicios, portes y ecotasas cuando existan. No se recalculan precios.</p>';
    status.textContent = "Consultando pedidos de " + project.name + "…";
    return loadMore(myGeneration);
  }
  async function loadMore(requestGeneration = generation) {
    if (loading || !selected || requestGeneration !== generation) return;
    loading = true;
    moreButton.disabled = true;
    const start = offset;
    try {
      const page = await fetchProjectOrders(client, selected.id, start);
      if (requestGeneration !== generation) return;
      total = page.total;
      const list = results.querySelector("[data-project-list]");
      if (!list) return;
      for (const order of page.orders) {
        if (orderIds.has(String(order.id))) continue;
        orderIds.add(String(order.id));
        list.insertAdjacentHTML("beforeend", buildCard(order));
      }
      offset = start + page.orders.length;
      if (offset === 0) {
        list.innerHTML = '<div class="order-lookup-empty">Esta obra no tiene pedidos registrados.</div>';
      }
      footer.classList.toggle("hidden",
        page.orders.length < PROJECT_PAGE_SIZE || (total != null && offset >= total));
      statusForCurrent();
    } catch (error) {
      if (requestGeneration !== generation) return;
      console.error("Error al consultar pedidos de obra:", error);
      status.textContent = "Error al cargar pedidos de " + selected.name +
        ". Pulsa «Mostrar 20 más» para reintentar.";
      footer.classList.remove("hidden");
    } finally {
      if (requestGeneration === generation) {
        loading = false;
        moreButton.disabled = false;
      }
    }
  }
  async function toggleLines(button, orderId) {
    const panel = results.querySelector('[data-order-details="' + orderId + '"]');
    if (!panel) return;
    if (!panel.hidden) {
      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
      button.textContent = "Ver líneas del pedido ▾";
      return;
    }
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    button.textContent = "Ocultar líneas del pedido ▴";
    if (lineCache.has(orderId)) {
      panel.innerHTML = renderLines(lineCache.get(orderId));
      return;
    }
    const myGeneration = generation;
    button.disabled = true;
    panel.innerHTML = '<p class="order-project-linecount">Cargando líneas originales…</p>';
    try {
      const lines = await fetchOriginalOrderLines(client, Number(orderId));
      if (myGeneration !== generation || !panel.isConnected) return;
      lineCache.set(orderId, lines);
      panel.innerHTML = renderLines(lines);
    } catch (error) {
      if (myGeneration !== generation || !panel.isConnected) return;
      console.error("Error al consultar líneas de pedido:", error);
      panel.innerHTML = '<p class="order-lookup-warning">No se han podido cargar las líneas. Cierra y vuelve a desplegar el pedido para reintentar.</p>';
    } finally {
      if (myGeneration === generation && panel.isConnected) button.disabled = false;
    }
  }
  async function search(raw) {
    cancel();
    const query = String(raw || "").trim();
    results.replaceChildren();
    if (query.length < 2) {
      status.textContent = "Escribe al menos dos caracteres del nombre de la obra.";
      return;
    }
    const myGeneration = generation;
    status.textContent = "Buscando obras que contengan «" + query + "»…";
    try {
      const found = await findMatchingProjects(client, query);
      if (myGeneration !== generation) return;
      projects = found;
      if (!projects.length) {
        status.textContent = "No se encontraron obras con ese nombre.";
        results.innerHTML = '<div class="order-lookup-empty">Prueba con otra parte del nombre de la obra.</div>';
        return;
      }
      const exact = projects.find((p) => String(p.name).trim().toLocaleLowerCase("es") === query.toLocaleLowerCase("es"));
      if (exact || projects.length === 1) {
        return await selectProject((exact || projects[0]).id);
      }
      results.innerHTML = choicesHtml();
      status.textContent = projects.length + " obras coincidentes. Selecciona una para ver sus pedidos.";
    } catch (error) {
      if (myGeneration !== generation) return;
      console.error("Error al buscar obra:", error);
      status.textContent = error?.message?.startsWith("Hay demasiadas")
        ? error.message : "No se ha podido consultar las obras. Comprueba la conexión.";
    }
  }
  results.addEventListener("click", (event) => {
    const choose = event.target.closest("[data-project-id]");
    if (choose) { selectProject(choose.dataset.projectId); return; }
    const expand = event.target.closest("[data-expand-order]");
    if (expand) toggleLines(expand, expand.dataset.expandOrder);
  });
  moreButton.addEventListener("click", () => loadMore());
  return { search, cancel };
}
