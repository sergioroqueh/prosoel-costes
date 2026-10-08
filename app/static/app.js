import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const recoveryButton = document.getElementById("recoveryButton");
const passwordSetup = document.getElementById("passwordSetup");
const newPasswordInput = document.getElementById("newPasswordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");
const savePasswordButton = document.getElementById("savePasswordButton");
const passwordSetupMessage = document.getElementById("passwordSetupMessage");
const logoutButton = document.getElementById("logoutButton");
const currentUser = document.getElementById("currentUser");

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultsNode = document.getElementById("results");
const resultCount = document.getElementById("resultCount");
const detailPanel = document.getElementById("detailPanel");
const orderCounter = document.getElementById("orderCounter");
const resultTemplate = document.getElementById("resultTemplate");
const supplierFilter = document.getElementById("supplierFilter");
const supplierCombobox = document.getElementById("supplierCombobox");
const supplierSuggestions = document.getElementById("supplierSuggestions");
const yearFilter = document.getElementById("yearFilter");
const sortFilter = document.getElementById("sortFilter");
const resetFiltersButton = document.getElementById("resetFiltersButton");
const moreResultsButton = document.getElementById("moreResultsButton");
const resultsFooter = document.getElementById("resultsFooter");

let searchGeneration = 0;
let detailGeneration = 0;
let visibleRows = [];
let totalResults = 0;
let suppliers = [];
let selectedSupplierId = null; // null = Todos los proveedores
let supplierCandidates = [];
let highlightedSupplierIndex = -1;


function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(value));
}

function number(value, digits = 2) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: digits,
  }).format(Number(value));
}

// Los descuentos originales permanecen conservados en Supabase y en la procedencia.
function displayDiscount(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return "—";
  if (text.toUpperCase() === "NETO") return "Neto";
  if (/[|;/]/.test(text)) return text;
  const numeric = Number(text.replace("%", "").replace(",", "."));
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) return text;
  if (text.includes("%")) return number(numeric, 2) + " %";
  if (numeric <= 1) return number(numeric * 100, 2) + " %";
  return number(numeric, 2) + " %";
}

function selectedFilters() {
  return {
    supplierId: selectedSupplierId,
    year: yearFilter.value ? Number(yearFilter.value) : null,
    sort: sortFilter.value || "relevance",
  };
}

function normalizeSupplierName(value) {
  return String(value || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim().toLocaleLowerCase("es-ES");
}

function supplierLabel(id) {
  return suppliers.find((entry) => entry.id === id)?.name || "";
}

function closeSupplierSuggestions({ restore = true } = {}) {
  supplierSuggestions.classList.add("hidden");
  supplierFilter.setAttribute("aria-expanded", "false");
  supplierFilter.removeAttribute("aria-activedescendant");
  highlightedSupplierIndex = -1;
  supplierCandidates = [];
  if (restore) supplierFilter.value = selectedSupplierId === null ? "" : supplierLabel(selectedSupplierId);
}

function highlightSupplierOption(index) {
  if (!supplierCandidates.length) return;
  highlightedSupplierIndex = (index + supplierCandidates.length) % supplierCandidates.length;
  supplierSuggestions.querySelectorAll(".supplier-option").forEach((button, i) => {
    button.classList.toggle("is-active", i === highlightedSupplierIndex);
  });
  const active = supplierSuggestions.querySelectorAll(".supplier-option")[highlightedSupplierIndex];
  if (active) {
    supplierFilter.setAttribute("aria-activedescendant", active.id);
    active.scrollIntoView({ block: "nearest" });
  }
}

function selectSupplier(option) {
  const previousId = selectedSupplierId;
  selectedSupplierId = option.id;
  supplierFilter.value = option.id === null ? "" : option.name;
  closeSupplierSuggestions({ restore: false });
  if (previousId !== selectedSupplierId && searchInput.value.trim().length >= 2) {
    runSearch();
  }
}

function showSupplierSuggestions() {
  if (supplierFilter.disabled) return;
  const query = normalizeSupplierName(supplierFilter.value);
  const matches = suppliers
    .filter((entry) => normalizeSupplierName(entry.name).includes(query))
    .sort((a, b) => {
      const aStart = normalizeSupplierName(a.name).startsWith(query) ? 0 : 1;
      const bStart = normalizeSupplierName(b.name).startsWith(query) ? 0 : 1;
      return aStart - bStart || a.name.localeCompare(b.name, "es");
    })
    .slice(0, 12);

  supplierCandidates = query
    ? matches.map((entry) => ({ id: entry.id, name: entry.name }))
    : [{ id: null, name: "Todos los proveedores" }, ...matches.map((entry) => ({ id: entry.id, name: entry.name }))];

  supplierSuggestions.replaceChildren();
  supplierCandidates.forEach((candidate, index) => {
    const button = document.createElement("button");
    button.id = "supplier-choice-" + index;
    button.type = "button";
    button.className = "supplier-option";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(candidate.id === selectedSupplierId));
    button.textContent = candidate.name;
    button.addEventListener("click", () => selectSupplier(candidate));
    supplierSuggestions.appendChild(button);
  });
  if (!supplierCandidates.length) {
    const note = document.createElement("div");
    note.className = "supplier-no-match";
    note.textContent = "No hay proveedores que coincidan. Prueba con otras letras.";
    supplierSuggestions.appendChild(note);
  }
  highlightedSupplierIndex = -1;
  supplierFilter.removeAttribute("aria-activedescendant");
  supplierSuggestions.classList.remove("hidden");
  supplierFilter.setAttribute("aria-expanded", "true");
}

