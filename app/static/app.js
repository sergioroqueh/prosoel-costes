const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultsNode = document.getElementById("results");
const resultCount = document.getElementById("resultCount");
const detailPanel = document.getElementById("detailPanel");
const orderCounter = document.getElementById("orderCounter");
const resultTemplate = document.getElementById("resultTemplate");

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(Number(value));
}

function number(value, digits) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: digits === undefined ? 2 : digits
  }).format(Number(value));
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function orderLabel(row) {
  if (row.order_year && row.order_number) {
    let value = String(row.order_year).slice(-2) + "/" + row.order_number;
    if (row.order_subnumber) value += "." + row.order_subnumber;
    return value;
  }
  return row.order_reference || "Sin nº";
}

async function loadCounter() {
  try {
    const year = new Date().getFullYear();
    const response = await fetch("/api/orders/counter?year=" + year);
    if (!response.ok) return;
    const data = await response.json();
    const last = data.last_registered === null ? "—" : String(year).slice(-2) + "/" + data.last_registered;
    const next = data.next_expected === null ? "—" : String(year).slice(-2) + "/" + data.next_expected;
    orderCounter.querySelector("strong").textContent =
      "Último: " + last + " · Siguiente: " + next + " · Huecos: " + data.pending_gaps;
  } catch (_) {
    orderCounter.querySelector("strong").textContent = "Contador no disponible";
  }
}

async function runSearch() {
  const query = searchInput.value.trim();
  if (query.length < 2) return;

  searchButton.disabled = true;
  searchButton.textContent = "Buscando…";
  resultsNode.className = "results";
  resultsNode.innerHTML = '<div class="empty-state">Buscando en histórico y catálogo…</div>';

  try {
    const response = await fetch("/api/search?q=" + encodeURIComponent(query));
    if (!response.ok) throw new Error("search");
    const data = await response.json();
    renderResults(data.results || []);
  } catch (_) {
    resultsNode.innerHTML = '<div class="empty-state">No se pudo ejecutar la búsqueda.</div>';
    resultCount.textContent = "";
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "Buscar";
  }
}

function renderResults(rows) {
  resultsNode.innerHTML = "";
  resultCount.textContent = rows.length + (rows.length === 1 ? " resultado" : " resultados");

  if (!rows.length) {
    resultsNode.innerHTML = '<div class="empty-state">No encontramos coincidencias. Prueba con menos palabras o una descripción más general.</div>';
    return;
  }

  rows.forEach(function (row) {
    const fragment = resultTemplate.content.cloneNode(true);
    const button = fragment.querySelector(".result-card");
    const title = fragment.querySelector(".result-title");
    const meta = fragment.querySelector(".result-meta");
    const price = fragment.querySelector(".result-price");
    const badge = fragment.querySelector(".purchase-badge");

    button.classList.add(row.kind === "material" ? "verified" : "pending");
    title.textContent = row.title || "Sin descripción";

    const metaParts = [];
    if (row.reference) metaParts.push(row.reference);
    if (row.manufacturer) metaParts.push(row.manufacturer);
    metaParts.push(row.kind === "material" ? "Material consolidado" : "Histórico pendiente");
    if (row.last_supplier) metaParts.push("Último: " + row.last_supplier);
    meta.textContent = metaParts.join(" · ");

    price.textContent = money(row.last_net_price);
    badge.textContent =
      number(row.purchase_count, 0) +
      (Number(row.purchase_count) === 1 ? " compra" : " compras");

    button.addEventListener("click", function () {
      if (row.kind === "material" && row.id) {
        openMaterial(row.id);
      } else {
        openHistorical(row);
      }
    });

    resultsNode.appendChild(fragment);
  });
}

async function openMaterial(materialId) {
  detailPanel.innerHTML = '<div class="empty-state">Cargando ficha y procedencia de precios…</div>';
  try {
    const responses = await Promise.all([
      fetch("/api/materials/" + materialId),
      fetch("/api/materials/" + materialId + "/prices")
    ]);
    if (!responses[0].ok || !responses[1].ok) throw new Error("detail");

    const detail = await responses[0].json();
    const priceData = await responses[1].json();
    renderMaterialDetail(detail, priceData.rows || []);
  } catch (_) {
    detailPanel.innerHTML = '<div class="empty-state">No se pudo cargar la ficha del material.</div>';
  }
}