async function loadSuppliers() {
  const { data, error } = await supabase.from("suppliers").select("id,name").order("name");
  if (error) {
    console.error("No se pudieron cargar los proveedores", error);
    supplierFilter.disabled = true;
    supplierFilter.placeholder = "Proveedores no disponibles";
    closeSupplierSuggestions();
    return;
  }
  suppliers = (data || []).map((item) => ({ id: Number(item.id), name: item.name }));
  supplierFilter.disabled = false;
  supplierFilter.placeholder = "Todos los proveedores";
  supplierFilter.value = selectedSupplierId === null ? "" : supplierLabel(selectedSupplierId);
}

supplierFilter.addEventListener("focus", showSupplierSuggestions);
supplierFilter.addEventListener("input", () => {
  if (!supplierFilter.value.trim() && selectedSupplierId !== null) {
    selectSupplier({ id: null, name: "Todos los proveedores" });
  }
  showSupplierSuggestions();
});
supplierFilter.addEventListener("keydown", (event) => {
  const expanded = supplierFilter.getAttribute("aria-expanded") === "true";
  if (event.key === "Escape") {
    closeSupplierSuggestions();
    event.preventDefault();
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (!expanded) {
      showSupplierSuggestions();
      highlightSupplierOption(event.key === "ArrowDown" ? 0 : supplierCandidates.length - 1);
    } else {
      highlightSupplierOption(highlightedSupplierIndex + (event.key === "ArrowDown" ? 1 : -1));
    }
  } else if (event.key === "Enter" && expanded && supplierCandidates.length) {
    event.preventDefault();
    const selection = highlightedSupplierIndex < 0 ? 0 : highlightedSupplierIndex;
    selectSupplier(supplierCandidates[selection]);
  }
});
document.addEventListener("pointerdown", (event) => {
  if (!supplierCombobox.contains(event.target)) closeSupplierSuggestions();
});
supplierCombobox.addEventListener("focusout", (event) => {
  // Mantener el menú durante el click/tap sobre una sugerencia;
  // cerrar al salir del componente por Tab o al tocar otro control.
  if (!supplierCombobox.contains(event.relatedTarget)) closeSupplierSuggestions();
});

function escapeHtml(value) {
  return String(value ?? "")
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

function showLogin(message = "") {
  authView.hidden = false;
  appView.hidden = true;
  authView.classList.remove("hidden");
  appView.classList.add("hidden");
  loginMessage.textContent = message;
}

function showApp(user) {
  authView.hidden = true;
  appView.hidden = false;
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  currentUser.textContent = user.email || "Usuario";
}

async function verifyAccess(user) {
  const { data, error } = await supabase
    .from("app_users")
    .select("email, display_name, role, active")
    .eq("email", user.email)
    .maybeSingle();

  if (error || !data || !data.active) {
    await supabase.auth.signOut();
    showLogin("Tu usuario no está autorizado para PROSOEL Costes.");
    return false;
  }

  currentUser.textContent = data.display_name || data.email;
  return true;
}

async function bootstrapSession() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    showLogin();
    return;
  }

  const user = data.session.user;
  showApp(user);

  if (!(await verifyAccess(user))) return;

  await loadSuppliers();
  await loadCounter();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginButton.disabled = true;
  loginButton.textContent = "Entrando…";
  loginMessage.textContent = "";

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  loginButton.disabled = false;
  loginButton.textContent = "Entrar";

  if (error || !data.user) {
    loginMessage.textContent = "Email o contraseña incorrectos.";
    return;
  }

  showApp(data.user);

  if (!(await verifyAccess(data.user))) return;

  passwordInput.value = "";
  await loadSuppliers();
  await loadCounter();
  searchInput.focus();
});

recoveryButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();

  if (!email) {
    loginMessage.textContent = "Escribe primero tu email.";
    emailInput.focus();
    return;
  }

  recoveryButton.disabled = true;
  recoveryButton.textContent = "Enviando…";
  loginMessage.textContent = "";

  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  recoveryButton.disabled = false;
  recoveryButton.textContent = "Crear / recuperar contraseña";

  if (error) {
    loginMessage.textContent = "No se pudo enviar el correo de recuperación.";
    return;
  }

  loginMessage.textContent = "Correo enviado. Abre el enlace recibido para definir tu contraseña.";
});

savePasswordButton.addEventListener("click", async () => {
  passwordSetupMessage.textContent = "";

  const password = newPasswordInput.value;
  const confirmation = confirmPasswordInput.value;

  if (password.length < 8) {
    passwordSetupMessage.textContent = "La contraseña debe tener al menos 8 caracteres.";
    return;
  }

  if (password !== confirmation) {
    passwordSetupMessage.textContent = "Las contraseñas no coinciden.";
    return;
  }

  savePasswordButton.disabled = true;
  savePasswordButton.textContent = "Guardando…";

  const { data, error } = await supabase.auth.updateUser({ password });

  savePasswordButton.disabled = false;
  savePasswordButton.textContent = "Guardar contraseña";

  if (error || !data.user) {
    passwordSetupMessage.textContent = "No se pudo guardar la contraseña. Solicita un nuevo enlace.";
    return;
  }

  passwordSetup.classList.add("hidden");
  newPasswordInput.value = "";
  confirmPasswordInput.value = "";

  showApp(data.user);

  if (!(await verifyAccess(data.user))) return;

  await loadSuppliers();
  await loadCounter();
  searchInput.focus();
});

logoutButton.addEventListener("click", async () => {
  await supabase.auth.signOut();
  resultsNode.innerHTML = "Escribe una descripción o referencia para empezar.";
  resultCount.textContent = "";
  detailPanel.innerHTML = '<div class="empty-state">Selecciona un material para ver precios, compras y trazabilidad.</div>';
  showLogin();
});

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    showLogin();
    passwordSetup.classList.remove("hidden");
    passwordSetupMessage.textContent = "";
    return;
  }

  if (event === "SIGNED_OUT" || !session) {
    showLogin();
    return;
  }

  if (event === "SIGNED_IN" && session?.user) {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const isInviteOrRecovery =
      params.get("type") === "invite" ||
      params.get("type") === "recovery" ||
      hash.get("type") === "invite" ||
      hash.get("type") === "recovery";

    if (isInviteOrRecovery) {
      showLogin();
      passwordSetup.classList.remove("hidden");
      return;
    }
  }
});

async function loadCounter() {
  const year = new Date().getFullYear();

  const { data, error } = await supabase.rpc("order_counter", {
    p_year: year,
  });

  if (error || !data || !data.length) {
    orderCounter.querySelector("strong").textContent = "Contador no disponible";
    return;
  }

  const row = data[0];
  const yy = String(year).slice(-2);
  const last = row.last_registered === null ? "—" : yy + "/" + row.last_registered;
  const next = row.next_expected === null ? "—" : yy + "/" + row.next_expected;

  orderCounter.querySelector("strong").textContent =
    "Último: " + last +
    " · Siguiente: " + next +
    " · Huecos: " + (row.pending_gaps ?? 0);
}