async function openHistorical(row) {
  detailPanel.innerHTML = '<div class="empty-state">Cargando compras históricas…</div>';
  const params = new URLSearchParams();
  params.set("description", row.title || "");
  if (row.reference) params.set("reference", row.reference);

  try {
    const response = await fetch("/api/historical/prices?" + params.toString());
    if (!response.ok) throw new Error("history");
    const data = await response.json();
    renderHistoricalDetail(row, data.rows || []);
  } catch (_) {
    detailPanel.innerHTML = '<div class="empty-state">No se pudo cargar el histórico.</div>';
  }
}

function priceSummary(rows) {
  const valid = rows
    .map(function (row) { return Number(row.net_unit_price); })
    .filter(function (value) { return Number.isFinite(value) && value > 0; })
    .sort(function (a, b) { return a - b; });

  if (!valid.length) return { min: null, median: null, max: null };

  const middle = Math.floor(valid.length / 2);
  const median = valid.length % 2
    ? valid[middle]
    : (valid[middle - 1] + valid[middle]) / 2;

  return { min: valid[0], median: median, max: valid[valid.length - 1] };
}

function renderMaterialDetail(detail, rows) {
  const latest = rows.find(function (row) {
    return row.net_unit_price !== null && Number(row.net_unit_price) > 0;
  }) || rows[0];
  const summary = priceSummary(rows);

  const html = [];
  html.push('<div class="detail-header">');
  html.push('<div><h2>' + escapeHtml(detail.canonical_name) + '</h2>');
  html.push('<div class="detail-subtitle">');
  html.push(escapeHtml([detail.manufacturer, detail.manufacturer_reference].filter(Boolean).join(" · ")));
  html.push('</div></div>');
  html.push('<span class="status-badge ok">Verificado / consolidado</span>');
  html.push('</div>');

  html.push('<div class="stats-grid">');
  html.push(statHtml("Compras", number(detail.purchase_count, 0)));
  html.push(statHtml("Último neto", latest ? money(latest.net_unit_price) : "—"));
  html.push(statHtml("Mediana", money(summary.median)));
  html.push(statHtml("Rango", summary.min === null ? "—" : money(summary.min) + " – " + money(summary.max)));
  html.push('</div>');

  if (latest) {
    html.push('<div class="price-origin">');
    html.push('<div class="price-origin-title">¿De dónde sale el último precio?</div>');
    html.push('<p><strong>' + money(latest.net_unit_price) + '</strong> · Pedido ' + escapeHtml(orderLabel(latest)) + ' · ' + escapeHtml(latest.supplier || "Proveedor no indicado") + '</p>');
    html.push('<p>' + escapeHtml(latest.order_date || "Sin fecha") + ' · Cantidad ' + number(latest.quantity, 2) + ' · PVP ' + money(latest.pvp) + ' · Dto. ' + escapeHtml(latest.discount_raw || "—") + '</p>');
    html.push('<button class="action-button" id="showLatestOrigin" type="button">Ver línea de origen</button>');
    html.push('<div id="latestOriginDetail" class="origin-detail hidden"></div>');
    html.push('</div>');
  }

  html.push('<div class="section-title"><h3>Histórico de compras</h3><span class="muted">' + rows.length + ' líneas</span></div>');
  html.push(historyTableHtml(rows));
  detailPanel.innerHTML = html.join("");

  if (latest) {
    const button = document.getElementById("showLatestOrigin");
    const box = document.getElementById("latestOriginDetail");
    button.addEventListener("click", function () {
      box.classList.toggle("hidden");
      box.innerHTML = originHtml(latest);
    });
  }

  wireOriginButtons(rows);
}