async function runSearch({ append = false } = {}) {
  const query = searchInput.value.trim();
  if (query.length < 2) {
    ++searchGeneration;
    visibleRows = [];
    totalResults = 0;
    resultCount.textContent = "";
    resultsFooter.classList.add("hidden");
    resultsNode.innerHTML = '<div class="empty-state">Escribe al menos dos caracteres.</div>';
    return;
  }
  const requestId = ++searchGeneration;
  const filters = selectedFilters();

  if (!append) {
    ++detailGeneration;
    visibleRows = [];
    totalResults = 0;
    detailPanel.innerHTML = '<div class="empty-state">Selecciona un material para ver el detalle de sus compras.</div>';
    resultsNode.className = "results";
    resultsNode.innerHTML = '<div class="empty-state">Buscando en el histórico completo…</div>';
    resultsFooter.classList.add("hidden");
  }
  searchButton.disabled = true;
  searchButton.textContent = "Buscando…";
  moreResultsButton.disabled = true;

  const { data, error } = await supabase.rpc("search_costs_filtered", {
    search_query: query,
    result_limit: 30,
    p_supplier_id: filters.supplierId,
    p_year: filters.year,
    p_sort: filters.sort,
    p_offset: append ? visibleRows.length : 0,
  });
  if (requestId !== searchGeneration) return;

  searchButton.disabled = false;
  searchButton.textContent = "Buscar";
  moreResultsButton.disabled = false;

  if (error) {
    console.error("Error de búsqueda", error);
    if (!append) {
      resultsNode.innerHTML = '<div class="empty-state">No se pudo ejecutar la búsqueda. Inténtalo de nuevo.</div>';
      resultCount.textContent = "";
    }
    return;
  }

  const newRows = data || [];
  visibleRows = append ? visibleRows.concat(newRows) : newRows;
  totalResults = newRows.length ? Number(newRows[0].total_count) : (append ? totalResults : 0);
  renderResults(visibleRows, totalResults);
}

function renderResults(rows, total) {
  resultsNode.innerHTML = "";
  resultCount.textContent = total === rows.length
    ? total + (total === 1 ? " resultado" : " resultados")
    : "Mostrando " + rows.length + " de " + number(total, 0) + " resultados";
  resultsFooter.classList.toggle("hidden", !rows.length || rows.length >= total);
  moreResultsButton.textContent = "Mostrar " + Math.min(30, total - rows.length) + " más";

  if (!rows.length) {
    resultsNode.innerHTML = '<div class="empty-state">No encontramos coincidencias. Prueba con menos palabras o una descripción más general.</div>';
    return;
  }

  rows.forEach((row) => {
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
      (Number(row.purchase_count) === 1 ? " pedido" : " pedidos");

    button.addEventListener("click", () => {
      if (row.kind === "material" && row.material_id) {
        openMaterial(row.material_id);
      } else {
        openHistorical(row);
      }
    });

    resultsNode.appendChild(fragment);
  });
}

async function openMaterial(materialId) {
  detailPanel.innerHTML = '<div class="empty-state">Cargando ficha y procedencia de precios…</div>';

  const [summaryResponse, pricesResponse, variantsResponse] = await Promise.all([
    supabase.rpc("material_summary", { p_material_id: materialId }),
    supabase.rpc("material_price_history", {
      p_material_id: materialId,
      result_limit: 500,
    }),
    supabase
      .from("commercial_items")
      .select("supplier_reference, manufacturer, manufacturer_reference, preferred_description, match_status, match_confidence, suppliers(name)")
      .eq("material_id", materialId)
      .order("supplier_reference", { ascending: true }),
  ]);

  if (summaryResponse.error || pricesResponse.error) {
    console.error(summaryResponse.error || pricesResponse.error);
    detailPanel.innerHTML = '<div class="empty-state">No se pudo cargar la ficha del material.</div>';
    return;
  }

  const detail = summaryResponse.data?.[0];
  if (!detail) {
    detailPanel.innerHTML = '<div class="empty-state">Material no encontrado.</div>';
    return;
  }

  detail.commercial_variants = variantsResponse.data || [];
  renderMaterialDetail(detail, pricesResponse.data || []);
}

async function openHistorical(row) {
  const requestId = ++detailGeneration;
  const filters = selectedFilters();
  detailPanel.innerHTML = '<div class="empty-state">Cargando compras históricas…</div>';

  const { data, error } = await supabase.rpc("historical_price_history_filtered", {
    p_reference: row.reference ?? null,
    p_description: row.title || "",
    p_supplier_id: filters.supplierId,
    p_year: filters.year,
    result_limit: 500,
  });
  if (requestId !== detailGeneration) return;

  if (error) {
    console.error(error);
    detailPanel.innerHTML = '<div class="empty-state">No se pudo cargar el histórico.</div>';
    return;
  }

  renderHistoricalDetail(row, data || []);
}

function priceSummary(rows) {
  const valid = rows
    .map((row) => Number(row.net_unit_price))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  if (!valid.length) return { min: null, median: null, max: null };

  const middle = Math.floor(valid.length / 2);
  const median = valid.length % 2
    ? valid[middle]
    : (valid[middle - 1] + valid[middle]) / 2;

  return {
    min: valid[0],
    median,
    max: valid[valid.length - 1],
  };
}