function renderHistoricalDetail(result, rows) {
  const latest = rows.find(function (row) {
    return row.net_unit_price !== null && Number(row.net_unit_price) > 0;
  }) || rows[0];
  const summary = priceSummary(rows);

  const html = [];
  html.push('<div class="detail-header">');
  html.push('<div><h2>' + escapeHtml(result.title) + '</h2>');
  html.push('<div class="detail-subtitle">' + escapeHtml(result.reference || "Sin referencia") + '</div></div>');
  html.push('<span class="status-badge pending">Pendiente de normalizar</span>');
  html.push('</div>');

  html.push('<div class="stats-grid">');
  html.push(statHtml("Compras", number(result.purchase_count, 0)));
  html.push(statHtml("Último neto", latest ? money(latest.net_unit_price) : "—"));
  html.push(statHtml("Mediana", money(summary.median)));
  html.push(statHtml("Rango", summary.min === null ? "—" : money(summary.min) + " – " + money(summary.max)));
  html.push('</div>');

  html.push('<div class="price-origin">');
  html.push('<div class="price-origin-title">Dato histórico utilizable con cautela</div>');
  html.push('<p>Este resultado todavía no está consolidado como material canónico, pero puedes ver exactamente en qué pedidos aparece y qué precio tuvo.</p>');
  html.push('</div>');

  html.push('<div class="section-title"><h3>Procedencia</h3><span class="muted">' + rows.length + ' líneas</span></div>');
  html.push(historyTableHtml(rows));
  detailPanel.innerHTML = html.join("");
  wireOriginButtons(rows);
}

function statHtml(label, value) {
  return '<div class="stat"><span class="stat-label">' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
}

function historyTableHtml(rows) {
  if (!rows.length) return '<div class="empty-state">No hay líneas históricas asociadas.</div>';

  const html = [];
  html.push('<div class="history-wrap"><table class="history-table"><thead><tr>');
  html.push('<th>Fecha</th><th>Pedido</th><th>Proveedor</th><th>Cant.</th><th>PVP</th><th>Dto.</th><th>Neto</th><th>Origen</th>');
  html.push('</tr></thead><tbody>');

  rows.forEach(function (row, index) {
    html.push('<tr>');
    html.push('<td>' + escapeHtml(row.order_date || "—") + '</td>');
    html.push('<td>' + escapeHtml(orderLabel(row)) + '</td>');
    html.push('<td>' + escapeHtml(row.supplier || "—") + '</td>');
    html.push('<td>' + number(row.quantity, 2) + '</td>');
    html.push('<td>' + money(row.pvp) + '</td>');
    html.push('<td>' + escapeHtml(row.discount_raw || "—") + '</td>');
    html.push('<td><strong>' + money(row.net_unit_price) + '</strong></td>');
    html.push('<td><button class="origin-link" type="button" data-origin-index="' + index + '">Ver origen</button></td>');
    html.push('</tr>');
    html.push('<tr id="origin-row-' + index + '" class="hidden"><td colspan="8"><div class="origin-detail">' + originHtml(row) + '</div></td></tr>');
  });

  html.push('</tbody></table></div>');
  return html.join("");
}

function originHtml(row) {
  const parts = [];
  parts.push('<strong>Pedido:</strong> ' + escapeHtml(orderLabel(row)));
  parts.push('<strong>Proveedor:</strong> ' + escapeHtml(row.supplier || "—"));
  parts.push('<strong>Fecha:</strong> ' + escapeHtml(row.order_date || "—"));
  parts.push('<strong>Obra:</strong> ' + escapeHtml(row.project || "—"));
  parts.push('<strong>Referencia de compra:</strong> ' + escapeHtml(row.supplier_reference || "—"));
  parts.push('<strong>Descripción original:</strong> ' + escapeHtml(row.description_original || "—"));
  parts.push('<strong>Cantidad:</strong> ' + number(row.quantity, 3));
  parts.push('<strong>PVP:</strong> ' + money(row.pvp));
  parts.push('<strong>Descuento:</strong> ' + escapeHtml(row.discount_raw || "—"));
  parts.push('<strong>Neto unitario:</strong> ' + money(row.net_unit_price));
  parts.push('<strong>Total:</strong> ' + money(row.total_price));
  parts.push('<strong>Archivo origen:</strong> ' + escapeHtml(row.source_filename || "—"));
  return parts.join("<br>");
}

function wireOriginButtons(rows) {
  detailPanel.querySelectorAll("[data-origin-index]").forEach(function (button) {
    button.addEventListener("click", function () {
      const index = button.getAttribute("data-origin-index");
      const row = document.getElementById("origin-row-" + index);
      if (row) row.classList.toggle("hidden");
    });
  });
}

searchButton.addEventListener("click", runSearch);
searchInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") runSearch();
});

loadCounter();