function renderMaterialDetail(detail, rows) {
  const latest =
    rows.find((row) => row.net_unit_price !== null && Number(row.net_unit_price) > 0) ||
    rows[0];

  const html = [];
  html.push('<div class="detail-header">');
  html.push('<div><h2>' + escapeHtml(detail.canonical_name) + "</h2>");
  html.push('<div class="detail-subtitle">');
  html.push(
    escapeHtml(
      [detail.manufacturer, detail.manufacturer_reference]
        .filter(Boolean)
        .join(" · ")
    )
  );
  html.push("</div></div>");
  html.push('<span class="status-badge ok">Consolidado</span>');
  html.push("</div>");

  html.push('<div class="stats-grid">');
  html.push(statHtml("Pedidos", number(detail.purchase_count, 0)));
  html.push(statHtml("Último neto", latest ? money(latest.net_unit_price) : "—"));
  html.push(statHtml("Mediana", money(detail.median_net_price)));
  html.push(
    statHtml(
      "Rango",
      detail.min_net_price === null
        ? "—"
        : money(detail.min_net_price) + " – " + money(detail.max_net_price)
    )
  );
  html.push("</div>");

  if (latest) {
    html.push('<div class="price-origin">');
    html.push('<div class="price-origin-title">¿De dónde sale el último precio?</div>');
    html.push(
      "<p><strong>" +
        money(latest.net_unit_price) +
        "</strong> · Pedido " +
        escapeHtml(orderLabel(latest)) +
        " · " +
        escapeHtml(latest.supplier || "Proveedor no indicado") +
        "</p>"
    );
    html.push(
      "<p>" +
        escapeHtml(latest.order_date || "Sin fecha") +
        " · Cantidad " +
        number(latest.quantity, 2) +
        " · PVP " +
        money(latest.pvp) +
        " · Dto. " +
        escapeHtml(displayDiscount(latest.discount_raw)) +
        "</p>"
    );
    html.push('<button class="action-button" id="showLatestOrigin" type="button">Ver línea de origen</button>');
    html.push('<div id="latestOriginDetail" class="origin-detail hidden"></div>');
    html.push("</div>");
  }

  if (detail.commercial_variants?.length) {
    html.push('<details class="variant-box"><summary>Referencias y variantes observadas (' + detail.commercial_variants.length + ")</summary>");
    html.push("<ul>");
    detail.commercial_variants.forEach((variant) => {
      const supplier = variant.suppliers?.name || "Proveedor";
      html.push(
        "<li><strong>" +
          escapeHtml(variant.supplier_reference || "Sin ref.") +
          "</strong> · " +
          escapeHtml(supplier) +
          " · " +
          escapeHtml(variant.preferred_description || "") +
          "</li>"
      );
    });
    html.push("</ul></details>");
  }

  html.push('<div class="section-title"><h3>Histórico de compras</h3><span class="muted">' + rows.length + " líneas</span></div>");
  html.push(historyTableHtml(rows));

  detailPanel.innerHTML = html.join("");

  if (latest) {
    const button = document.getElementById("showLatestOrigin");
    const box = document.getElementById("latestOriginDetail");
    button.addEventListener("click", () => {
      box.classList.toggle("hidden");
      box.innerHTML = originHtml(latest);
    });
  }

  wireOriginButtons();
}

function renderHistoricalDetail(result, rows) {
  const latest =
    rows.find((row) => row.net_unit_price !== null && Number(row.net_unit_price) > 0) ||
    rows[0];
  const summary = priceSummary(rows);

  const html = [];
  html.push('<div class="detail-header">');
  html.push('<div><h2>' + escapeHtml(result.title) + "</h2>");
  html.push('<div class="detail-subtitle">' + escapeHtml(result.reference || "Sin referencia") + "</div></div>");
  html.push('<span class="status-badge pending">Pendiente de normalizar</span>');
  html.push("</div>");

  html.push('<div class="stats-grid">');
  html.push(statHtml("Pedidos", number(result.purchase_count, 0)));
  html.push(statHtml("Último neto", latest ? money(latest.net_unit_price) : "—"));
  html.push(statHtml("Mediana", money(summary.median)));
  html.push(
    statHtml(
      "Rango",
      summary.min === null
        ? "—"
        : money(summary.min) + " – " + money(summary.max)
    )
  );
  html.push("</div>");

  html.push('<div class="price-origin">');
  html.push('<div class="price-origin-title">Histórico trazable</div>');
  html.push("<p>Este resultado aún no está consolidado, pero puedes comprobar cada compra y cada precio de origen.</p>");
  html.push("</div>");

  html.push('<div class="section-title"><h3>Procedencia</h3><span class="muted">' + rows.length + " líneas</span></div>");
  html.push(historyTableHtml(rows));

  detailPanel.innerHTML = html.join("");
  wireOriginButtons();
}

function statHtml(label, value) {
  return (
    '<div class="stat"><span class="stat-label">' +
    escapeHtml(label) +
    "</span><strong>" +
    escapeHtml(value) +
    "</strong></div>"
  );
}

function historyTableHtml(rows) {
  if (!rows.length) {
    return '<div class="empty-state">No hay líneas históricas asociadas.</div>';
  }

  const html = [];
  html.push('<div class="history-wrap"><table class="history-table"><thead><tr>');
  html.push("<th>Fecha</th><th>Pedido</th><th>Proveedor</th><th>Cant.</th><th>PVP</th><th>Dto.</th><th>Neto</th><th>Origen</th>");
  html.push("</tr></thead><tbody>");

  rows.forEach((row, index) => {
    html.push("<tr>");
    html.push("<td>" + escapeHtml(row.order_date || "—") + "</td>");
    html.push("<td>" + escapeHtml(orderLabel(row)) + "</td>");
    html.push("<td>" + escapeHtml(row.supplier || "—") + "</td>");
    html.push("<td>" + number(row.quantity, 2) + "</td>");
    html.push("<td>" + money(row.pvp) + "</td>");
    html.push('<td title="Original: ' + escapeHtml(row.discount_raw ?? "—") + '">' + escapeHtml(displayDiscount(row.discount_raw)) + "</td>");
    html.push("<td><strong>" + money(row.net_unit_price) + "</strong></td>");
    html.push('<td><button class="origin-link" type="button" data-origin-index="' + index + '">Ver origen</button></td>');
    html.push("</tr>");
    html.push('<tr id="origin-row-' + index + '" class="hidden"><td colspan="8"><div class="origin-detail">' + originHtml(row) + "</div></td></tr>");
  });

  html.push("</tbody></table></div>");
  return html.join("");
}

function originHtml(row) {
  const parts = [];
  parts.push("<strong>Pedido:</strong> " + escapeHtml(orderLabel(row)));
  parts.push("<strong>Proveedor:</strong> " + escapeHtml(row.supplier || "—"));
  parts.push("<strong>Fecha:</strong> " + escapeHtml(row.order_date || "—"));
  parts.push("<strong>Obra:</strong> " + escapeHtml(row.project || "—"));
  parts.push("<strong>Referencia de compra:</strong> " + escapeHtml(row.supplier_reference || "—"));
  parts.push("<strong>Descripción original:</strong> " + escapeHtml(row.description_original || "—"));
  parts.push("<strong>Cantidad:</strong> " + number(row.quantity, 3));
  parts.push("<strong>PVP:</strong> " + money(row.pvp));
  parts.push("<strong>Descuento:</strong> " + escapeHtml(displayDiscount(row.discount_raw)) + " (valor original: " + escapeHtml(row.discount_raw ?? "—") + ")");
  parts.push("<strong>Neto unitario:</strong> " + money(row.net_unit_price));
  parts.push("<strong>Total:</strong> " + money(row.total_price));
  parts.push("<strong>Archivo origen:</strong> " + escapeHtml(row.source_filename || "—"));
  return parts.join("<br>");
}

function wireOriginButtons() {
  detailPanel.querySelectorAll("[data-origin-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = button.getAttribute("data-origin-index");
      const row = document.getElementById("origin-row-" + index);
      if (row) row.classList.toggle("hidden");
    });
  });
}

searchButton.addEventListener("click", () => runSearch());
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") runSearch();
});
for (const input of [yearFilter, sortFilter]) {
  input.addEventListener("change", () => {
    if (searchInput.value.trim().length >= 2) runSearch();
  });
}
resetFiltersButton.addEventListener("click", () => {
  selectedSupplierId = null;
  supplierFilter.value = "";
  closeSupplierSuggestions();
  yearFilter.value = "";
  sortFilter.value = "relevance";
  if (searchInput.value.trim().length >= 2) runSearch();
});
moreResultsButton.addEventListener("click", () => runSearch({ append: true }));

bootstrapSession();
