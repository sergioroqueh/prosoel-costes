import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import { readProsoelXlsx } from "./order_import.js?v=20261008-v9";

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
const exactReferenceNotice = document.getElementById("exactReferenceNotice");
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
const costsTab = document.getElementById("costsTab");
const reviewTab = document.getElementById("reviewTab");
const costsWorkspace = document.getElementById("costsWorkspace");
const reviewWorkspace = document.getElementById("reviewWorkspace");
const reviewQuery = document.getElementById("reviewQuery");
const reviewRisk = document.getElementById("reviewRisk");
const reviewStatusFilter = document.getElementById("reviewStatusFilter");
const reviewFamilyFilter = document.getElementById("reviewFamilyFilter");
const reviewSort = document.getElementById("reviewSort");
const reviewAlertsOnly = document.getElementById("reviewAlertsOnly");
const reviewTotal = document.getElementById("reviewTotal");
const reviewResults = document.getElementById("reviewResults");
const reviewVisibleCount = document.getElementById("reviewVisibleCount");
const reviewDetail = document.getElementById("reviewDetail");
const reviewMoreButton = document.getElementById("reviewMoreButton");
const reviewFooter = document.getElementById("reviewFooter");
const purchaseEditDialog = document.getElementById("purchaseEditDialog");
const purchaseEditHeading = document.getElementById("purchaseEditHeading");
const purchaseEditClose = document.getElementById("purchaseEditClose");
const purchaseEditCancel = document.getElementById("purchaseEditCancel");
const purchaseEditSource = document.getElementById("purchaseEditSource");
const purchaseEditAction = document.getElementById("purchaseEditAction");
const purchaseEditFields = document.getElementById("purchaseEditFields");
const purchaseEditReference = document.getElementById("purchaseEditReference");
const purchaseEditDescription = document.getElementById("purchaseEditDescription");
const purchaseEditReason = document.getElementById("purchaseEditReason");
const purchaseEditOrderConfirmPanel = document.getElementById("purchaseEditOrderConfirmPanel");
const purchaseEditOrderExpected = document.getElementById("purchaseEditOrderExpected");
const purchaseEditOrderConfirm = document.getElementById("purchaseEditOrderConfirm");
const purchaseEditAcknowledged = document.getElementById("purchaseEditAcknowledged");
const purchaseEditStatus = document.getElementById("purchaseEditStatus");
const purchaseEditSubmit = document.getElementById("purchaseEditSubmit");
const importTab = document.getElementById("importTab");
const importWorkspace = document.getElementById("importWorkspace");
const importFile = document.getElementById("importFile");
const importStatus = document.getElementById("importStatus");
const importPreview = document.getElementById("importPreview");
const importConfirmPanel = document.getElementById("importConfirmPanel");
const importAcknowledged = document.getElementById("importAcknowledged");
const importSubmitButton = document.getElementById("importSubmitButton");
const importAuditYear = document.getElementById("importAuditYear");
const importAuditRefresh = document.getElementById("importAuditRefresh");
const importAuditStatus = document.getElementById("importAuditStatus");
const importAuditMetrics = document.getElementById("importAuditMetrics");
const importGapCount = document.getElementById("importGapCount");
const importGapDescription = document.getElementById("importGapDescription");
const importGaps = document.getElementById("importGaps");
const importAuditRows = document.getElementById("importAuditRows");

let searchGeneration = 0;
let detailGeneration = 0;
let visibleRows = [];
let totalResults = 0;
let suppliers = [];
let selectedSupplierId = null; // null = Todos los proveedores
let supplierCandidates = [];
let highlightedSupplierIndex = -1;
let reviewRows = [];
let reviewCount = 0;
let reviewSearchGeneration = 0;
let reviewDetailGeneration = 0;
let reviewLoaded = false;
let reviewSelectedKey = null;
let reviewTypingTimeout = null;
let purchaseLineInEditor = null;
let purchaseCandidateInEditor = null;
let purchaseEditIsSaving = false;
let currentUserRole = "user";
let currentImport = null;
let importSelectionGeneration = 0;
let importAuditGeneration = 0;
let importAuditLoaded = false;


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
      // Coincidencias al inicio del nombre, luego al inicio de cualquier palabra.
      // Por ejemplo, "RI" prioriza RIBÓ y GRUPO RIAS frente a "ingeniería".
      const rank = (name) => {
        const value = normalizeSupplierName(name);
        if (!query || value.startsWith(query)) return 0;
        if (value.split(/\s+/).some((word) => word.startsWith(query))) return 1;
        return 2;
      };
      return rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, "es");
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
  currentUserRole = data.role || "user";
  importTab.classList.toggle("hidden",currentUserRole!=="admin");
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
    currentUserRole = "user";
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
    " · Avisos anotados: " + (row.pending_gaps ?? 0);
  orderCounter.title = "Avisos anotados manualmente sobre la secuencia; no equivale a todos los números ausentes. Consulta el Control de importaciones.";
}

// Solo activar la comprobación global cuando parece que se ha escrito un código,
// no para términos generales como "DOWNLIGHT 18W".
function looksLikePurchaseCode(query) {
  const text = query.trim().toUpperCase();
  if (text.length < 4 || text.length > 50) return false;
  if (/^[0-9]{4,}[A-Z0-9._/-]*$/.test(text)) return true;
  return /^[A-Z]{1,3}[0-9][A-Z0-9._/-]*(?: [A-Z0-9._/-]+)?$/.test(text);
}

function renderExactReferenceNotice(query, filters, referenceRows) {
  exactReferenceNotice.replaceChildren();
  exactReferenceNotice.classList.add("hidden");
  if (!referenceRows?.length || (filters.supplierId === null && filters.year === null)) return;
  const selectedMatch = referenceRows.some((row) =>
    (filters.supplierId === null || Number(row.supplier_id) === filters.supplierId)
      && (filters.year === null || Number(row.order_year) === filters.year)
  );
  if (selectedMatch) return;
  const numberOfOrders = new Set(referenceRows.map((row) => row.order_id)).size;
  const providers = Array.from(new Set(referenceRows.map((row) => row.supplier).filter(Boolean)));
  const message = document.createElement("p");
  const strong = document.createElement("strong");
  strong.textContent = "La referencia exacta " + query + " no aparece con los filtros actuales.";
  message.appendChild(strong);
  message.append(" Se encuentra en " + numberOfOrders + (numberOfOrders === 1 ? " pedido" : " pedidos")
    + " de " + providers.length + (providers.length === 1 ? " proveedor" : " proveedores")
    + ": " + providers.slice(0,4).join(", ") + (providers.length > 4 ? "…" : "") + ".");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "exact-reference-action";
  button.textContent = "Ver referencia exacta sin filtros";
  button.addEventListener("click", () => {
    selectedSupplierId = null;
    supplierFilter.value = "";
    closeSupplierSuggestions();
    yearFilter.value = "";
    sortFilter.value = "relevance";
    runSearch();
  });
  exactReferenceNotice.append(message, button);
  exactReferenceNotice.classList.remove("hidden");
}

async function runSearch({ append = false } = {}) {
  const query = searchInput.value.trim();
  if (query.length < 2) {
    ++searchGeneration;
    visibleRows = [];
    totalResults = 0;
    resultCount.textContent = "";
    exactReferenceNotice.classList.add("hidden");
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
    exactReferenceNotice.classList.add("hidden");
  }
  searchButton.disabled = true;
  searchButton.textContent = "Buscando…";
  moreResultsButton.disabled = true;

  const searchPromise = supabase.rpc("search_costs_filtered", {
    search_query: query,
    result_limit: 30,
    p_supplier_id: filters.supplierId,
    p_year: filters.year,
    p_sort: filters.sort,
    p_offset: append ? visibleRows.length : 0,
  });
  const referencePromise = !append && (filters.supplierId !== null || filters.year !== null)
    && looksLikePurchaseCode(query)
    ? supabase.rpc("reference_purchase_history_review", { p_reference: query, result_limit: 500 })
    : Promise.resolve({ data: [], error: null });
  const [searchResponse, referenceResponse] = await Promise.all([searchPromise, referencePromise]);
  const { data, error } = searchResponse;
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
  if (!append && !referenceResponse.error) {
    renderExactReferenceNotice(query, filters, referenceResponse.data || []);
  } else if (!append && referenceResponse.error) {
    console.warn("No se pudo comprobar la referencia exacta:", referenceResponse.error);
  }
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
  const requestId = ++detailGeneration;
  detailPanel.innerHTML = '<div class="empty-state">Cargando ficha y procedencia de precios…</div>';

  const [summaryResponse, pricesResponse, variantsResponse] = await Promise.all([
    supabase.rpc("material_summary", { p_material_id: materialId }),
    supabase.rpc("material_price_history_review", {
      p_material_id: materialId,
      result_limit: 500,
    }),
    supabase
      .from("commercial_items")
      .select("supplier_reference, manufacturer, manufacturer_reference, preferred_description, match_status, match_confidence, suppliers(name)")
      .eq("material_id", materialId)
      .order("supplier_reference", { ascending: true }),
  ]);

  if (requestId !== detailGeneration) return;
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

  const { data, error } = await supabase.rpc("historical_price_history_filtered_review", {
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

  if (result.reference) {
    html.push('<div class="compare-entry">');
    html.push('<div><strong>Comparativa por referencia de compra</strong><p>Busca este mismo código en todos los proveedores. No implica equivalencia técnica certificada.</p></div>');
    html.push('<button class="action-button" id="compareReferenceButton" type="button">Comparar proveedores y evolución</button>');
    html.push('</div>');
    html.push('<div id="referenceComparison" aria-live="polite"></div>');
  }

  // Fuente única: comienza con las líneas de la variante seleccionada;
  // al comparar, se sustituye por el historial exacto de todos los proveedores.
  html.push('<div class="section-title"><h3>Procedencia</h3><span id="provenanceCount" class="muted">' + rows.length + " líneas</span></div>");
  html.push('<p id="provenanceScope" class="provenance-scope">Compras de la descripción seleccionada' +
    (selectedFilters().supplierId !== null || selectedFilters().year !== null ? ' con los filtros actuales.' : '.') + '</p>');
  html.push('<div id="provenanceRows">' + historyTableHtml(rows) + '</div>');

  detailPanel.innerHTML = html.join("");
  wireOriginButtons();
  const compareButton = detailPanel.querySelector("#compareReferenceButton");
  if (compareButton) {
    const activeDetail = detailGeneration;
    compareButton.addEventListener("click", () => showReferenceComparison(result.reference, activeDetail));
  }
}

// Comparación solo por coincidencia literal del código de compra.
// No presupone que sea una referencia oficial de fabricante ni una equivalencia técnica.
function validComparisonPrice(row) {
  const price = Number(row.net_unit_price);
  return row.price_validation_status === "valid"
    && row.net_unit_price !== null
    && Number.isFinite(price)
    && price > 0;
}

function comparisonOutliers(rows) {
  const values = rows.filter(validComparisonPrice).map((row) => row);
  if (values.length < 4) return new Set();
  const median = priceSummary(values).median;
  if (!median || median <= 0) return new Set();
  return new Set(values
    .filter((row) => Number(row.net_unit_price) > median * 2.2
      || Number(row.net_unit_price) < median * 0.45)
    .map((row) => row.order_line_id));
}

function makePriceTimeline(rows, outliers) {
  const plotted = rows.filter((row) => validComparisonPrice(row) && row.order_date
    && Number.isFinite(Date.parse(row.order_date + "T00:00:00Z")));
  if (!plotted.length) {
    return '<p class="comparison-note">No hay precios validados y fechados suficientes para representar la evolución.</p>';
  }
  const width = 690, height = 252, left = 67, right = 19, top = 24, bottom = 42;
  const t = (row) => Date.parse(row.order_date + "T00:00:00Z");
  const times = plotted.map(t);
  const amounts = plotted.map((row) => Number(row.net_unit_price));
  const from = Math.min(...times), to = Math.max(...times);
  const low = Math.max(0, Math.min(...amounts) * 0.88);
  const high = Math.max(...amounts) * 1.10;
  const yMax = Math.max(high, low + 0.01);
  const x = (row) => from === to ? (left + width - right) / 2
    : left + ((t(row) - from) / (to - from)) * (width - left - right);
  const y = (row) => height - bottom - ((Number(row.net_unit_price) - low)
    / (yMax - low)) * (height - top - bottom);
  const palette = ["#244d80", "#29816f", "#865db9", "#c0782b", "#3483ad", "#ab5b79", "#687e38"];
  const suppliersInOrder = [...new Set(plotted.map((row) => row.supplier || "Sin proveedor"))].sort((a,b) => a.localeCompare(b,"es"));
  const providers = suppliersInOrder.map((name,index) => ({ name, color: palette[index % palette.length] }));
  const lines = [];
  lines.push('<svg viewBox="0 0 ' + width + ' ' + height + '" class="price-timeline" role="img" aria-label="Evolución histórica del precio neto unitario según fecha y proveedor">');
  lines.push('<title>Evolución de precios netos por proveedor</title>');
  for (let i = 0; i < 4; i++) {
    const v = low + (yMax - low) * (i / 3);
    const yy = height - bottom - ((v - low) / (yMax - low)) * (height - top - bottom);
    lines.push('<line x1="' + left + '" y1="' + yy + '" x2="' + (width-right) + '" y2="' + yy + '" stroke="#e3e9f0" stroke-width="1"/>');
    lines.push('<text x="' + (left-7) + '" y="' + (yy+4) + '" text-anchor="end" font-size="11" fill="#536173">' + escapeHtml(number(v,2)) + '</text>');
  }
  const dateLabel = (stamp) => new Intl.DateTimeFormat("es-ES",{month:"2-digit",year:"2-digit",timeZone:"UTC"}).format(new Date(stamp));
  lines.push('<text x="' + left + '" y="' + (height-12) + '" font-size="11" fill="#536173">' + escapeHtml(dateLabel(from)) + '</text>');
  lines.push('<text x="' + (width-right) + '" y="' + (height-12) + '" text-anchor="end" font-size="11" fill="#536173">' + escapeHtml(dateLabel(to)) + '</text>');
  lines.push('<text x="' + left + '" y="13" font-size="11" fill="#536173">Neto €/ud</text>');
  for (const provider of providers) {
    const entries = plotted.filter((row) => (row.supplier || "Sin proveedor") === provider.name)
      .sort((a,b) => t(a) - t(b) || Number(a.order_id) - Number(b.order_id));
    if (entries.length > 1) {
      lines.push('<polyline fill="none" stroke="' + provider.color + '" stroke-width="2" stroke-opacity=".75" points="'
        + entries.map((row) => x(row).toFixed(2) + "," + y(row).toFixed(2)).join(" ") + '"/>');
    }
    for (const row of entries) {
      const unusual = outliers.has(row.order_line_id);
      lines.push('<circle cx="' + x(row).toFixed(2) + '" cy="' + y(row).toFixed(2)
        + '" r="' + (unusual ? 5.5 : 4) + '" fill="' + (unusual ? "#b45309" : provider.color)
        + '" stroke="#fff" stroke-width="1.5"><title>'
        + escapeHtml(provider.name + " · " + row.order_date + " · " + money(row.net_unit_price)
          + " · Pedido " + orderLabel(row) + (unusual ? " · Posible precio atípico" : ""))
        + '</title></circle>');
    }
  }
  lines.push('</svg>');
  lines.push('<div class="comparison-legend">' + providers.map((provider, index) =>
    '<span><i class="legend-color-' + (index % palette.length) + '"></i>' + escapeHtml(provider.name) + '</span>'
  ).join("") + '</div>');
  return lines.join("");
}

function renderReferenceComparison(container, reference, rows) {
  if (!rows.length) {
    container.innerHTML = '<p class="comparison-note">No hay compras históricas para esta referencia.</p>';
    return;
  }
  const valid = rows.filter(validComparisonPrice);
  const invalidCount = rows.length - valid.length;
  const outliers = comparisonOutliers(rows);
  const names = [...new Set(rows.map((row) => row.supplier || "Sin proveedor"))];
  const numberOfOrders = new Set(rows.map((row) => row.order_id)).size;
  const descCount = new Set(rows.map((row) => String(row.description_original || "")
    .replace(/\s+/g," ").trim().toLocaleUpperCase("es-ES"))).size;
  const groups = names.map((name) => {
    const selected = rows.filter((row) => (row.supplier || "Sin proveedor") === name);
    const priced = selected.filter(validComparisonPrice);
    const sorted = priced.slice().sort((a,b) =>
      String(b.order_date || "").localeCompare(String(a.order_date || ""))
        || Number(b.order_id) - Number(a.order_id));
    return { name, selected, priced, latest: sorted[0] || null,
      summary: priceSummary(priced),
      purchases: new Set(selected.map((row) => row.order_id)).size };
  }).sort((a,b) => String(b.latest?.order_date||"").localeCompare(String(a.latest?.order_date||""))
    || a.name.localeCompare(b.name,"es"));
  const html = [];
  html.push('<section class="comparison-panel">');
  html.push('<h3>Comparativa histórica por código: ' + escapeHtml(reference) + '</h3>');
  html.push('<p class="comparison-note">Coincidencia de <strong>referencia de compra</strong> en ' +
    numberOfOrders + ' pedidos y ' + groups.length + ' proveedores. Son precios anteriores, no ofertas vigentes. La coincidencia del código no prueba equivalencia técnica.</p>');
  if (descCount > 1) {
    html.push('<p class="comparison-warning">Hay ' + descCount + ' descripciones originales distintas para este código. Revisa el modelo y las características antes de comparar.</p>');
  }
  if (invalidCount) {
    html.push('<p class="comparison-warning">' + invalidCount + ' líneas con validación de precio pendiente o incorrecta se muestran en el histórico, pero no entran en estadísticas ni gráfico.</p>');
  }
  if (outliers.size) {
    html.push('<p class="comparison-warning">' + outliers.size + ' precios potencialmente atípicos (más del 220 % o menos del 45 % de la mediana). Se incluyen, señalados en el gráfico; requieren revisión.</p>');
  }
  html.push('<div class="comparison-table-wrap"><table class="comparison-table"><thead><tr><th>Proveedor</th><th>Pedidos</th><th>Último neto</th><th>Última fecha</th><th>Mediana</th><th>Rango</th></tr></thead><tbody>');
  for (const g of groups) {
    html.push('<tr><td><strong>' + escapeHtml(g.name) + '</strong></td><td>' + g.purchases + '</td><td>' +
      money(g.latest?.net_unit_price) + '</td><td>' + escapeHtml(g.latest?.order_date || "—")
      + '</td><td>' + money(g.summary.median) + '</td><td>' +
      (g.summary.min === null ? "—" : money(g.summary.min) + " – " + money(g.summary.max))
      + '</td></tr>');
  }
  html.push('</tbody></table></div>');
  html.push('<h4>Evolución de precios de compra</h4>');
  html.push(makePriceTimeline(rows,outliers));
  html.push('<p class="comparison-note">Cada punto corresponde a una línea de compra validada aritméticamente. Un precio diferente puede deberse a cantidad, descuento, fecha o condiciones comerciales.</p>');
  html.push('</section>');
  container.innerHTML = html.join("");
}

async function showReferenceComparison(reference, detailRequestId) {
  const button = detailPanel.querySelector("#compareReferenceButton");
  const area = detailPanel.querySelector("#referenceComparison");
  if (!button || !area || detailRequestId !== detailGeneration) return;
  button.disabled = true;
  button.textContent = "Consultando todos los proveedores…";
  area.innerHTML = '<div class="comparison-loading">Recuperando compras por referencia exacta…</div>';
  const { data, error } = await supabase.rpc("reference_purchase_history_review", {
    p_reference: reference,
    result_limit: 500,
  });
  if (detailRequestId !== detailGeneration || !area.isConnected) return;
  if (error) {
    console.error("Error comparando referencia", error);
    area.innerHTML = '<p class="comparison-warning">No se pudo recuperar la comparativa. Puedes intentarlo de nuevo.</p>';
    button.disabled = false;
    button.textContent = "Reintentar comparativa";
    return;
  }
  renderReferenceComparison(area, reference, data || []);
  // Solo una tabla de Procedencia en la ficha: ahora incluye todos los pedidos
  // de la referencia exacta, no solamente la variante inicialmente elegida.
  if (data?.length) {
    const provenanceRows = detailPanel.querySelector("#provenanceRows");
    const provenanceCount = detailPanel.querySelector("#provenanceCount");
    const provenanceScope = detailPanel.querySelector("#provenanceScope");
    if (provenanceRows && provenanceCount && provenanceScope) {
      provenanceRows.innerHTML = historyTableHtml(data);
      provenanceCount.textContent = data.length + (data.length === 1 ? " línea" : " líneas");
      provenanceScope.textContent = "Todas las compras con esta referencia de compra en todos los proveedores y años. " +
        "La coincidencia de código no garantiza equivalencia técnica.";
      wireOriginButtons();
    }
  }
  button.textContent = "Comparativa cargada";
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
  parts.push("<strong>Referencia utilizada para precios:</strong> " + escapeHtml(row.supplier_reference || "—"));
  parts.push("<strong>Descripción utilizada para precios:</strong> " + escapeHtml(row.description_original || "—"));
  parts.push("<strong>Cantidad:</strong> " + number(row.quantity, 3));
  parts.push("<strong>PVP:</strong> " + money(row.pvp));
  parts.push("<strong>Descuento:</strong> " + escapeHtml(displayDiscount(row.discount_raw)) + " (valor original: " + escapeHtml(row.discount_raw ?? "—") + ")");
  parts.push("<strong>Neto unitario:</strong> " + money(row.net_unit_price));
  parts.push("<strong>Total:</strong> " + money(row.total_price));
  if (row.description_source) {
    parts.push("<strong>Descripción que figura en el Excel:</strong> " + escapeHtml(row.description_source));
  }
  if (row.supplier_reference_source) {
    parts.push("<strong>Referencia que figura en el Excel:</strong> " + escapeHtml(row.supplier_reference_source));
  }
  if (row.description_source && row.description_source !== row.description_original) {
    parts.push("<strong>Existe una corrección técnica de descripción:</strong> Sí");
  }
  if (row.supplier_reference_source && row.supplier_reference_source !== row.supplier_reference) {
    parts.push("<strong>Existe una corrección de referencia:</strong> Sí");
  }
  if (row.line_excluded) parts.push("<strong>Excluida esta línea de los cálculos:</strong> Sí");
  if (row.order_excluded) parts.push("<strong>Excluido el pedido completo:</strong> Sí");
  if (row.line_review_reason) parts.push("<strong>Motivo de revisión:</strong> " + escapeHtml(row.line_review_reason));
  if (row.order_review_reason) parts.push("<strong>Motivo de exclusión del pedido:</strong> " + escapeHtml(row.order_review_reason));
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

// --- V7: revisión conservadora de candidatos de normalización ---
// Esta vista SOLO lee evidencias. No permite aprobar, fusionar, ni corregir históricos.
const reviewStatusLabels = {
  pending: "Pendiente",
  needs_evidence: "Necesita evidencia",
  distinct_products: "Contiene productos distintos",
  ready_for_mapping: "Pendiente de vincular",
};
const reviewFamilyLabels = {
  aparamenta: "Aparamenta", cables: "Cables y conductores",
  canalizaciones: "Tubos y canalizaciones", iluminacion: "Iluminación",
  mecanismos: "Mecanismos", telecomunicaciones: "Telecomunicaciones",
  envolventes_cajas: "Envolventes y cajas", puesta_tierra: "Puesta a tierra",
  fijaciones: "Fijación y accesorios", mixta: "Familias incompatibles",
  sin_clasificar: "Sin clasificar",
};
const technicalAlertLabels = {
  familias: "Familias distintas",
  potencias_W: "Potencias (W)",
  diametros_mm: "Diámetros (mm)",
  secciones_mm2: "Secciones (mm²)",
  intensidades_A: "Intensidades (A)",
};
function candidateTechnicalAlerts(row) {
  return Object.entries(row?.technical_alerts || {})
    .filter(([key,values]) => Object.hasOwn(technicalAlertLabels,key) && Array.isArray(values) && values.length>1);
}
const reviewRiskLabels = {
  technical_conflict: "Conflicto técnico",
  variant_descriptions: "Varias descripciones",
  cross_supplier: "Varios proveedores",
};

function activateWorkspace(which) {
  const reviewing = which === "review";
  const importing = which === "import" && currentUserRole === "admin";
  const costs = !reviewing && !importing;
  costsWorkspace.classList.toggle("hidden", !costs);
  reviewWorkspace.classList.toggle("hidden", !reviewing);
  importWorkspace.classList.toggle("hidden", !importing);
  costsTab.classList.toggle("is-active", costs);
  reviewTab.classList.toggle("is-active", reviewing);
  importTab.classList.toggle("is-active", importing);
  costsTab.setAttribute("aria-selected", String(costs));
  reviewTab.setAttribute("aria-selected", String(reviewing));
  importTab.setAttribute("aria-selected", String(importing));
  if (reviewing && !reviewLoaded) runReviewSearch();
  if (importing && !importAuditLoaded) loadImportDashboard();
}

function renderReviewResults() {
  reviewResults.className = "review-list";
  reviewResults.replaceChildren();
  reviewVisibleCount.textContent = "Mostrando " + reviewRows.length + " de " + reviewCount;
  reviewTotal.textContent = reviewCount + (reviewCount === 1 ? " candidato" : " candidatos");
  reviewFooter.classList.toggle("hidden", !reviewRows.length || reviewRows.length >= reviewCount);
  reviewMoreButton.textContent = "Mostrar " + Math.min(30, Math.max(0, reviewCount-reviewRows.length)) + " más";
  if (!reviewRows.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No hay candidatos que coincidan con estos filtros.";
    reviewResults.appendChild(empty);
    return;
  }

  reviewRows.forEach((row) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "review-result-card";
    if (row.reference_key === reviewSelectedKey) button.classList.add("is-selected");
    button.setAttribute("aria-label", "Revisar referencia " + row.observed_reference);
    const head = document.createElement("div");
    head.className = "review-result-head";
    const code = document.createElement("strong");
    code.className = "review-reference";
    code.textContent = row.observed_reference;
    const risk = document.createElement("span");
    risk.className = "review-risk " + row.risk_level;
    risk.textContent = reviewRiskLabels[row.risk_level] || "Revisar";
    head.append(code, risk);
    const description = document.createElement("div");
    description.className = "review-result-desc";
    description.textContent = row.sample_description;
    const meta = document.createElement("div");
    meta.className = "review-result-meta";
    meta.textContent = (reviewFamilyLabels[row.suggested_family] || "Sin clasificar") +
      " (orientativa) · " + row.supplier_count + " proveedores · " +
      row.purchase_count + " pedidos · " + row.description_count +
      " descripciones · " + (reviewStatusLabels[row.review_status] || "Pendiente");
    button.append(head, description, meta);
    const alerts = candidateTechnicalAlerts(row);
    if (alerts.length) {
      const warning = document.createElement("div");
      warning.className = "review-card-alert";
      warning.textContent = "⚠ Contradicciones: " +
        alerts.map(([key]) => technicalAlertLabels[key]).join(", ");
      button.appendChild(warning);
    }
    if (row.requires_recheck) {
      const update = document.createElement("div");
      update.className = "review-card-recheck";
      update.textContent = "Nuevas compras desde la última revisión; comprobar decisión";
      button.appendChild(update);
    }
    button.addEventListener("click", () => {
      reviewSelectedKey = row.reference_key;
      reviewResults.querySelectorAll(".review-result-card").forEach((item) => item.classList.remove("is-selected"));
      button.classList.add("is-selected");
      showReviewCandidate(row);
    });
    reviewResults.appendChild(button);
  });
}

async function runReviewSearch({ append = false } = {}) {
  reviewLoaded = true;
  const requestId = ++reviewSearchGeneration;
  const query = reviewQuery.value.trim();
  const risk = reviewRisk.value || null;
  const reviewStatus = reviewStatusFilter.value || null;
  const family = reviewFamilyFilter.value || null;
  const sort = reviewSort.value || "impact";
  const alertsOnly = reviewAlertsOnly.checked;
  if (!append) {
    ++reviewDetailGeneration;
    reviewRows = [];
    reviewCount = 0;
    reviewSelectedKey = null;
    reviewResults.className = "review-list";
    reviewResults.innerHTML = '<div class="empty-state">Preparando cola de revisión…</div>';
    reviewDetail.innerHTML = '<div class="empty-state">Selecciona un candidato para inspeccionar las compras.</div>';
    reviewFooter.classList.add("hidden");
  }
  reviewMoreButton.disabled = true;
  const { data, error } = await supabase.rpc("normalization_review_queue_v3", {
    p_query: query || null,
    p_risk: risk,
    p_status: reviewStatus,
    p_family: family,
    p_alerts_only: alertsOnly,
    p_sort: sort,
    result_limit: 30,
    p_offset: append ? reviewRows.length : 0,
  });
  if (requestId !== reviewSearchGeneration) return;
  reviewMoreButton.disabled = false;
  if (error) {
    console.error("Error obteniendo la cola de normalización", error);
    if (!append) {
      reviewResults.innerHTML = '<div class="empty-state">No se pudo cargar la cola de revisión.</div>';
      reviewVisibleCount.textContent = "";
      reviewTotal.textContent = "No disponible";
    }
    return;
  }
  const current = data || [];
  reviewRows = append ? reviewRows.concat(current) : current;
  reviewCount = current.length ? Number(current[0].total_count) : (append ? reviewCount : 0);
  renderReviewResults();
}

function candidateDescriptionGroups(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const description = String(row.description_source || row.description_original || "").trim() || "(Sin descripción)";
    const ref = grouped.get(description) || {
      description, lines: 0, orders: new Set(), suppliers: new Set(),
      wattages: new Set(),
    };
    ref.lines++;
    ref.orders.add(row.order_id);
    ref.suppliers.add(row.supplier || "Sin proveedor");
    const power = description.match(/([0-9]+(?:[,.][0-9]+)?)\s*w(?![a-z])/i);
    if (power) ref.wattages.add(power[1]);
    grouped.set(description, ref);
  }
  return [...grouped.values()].sort((a,b) => b.lines-a.lines || a.description.localeCompare(b.description,"es"));
}

// Ayuda a la revisión, exclusivamente basada en las compras observadas.
// No consulta Internet, no certifica fabricante y NUNCA aprueba una equivalencia.
function suggestReviewDecision(row, notes) {
  const inconsistencies = candidateTechnicalAlerts(row);
  if (inconsistencies.some(([key]) => key !== "potencias_W")) {
    const summary = inconsistencies.map(([key,values]) =>
      technicalAlertLabels[key] + ": " + values.join(" / ")).join("; ");
    return {
      status:"needs_evidence",
      title:"Contradicciones técnicas en los pedidos: no vincular aún",
      reason:"La misma referencia de compra presenta información contradictoria (" +
        summary + "). Comprobar cada línea de pedido y las fichas de fabricante antes " +
        "de decidir si son productos distintos o errores de descripción.",
      confidence:"Alerta extraída de las descripciones históricas. No demuestra por sí sola que existan dos artículos distintos.",
    };
  }
  const original=notes.map((x)=>x.description);
  const compact=(value)=>String(value).toUpperCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"").replace(/\s+/g,"");
  const powers=[...new Set(original.flatMap((desc)=>
    [...desc.matchAll(/([0-9]+(?:[,.][0-9]+)?)\s*w(?![a-z])/gi)].map((m)=>m[1]+" W")
  ))].sort((a,b)=>Number.parseFloat(a)-Number.parseFloat(b));
  const lengths=[...new Set(original.flatMap((desc)=>
    [...desc.matchAll(/\b(\d{3,4})\s*mm\b/gi)].map((m)=>m[1]+" mm")
  ))].sort((a,b)=>Number.parseFloat(a)-Number.parseFloat(b));
  if(row.distinct_wattages>1 || powers.length>1){
    return {
      status:"distinct_products",
      title:"Diferencias técnicas explícitas: NO unificar",
      reason:"Una misma referencia de compra aparece con potencias distintas ("+
        powers.join(", ")+")"+(lengths.length>1?" y longitudes distintas ("+lengths.join(", ")+")":"")+
        ". Las compras describen variantes diferentes. Conservarlas separadas y comprobar documentación técnica antes de vincular materiales.",
      confidence:"Señal fuerte: diferencias expresas en el propio pedido; sin verificación externa.",
    };
  }
  if(original.length>1 && new Set(original.map(compact)).size===1) {
    return {
      status:"needs_evidence",
      title:"Posible diferencia únicamente tipográfica",
      reason:"Las descripciones solo difieren en espacios, saltos de línea o tildes tras una comparación conservadora. Falta confirmar fabricante y modelo antes de declarar que son un único artículo.",
      confidence:"Pista textual. No es una equivalencia técnica validada.",
    };
  }
  if(row.supplier_count>1 && original.length===1) {
    return {
      status:"needs_evidence",
      title:"Código y descripción repetidos entre proveedores",
      reason:"El mismo código y texto comercial aparecen en varios proveedores. Aún falta acreditar que es una referencia oficial del fabricante y no un código interno compartido o reutilizado.",
      confidence:"Coincidencia comercial, pendiente de evidencia de fabricante.",
    };
  }
  return {
    status:"needs_evidence",
    title:"Revisión documental recomendada",
    reason:"Se observan distintas descripciones o proveedores para una referencia de compra. Hay que comparar fabricante, modelo y atributos técnicos relevantes antes de vincular o separar definitivamente las variantes.",
    confidence:"Información histórica insuficiente para aprobar equivalencia.",
  };
}

function reviewPurchaseTableHtml(rows, notes) {
  if (!rows.length) return '<div class="empty-state">No hay compras originales para esta referencia.</div>';
  const indexedNotes = new Map(notes.map((note, index) => [note.description, index]));
  const html = [];
  html.push('<div class="review-edit-table-wrap"><table class="history-table review-edit-table"><thead><tr>');
  html.push('<th>Pedido</th><th>Proveedor</th><th>Descripción que venía en el Excel</th><th>Neto</th><th>Estado en catálogo</th><th>Acciones</th>');
  html.push('</tr></thead><tbody>');
  rows.forEach((item, index) => {
    const original = item.description_source || item.description_original || "";
    const groupIndex = indexedNotes.get(original);
    const changed = item.corrected_reference !== null || item.corrected_description !== null;
    const excluded = item.line_excluded || item.order_excluded;
    const state = item.order_excluded ? "Pedido excluido" :
      item.line_excluded ? "Línea excluida" :
      !item.belongs_to_effective_reference ? "Reasignada a otra referencia" :
      changed ? "Corregida" : "Sin corregir";
    html.push('<tr class="review-purchase-row' + (excluded ? ' review-purchase-excluded' : '') +
      '" data-review-row-group="' + String(groupIndex??-1) + '">');
    html.push('<td>' + escapeHtml(orderLabel(item)) + '<div class="review-row-date">' +
      escapeHtml(item.order_date || "—") + '</div></td>');
    html.push('<td>' + escapeHtml(item.supplier || "—") + '</td>');
    html.push('<td><strong>' + escapeHtml(item.supplier_reference_source || "Sin referencia") +
      '</strong><div class="review-source-description">' + escapeHtml(original) + '</div>');
    if (changed) html.push('<div class="review-effective-note">Para el catálogo: ' +
      escapeHtml(item.supplier_reference || "Sin referencia") + ' · ' +
      escapeHtml(item.description_original || "—") + '</div>');
    html.push('</td>');
    html.push('<td>' + money(item.net_unit_price) + '</td>');
    html.push('<td><span class="review-line-status' + (excluded ? ' is-excluded' : changed ? ' is-corrected' : '') +
      '">' + escapeHtml(state) + '</span></td>');
    html.push('<td class="review-line-actions"><button type="button" class="origin-link" data-review-origin-index="' +
      index + '">Origen</button>');
    if (currentUserRole === "admin") html.push('<button type="button" class="review-line-edit-button" data-edit-review-line-index="' +
      index + '">Revisar</button>');
    html.push('</td></tr>');
    html.push('<tr class="review-line-origin-row hidden" data-review-row-group="' +
      String(groupIndex??-1) + '" id="review-origin-row-' + index +
      '"><td colspan="6"><div class="origin-detail">' + originHtml(item) + '</div></td></tr>');
  });
  html.push('</tbody></table></div>');
  return html.join("");
}

function renderReviewCandidate(row, purchases, reviewEvents = []) {
  const notes = candidateDescriptionGroups(purchases);
  const activePurchases = purchases.filter((purchase) => purchase.usable_for_prices &&
    purchase.belongs_to_effective_reference);
  const suppliers = [...new Set(activePurchases.map((purchase) => purchase.supplier || "Sin proveedor"))];
  const pricesValid = activePurchases.filter(validComparisonPrice);
  const outliers = comparisonOutliers(activePurchases);
  const detectedAlerts = candidateTechnicalAlerts(row);
  const advice = suggestReviewDecision(row, notes);
  const html = [];
  html.push('<div class="detail-header"><div><h2>' + escapeHtml(row.observed_reference) + '</h2>');
  html.push('<p class="detail-subtitle">Referencia de compra observada · ' +
    escapeHtml(reviewStatusLabels[row.review_status] || "Pendiente") + '</p></div>');
  html.push('<span class="review-risk ' + row.risk_level + '">' + escapeHtml(reviewRiskLabels[row.risk_level]||"Revisar") + '</span></div>');
  html.push('<div class="review-indicators">');
  html.push('<div class="review-indicator"><strong>' + suppliers.length + '</strong><span>Proveedores</span></div>');
  html.push('<div class="review-indicator"><strong>' + new Set(purchases.map((p)=>p.order_id)).size + '</strong><span>Pedidos</span></div>');
  html.push('<div class="review-indicator"><strong>' + notes.length + '</strong><span>Descripciones de origen</span></div>');
  html.push('</div>');
  html.push('<p class="comparison-note">Líneas de origen: <strong>' + purchases.length +
    '</strong> · Utilizables para precios de esta referencia: <strong>' +
    activePurchases.length + '</strong>. Las excluidas y reasignadas siguen consultables, pero no entran en las estadísticas.</p>');
  const reviewedTime = row.reviewed_at ? new Date(row.reviewed_at).getTime() : NaN;
  const evidenceTime = row.evidence_refreshed_at ? new Date(row.evidence_refreshed_at).getTime() : NaN;
  if (row.review_status !== "pending" && Number.isFinite(reviewedTime) &&
      Number.isFinite(evidenceTime) && evidenceTime > reviewedTime + 1000) {
    html.push('<div class="review-warning severe"><strong>Revisar decisión anterior:</strong> ' +
      'se han observado nuevos datos técnicos desde la última revisión. ' +
      'La clasificación anterior no debe reutilizarse sin comprobar las nuevas compras.</div>');
  }
  html.push('<p class="comparison-note">Familia probable: <strong>' +
    escapeHtml(reviewFamilyLabels[row.suggested_family] || "Sin clasificar") +
    '</strong> · clasificación orientativa, no una equivalencia validada.</p>');

  if (detectedAlerts.length) {
    html.push('<div class="review-warning severe">');
    html.push('<strong>Incoherencias técnicas observadas en la referencia de compra.</strong>');
    html.push('<ul class="review-alert-evidence">');
    for (const [key,values] of detectedAlerts) {
      html.push('<li><strong>' + escapeHtml(technicalAlertLabels[key]) +
        ':</strong> ' + values.map(escapeHtml).join(' / ') + '</li>');
    }
    html.push('</ul>');
    html.push('<p>Estas diferencias pueden ser variantes realmente distintas o errores al describir el pedido. ' +
      'No consolides precios sin revisar las líneas y la documentación técnica.</p>');
    html.push('</div>');
  } else if (row.risk_level === "technical_conflict") {
    html.push('<div class="review-warning severe"><strong>Alerta: potencias diferentes bajo el mismo código.</strong> No unificar estos productos sin verificar modelo, potencia, longitud y demás características técnicas.</div>');
  } else if (notes.length>1) {
    html.push('<div class="review-warning"><strong>Descripciones diferentes.</strong> Podrían ser variantes tipográficas o modelos distintos. La identidad técnica todavía no está aprobada.</div>');
  } else {
    html.push('<div class="review-warning"><strong>Coincidencia de código entre proveedores.</strong> Puede ser referencia de fabricante o una colisión de códigos internos: requiere confirmación.</div>');
  }
  if(outliers.size) {
    html.push('<p class="comparison-note">' + outliers.size + ' posibles precios atípicos identificados; no se han corregido ni descartado del histórico.</p>');
  }
  html.push('<h3>Descripciones realmente observadas</h3>');
  for(const [index,item] of notes.slice(0,20).entries()){
    html.push('<div class="review-description-item"><p>' + escapeHtml(item.description) + '</p><span>'
      + item.lines + ' líneas · ' + item.orders.size + ' pedidos · ' +
      [...item.suppliers].map(escapeHtml).join(', ') + '</span>');
    html.push('<button type="button" class="review-group-jump" data-review-description-index="' +
      index + '">Revisar estas ' + item.lines + ' líneas</button></div>');
  }
  if(notes.length>20) html.push('<p class="comparison-note">Hay ' + (notes.length-20) + ' descripciones adicionales en el histórico original.</p>');

  html.push('<div class="review-assist-panel">');
  html.push('<strong>Ayuda preliminar de PROSOEL Costes</strong>');
  html.push('<h3>' + escapeHtml(advice.title) + '</h3>');
  html.push('<p>' + escapeHtml(advice.reason) + '</p>');
  html.push('<p class="review-assist-disclaimer">' + escapeHtml(advice.confidence) +
    ' · Es una propuesta basada en el histórico, NO una decisión aprobada.</p>');
  if(currentUserRole==="admin") {
    html.push('<button id="reviewAssistButton" class="review-assist-button" type="button">Preparar justificación para revisar</button>');
  }
  html.push('</div>');
    html.push('<h3>Proveedores y precios observados</h3>');
  html.push('<div class="comparison-table-wrap"><table class="comparison-table"><thead><tr><th>Proveedor</th><th>Pedidos</th><th>Último neto</th><th>Mediana</th><th>Rango</th></tr></thead><tbody>');
  for(const supplier of suppliers.sort((a,b)=>a.localeCompare(b,"es"))) {
    const lines = activePurchases.filter((p)=>(p.supplier||"Sin proveedor")===supplier);
    const priced = lines.filter(validComparisonPrice);
    const chronological = priced.slice().sort((a,b)=>String(b.order_date||"").localeCompare(String(a.order_date||""))||Number(b.order_id)-Number(a.order_id));
    const summary = priceSummary(priced);
    html.push('<tr><td>' + escapeHtml(supplier) + '</td><td>' + new Set(lines.map((p)=>p.order_id)).size
      + '</td><td>' + money(chronological[0]?.net_unit_price)
      + '</td><td>' + money(summary.median)
      + '</td><td>' + (summary.min===null?'—':money(summary.min)+' – '+money(summary.max))+'</td></tr>');
  }
  html.push('</tbody></table></div>');
  html.push('<p class="comparison-note">Precios históricos utilizables: ' + pricesValid.length +
    ' de ' + activePurchases.length + ' líneas activas para esta referencia. No incluir líneas excluidas ni reasignadas.</p>');
  html.push('<section class="review-decision-panel" aria-label="Decisión de normalización">');
  html.push('<h3>Decisión de revisión</h3>');
  html.push('<p class="comparison-note">Esta decisión clasifica el <strong>grupo de compras</strong>; no modifica precios ni vincula materiales automáticamente. Cada cambio queda en la bitácora.</p>');
  if (currentUserRole === "admin") {
    html.push('<label class="review-decision-label" for="reviewDecisionStatus">Resultado de la revisión</label>');
    html.push('<select id="reviewDecisionStatus" class="review-decision-select">');
    const options = [
      ["pending", "Mantener pendiente / reabrir"],
      ["needs_evidence", "Necesita más evidencia"],
      ["distinct_products", "Contiene productos distintos: NO fusionar el grupo"],
      ["ready_for_mapping", "Mismo producto verificado: vinculación posterior"],
    ];
    for (const [value, label] of options) {
      html.push('<option value="' + value + '"' +
        (value === row.review_status ? ' selected' : '') +
        (value === "ready_for_mapping" && (row.distinct_wattages > 1 || detectedAlerts.length > 0) ? ' disabled' : '') +
        '>' + escapeHtml(label) + '</option>');
    }
    html.push('</select>');
    html.push('<label class="review-decision-label" for="reviewDecisionNote">Justificación técnica / evidencia</label>');
    html.push('<textarea id="reviewDecisionNote" class="review-decision-note" maxlength="2000" rows="4" placeholder="Explica las características, diferencias o la ficha que has comprobado…">' +
      escapeHtml(row.review_note || "") + '</textarea>');
    html.push('<label class="review-decision-ack"><input type="checkbox" id="reviewDecisionAcknowledge">' +
      '<span>He comprobado las descripciones y entiendo que esto todavía no fusiona materiales.</span></label>');
    html.push('<button class="review-save-button" id="reviewDecisionSave" type="button">Guardar revisión</button>');
    html.push('<div class="review-save-message" id="reviewSaveMessage" role="status" aria-live="polite"></div>');
    if (detectedAlerts.length || row.distinct_wattages > 1) {
      html.push('<p class="comparison-note">El sistema bloquea la vinculación mientras existan ' +
        'contradicciones técnicas sin resolver. Puedes registrar que necesita evidencia o que contiene productos distintos.</p>');
    }
  } else {
    html.push('<p class="comparison-note">Puedes consultar todas las evidencias. Solo la cuenta administradora autorizada puede registrar decisiones.</p>');
  }
  if (row.reviewed_at) {
    const displayTime = new Date(row.reviewed_at);
    html.push('<p class="comparison-note">Última revisión: ' +
      escapeHtml(Number.isFinite(displayTime.getTime()) ? displayTime.toLocaleString("es-ES") : row.reviewed_at) +
      ' · ' + escapeHtml(row.reviewed_by || "Administrador") + '</p>');
  }
  if (reviewEvents.length) {
    html.push('<details class="review-audit-history"><summary>Historial de decisiones (' + reviewEvents.length + ' recientes)</summary>');
    for (const event of reviewEvents) {
      const timestamp = new Date(event.changed_at);
      html.push('<div class="review-audit-item"><strong>' +
        escapeHtml(reviewStatusLabels[event.next_status] || event.next_status) + '</strong> · ' +
        escapeHtml(Number.isFinite(timestamp.getTime()) ? timestamp.toLocaleString("es-ES") : event.changed_at) +
        '<p>' + escapeHtml(event.next_note || "Sin observaciones") + '</p></div>');
    }
    html.push('</details>');
  }
  html.push('</section>');
    html.push('<button id="reviewOpenSearch" type="button" class="review-open-search">Consultar esta referencia en el buscador</button>');
  html.push('<details id="reviewPurchaseDetails" class="review-originals"><summary>Revisar las ' +
    purchases.length + ' líneas de origen y corregir compras concretas</summary>');
  html.push('<div class="review-source-filter"><label for="reviewLineDescriptionFilter">Descripción que figura en el Excel</label>');
  html.push('<select id="reviewLineDescriptionFilter"><option value="">Todas las descripciones</option>');
  notes.forEach((note,index) => html.push('<option value="' + index + '">' + escapeHtml(note.description) +
    ' (' + note.lines + ' líneas)</option>'));
  html.push('</select><span id="reviewLinesShowing" class="muted"></span></div>');
  html.push(reviewPurchaseTableHtml(purchases, notes));
  html.push('</details>');
  reviewDetail.innerHTML = html.join("");

  const assistButton = reviewDetail.querySelector("#reviewAssistButton");
  if(assistButton) {
    assistButton.addEventListener("click", () => {
      const select=reviewDetail.querySelector("#reviewDecisionStatus");
      const note=reviewDetail.querySelector("#reviewDecisionNote");
      const checkbox=reviewDetail.querySelector("#reviewDecisionAcknowledge");
      if(!select || !note || !checkbox) return;
      if(![...select.options].some((option)=>option.value===advice.status && !option.disabled)) return;
      select.value=advice.status;
      note.value=advice.reason;
      checkbox.checked=false;
      note.focus();
    });
  }
    const saveButton = reviewDetail.querySelector("#reviewDecisionSave");
  if (saveButton) {
    saveButton.addEventListener("click", () => saveReviewDecision(row));
  }
    reviewDetail.querySelector("#reviewOpenSearch").addEventListener("click", () => {
    selectedSupplierId = null;
    supplierFilter.value = "";
    closeSupplierSuggestions();
    yearFilter.value = "";
    sortFilter.value = "relevance";
    searchInput.value = row.observed_reference;
    activateWorkspace("costs");
    runSearch();
  });
  reviewDetail.querySelectorAll("[data-review-origin-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = reviewDetail.querySelector("#review-origin-row-" + button.getAttribute("data-review-origin-index"));
      if(target) target.classList.toggle("hidden");
    });
  });

  const sourceSelector = reviewDetail.querySelector("#reviewLineDescriptionFilter");
  const details = reviewDetail.querySelector("#reviewPurchaseDetails");
  function applyDescriptionFilter() {
    if (!sourceSelector) return;
    const chosen = sourceSelector.value;
    let count = 0;
    reviewDetail.querySelectorAll("[data-review-row-group]").forEach((tr) => {
      const visible = chosen === "" || tr.getAttribute("data-review-row-group") === chosen;
      const isExpanded = tr.classList.contains("review-line-origin-row");
      if (isExpanded) tr.classList.add("hidden");
      else {
        tr.classList.toggle("hidden",!visible);
        if(visible)count++;
      }
    });
    const showing = reviewDetail.querySelector("#reviewLinesShowing");
    if(showing) showing.textContent = count + " líneas";
  }
  if(sourceSelector) {
    sourceSelector.addEventListener("change",applyDescriptionFilter);
    applyDescriptionFilter();
  }
  reviewDetail.querySelectorAll("[data-review-description-index]").forEach((button) => {
    button.addEventListener("click", () => {
      if(!sourceSelector || !details)return;
      sourceSelector.value=button.getAttribute("data-review-description-index");
      details.open=true;
      applyDescriptionFilter();
      details.scrollIntoView?.({behavior:"smooth",block:"start"});
    });
  });
  reviewDetail.querySelectorAll("[data-edit-review-line-index]").forEach((button) => {
    button.addEventListener("click", () => {
      if(currentUserRole!=="admin")return;
      const index=Number(button.getAttribute("data-edit-review-line-index"));
      if(Number.isInteger(index) && purchases[index]) openPurchaseReviewEditor(purchases[index],row);
    });
  });
}

async function showReviewCandidate(row) {
  const requestId = ++reviewDetailGeneration;
  reviewDetail.innerHTML = '<div class="empty-state">Consultando líneas originales y proveedores…</div>';
  const [history, details, events] = await Promise.all([
    supabase.rpc("purchase_reference_review_history", {
      p_reference: row.observed_reference, result_limit: 500,
    }),
    supabase.from("normalization_review_groups")
      .select("reference_key,review_status,review_note,reviewed_by,reviewed_at,distinct_wattages,risk_level,suggested_family,family_signals,technical_alerts,evidence_refreshed_at")
      .eq("reference_key", row.reference_key).maybeSingle(),
    supabase.from("normalization_review_events")
      .select("id,previous_status,next_status,next_note,changed_by,changed_at")
      .eq("reference_key", row.reference_key).order("changed_at",{ascending:false}).limit(12),
  ]);
  if (requestId !== reviewDetailGeneration) return;
  if (history.error || details.error || !details.data) {
    console.error("Error consultando candidato de normalización", history.error || details.error);
    reviewDetail.innerHTML = '<div class="empty-state">No se pudo cargar esta referencia.</div>';
    return;
  }
  if (!(history.data || []).length) {
    reviewDetail.innerHTML = '<div class="empty-state">No existen compras elegibles para esta referencia.</div>';
    return;
  }
  if (events.error) console.warn("Historial de decisiones no disponible", events.error);
  const freshRow = { ...row, ...details.data };
  const listed = reviewRows.find((item) => item.reference_key === row.reference_key);
  if (listed) Object.assign(listed, { review_status: freshRow.review_status });
  renderReviewCandidate(freshRow, history.data, events.data || []);
}


async function saveReviewDecision(row) {
  const button = reviewDetail.querySelector("#reviewDecisionSave");
  const statusField = reviewDetail.querySelector("#reviewDecisionStatus");
  const noteField = reviewDetail.querySelector("#reviewDecisionNote");
  const acknowledgment = reviewDetail.querySelector("#reviewDecisionAcknowledge");
  const message = reviewDetail.querySelector("#reviewSaveMessage");
  if (!button || !statusField || !noteField || !acknowledgment || !message) return;
  if (currentUserRole !== "admin") return;

  const status = statusField.value;
  const note = noteField.value.trim();
  message.classList.remove("is-error");
  message.textContent = "";

  if (!acknowledgment.checked) {
    message.textContent = "Marca la casilla de comprobación antes de guardar.";
    message.classList.add("is-error");
    return;
  }
  const minNote = status === "pending" ? 0 : status === "needs_evidence" ? 12 : 25;
  if (note.length < minNote) {
    message.textContent = "Explica tu decisión con al menos " + minNote + " caracteres.";
    message.classList.add("is-error");
    noteField.focus();
    return;
  }
  if (status === "ready_for_mapping" &&
      (row.distinct_wattages > 1 || candidateTechnicalAlerts(row).length > 0)) {
    message.textContent = "Hay señales técnicas contradictorias. No es posible dar esta identidad por verificada.";
    message.classList.add("is-error");
    return;
  }
  if (status === row.review_status && note === String(row.review_note || "").trim()) {
    message.textContent = "No hay cambios que guardar.";
    return;
  }

  button.disabled = true;
  button.textContent = "Guardando…";
  // Optimistic lock: evita sobrescribir una decisión modificada por otra sesión.
  let command = supabase.from("normalization_review_groups")
    .update({ review_status: status, review_note: note || null })
    .eq("reference_key", row.reference_key)
    .eq("review_status", row.review_status);
  if (row.reviewed_at) command = command.eq("reviewed_at", row.reviewed_at);
  else command = command.is("reviewed_at", null);
  const { data, error } = await command
    .select("reference_key,review_status,review_note,reviewed_by,reviewed_at").maybeSingle();
  if (!button.isConnected) return;
  button.disabled = false;
  button.textContent = "Guardar revisión";
  if (error || !data) {
    console.error("No se pudo guardar la revisión", error);
    message.textContent = error?.message || "La revisión cambió en otra sesión. Vuelve a abrirla y comprueba los datos.";
    message.classList.add("is-error");
    return;
  }
  Object.assign(row, data);
  const current = reviewRows.find((item) => item.reference_key === row.reference_key);
  if (current) Object.assign(current, data);
  renderReviewResults();
  const selected = reviewRows.find((item) => item.reference_key === row.reference_key);
  if (selected) reviewSelectedKey = selected.reference_key;
  await showReviewCandidate(row);
  const savedMessage = reviewDetail.querySelector("#reviewSaveMessage");
  if (savedMessage) savedMessage.textContent = "Decisión guardada y registrada en la bitácora.";
}

// V12: cada corrección opera SOBRE UNA LÍNEA, no sobre todas las compras del código.
// No se borra ningún pedido ni se reescribe la hoja Excel de origen.
function updatePurchaseReviewAction() {
  const action=purchaseEditAction.value;
  purchaseEditFields.classList.toggle("hidden",action!=="correct");
  purchaseEditOrderConfirmPanel.classList.toggle("hidden",action!=="exclude_order");
  if(action!=="exclude_order")purchaseEditOrderConfirm.value="";
  purchaseEditSubmit.textContent=action==="exclude_order"?"Excluir pedido completo" :
    action==="restore_order"?"Restaurar pedido completo" :
    action==="exclude"?"Excluir esta línea" :
    action==="restore"?"Restaurar esta línea" : "Guardar corrección";
  purchaseEditSubmit.classList.toggle("is-danger",["exclude","exclude_order"].includes(action));
  purchaseEditStatus.textContent="";
  purchaseEditStatus.classList.remove("is-error");
}

function openPurchaseReviewEditor(line,candidate) {
  if(currentUserRole!=="admin"||purchaseEditIsSaving)return;
  purchaseLineInEditor=line;
  purchaseCandidateInEditor=candidate;
  const numberOfOrder=orderLabel(line);
  purchaseEditHeading.textContent="Revisar compra · "+numberOfOrder;
  purchaseEditSource.innerHTML=
    '<div><strong>Pedido:</strong> '+escapeHtml(numberOfOrder)+
    ' · '+escapeHtml(line.supplier||"—")+' · '+escapeHtml(line.order_date||"—")+'</div>'+
    '<div><strong>Referencia del Excel:</strong> '+escapeHtml(line.supplier_reference_source||"—")+'</div>'+
    '<div><strong>Descripción del Excel:</strong> '+escapeHtml(line.description_source||"—")+'</div>'+
    '<div><strong>Precio original:</strong> '+money(line.net_unit_price)+
    ' · Cantidad: '+number(line.quantity,2)+'</div>'+
    '<div class="purchase-review-source-file"><strong>Archivo:</strong> '+
    escapeHtml(line.source_filename||"—")+'</div>'+
    (line.line_excluded?'<div class="purchase-review-existing-status">Esta línea está excluida del catálogo.</div>':'')+
    (line.order_excluded?'<div class="purchase-review-existing-status">Todo este pedido está excluido.</div>':'');
  purchaseEditReference.value=line.supplier_reference||"";
  purchaseEditDescription.value=line.description_original||"";
  purchaseEditReason.value="";
  purchaseEditAcknowledged.checked=false;
  purchaseEditOrderConfirm.value="";
  purchaseEditOrderExpected.textContent=numberOfOrder;
  purchaseEditAction.value=line.order_excluded?"restore_order":line.line_excluded?"restore":"correct";
  purchaseEditAction.querySelector('option[value="exclude_order"]').disabled=!!line.order_excluded;
  purchaseEditAction.querySelector('option[value="restore_order"]').disabled=!line.order_excluded;
  purchaseEditAction.querySelector('option[value="exclude"]').disabled=!!line.line_excluded;
  purchaseEditAction.querySelector('option[value="restore"]').disabled=
    !line.line_excluded && !line.corrected_reference && !line.corrected_description;
  updatePurchaseReviewAction();
  purchaseEditDialog.showModal();
}

async function submitPurchaseReview() {
  const line=purchaseLineInEditor, candidate=purchaseCandidateInEditor;
  if(!line || !candidate || purchaseEditIsSaving || currentUserRole!=="admin")return;
  const action=purchaseEditAction.value;
  const orderAction=action==="exclude_order"||action==="restore_order";
  const reason=purchaseEditReason.value.trim();
  const minLength=orderAction?25:20;
  purchaseEditStatus.classList.remove("is-error");
  if(!purchaseEditAcknowledged.checked){
    purchaseEditStatus.textContent="Debes marcar la confirmación después de comprobar el pedido.";
    purchaseEditStatus.classList.add("is-error");
    return;
  }
  if(reason.length<minLength){
    purchaseEditStatus.textContent="Justifica tu decisión con al menos "+minLength+" caracteres.";
    purchaseEditStatus.classList.add("is-error");
    purchaseEditReason.focus();
    return;
  }
  if(action==="exclude_order" &&
      purchaseEditOrderConfirm.value.trim().toUpperCase()!==orderLabel(line).toUpperCase()){
    purchaseEditStatus.textContent="Escribe exactamente el número del pedido para confirmar la exclusión completa.";
    purchaseEditStatus.classList.add("is-error");
    purchaseEditOrderConfirm.focus();
    return;
  }

  const payload=orderAction?{
    p_order_id:line.order_id,
    p_exclude:action==="exclude_order",
    p_reason:reason,
    p_expected_revision:Number(line.order_review_revision??0),
  }:{
    p_line_id:line.order_line_id,
    p_action:action,
    p_reference:action==="correct"?purchaseEditReference.value.trim():null,
    p_description:action==="correct"?purchaseEditDescription.value.trim():null,
    p_reason:reason,
    p_expected_revision:Number(line.line_review_revision??0),
  };
  purchaseEditIsSaving=true;
  purchaseEditSubmit.disabled=true;
  purchaseEditCancel.disabled=true;
  purchaseEditClose.disabled=true;
  purchaseEditStatus.textContent="Guardando la decisión con auditoría…";
  let response;
  try{
    response=await supabase.rpc(orderAction?"review_purchase_order":"review_purchase_line",payload);
  }catch(error){
    response={error};
  }
  purchaseEditIsSaving=false;
  purchaseEditSubmit.disabled=false;
  purchaseEditCancel.disabled=false;
  purchaseEditClose.disabled=false;
  if(response.error || !response.data || response.data.result!=="saved"){
    purchaseEditStatus.textContent=response.error?.message||"No se pudo guardar. Actualiza la ficha y vuelve a comprobar el pedido.";
    purchaseEditStatus.classList.add("is-error");
    return;
  }
  purchaseEditDialog.close();
  purchaseLineInEditor=null;
  purchaseCandidateInEditor=null;
  // Volver a consultar las evidencias del grupo antes de recomendar nuevas decisiones.
  await runReviewSearch();
  await showReviewCandidate(candidate);
  reviewLoaded=true;
}

purchaseEditAction.addEventListener("change",updatePurchaseReviewAction);
purchaseEditSubmit.addEventListener("click",submitPurchaseReview);
function closePurchaseReviewEditor() {
  if(!purchaseEditIsSaving && purchaseEditDialog.open)purchaseEditDialog.close();
}
purchaseEditCancel.addEventListener("click",closePurchaseReviewEditor);
purchaseEditClose.addEventListener("click",closePurchaseReviewEditor);
purchaseEditDialog.addEventListener("cancel",(event)=>{
  if(purchaseEditIsSaving)event.preventDefault();
});
purchaseEditDialog.addEventListener("close",()=>{
  if(!purchaseEditIsSaving){
    purchaseLineInEditor=null;
    purchaseCandidateInEditor=null;
  }
});

costsTab.addEventListener("click", () => activateWorkspace("costs"));
reviewTab.addEventListener("click", () => activateWorkspace("review"));
importTab.addEventListener("click", () => activateWorkspace("import"));
reviewMoreButton.addEventListener("click", () => runReviewSearch({ append: true }));
reviewRisk.addEventListener("change", () => runReviewSearch());
reviewStatusFilter.addEventListener("change", () => runReviewSearch());
reviewFamilyFilter.addEventListener("change", () => runReviewSearch());
reviewSort.addEventListener("change", () => runReviewSearch());
reviewAlertsOnly.addEventListener("change", () => runReviewSearch());
reviewQuery.addEventListener("input", () => {
  if (reviewTypingTimeout !== null) clearTimeout(reviewTypingTimeout);
  reviewTypingTimeout = setTimeout(() => {
    reviewTypingTimeout = null;
    runReviewSearch();
  }, 250);
});
reviewQuery.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    if (reviewTypingTimeout !== null) clearTimeout(reviewTypingTimeout);
    reviewTypingTimeout = null;
    runReviewSearch();
  }
});

// --- V10: auditoría de pedidos recientes y posibles huecos de numeración.
// La comprobación numérica no permite inferir que un pedido se haya perdido.
function importAuditMetric(label,value,detail="") {
  return '<div class="import-audit-stat"><span>'+escapeHtml(label)+'</span><strong>'+
    escapeHtml(String(value))+'</strong>'+
    (detail?'<small>'+escapeHtml(detail)+'</small>':'')+'</div>';
}

async function loadImportDashboard() {
  if(currentUserRole!=="admin")return;
  const requestId=++importAuditGeneration;
  importAuditLoaded=true;
  const year=Number(importAuditYear.value);
  importAuditRefresh.disabled=true;
  importAuditStatus.textContent="Comprobando histórico y numeración de "+year+"…";
  importAuditStatus.classList.remove("is-error");
  try {
    const [allOrders,allLines,yearOrders,flaggedOrders,reviewPending,counter,imports] = await Promise.all([
      supabase.from("orders").select("id",{count:"exact",head:true}),
      supabase.from("order_lines").select("id",{count:"exact",head:true}),
      supabase.from("orders").select("id",{count:"exact",head:true}).eq("order_year",year),
      supabase.from("orders").select("id",{count:"exact",head:true})
        .eq("order_year",year).neq("validation_status","valid"),
      supabase.from("normalization_review_groups")
        .select("reference_key",{count:"exact",head:true}).eq("review_status","pending"),
      supabase.rpc("order_counter",{p_year:year}),
      supabase.from("order_import_audit")
        .select("id,created_at,line_count,source_filename,order:orders!inner(id,order_year,order_number,order_subnumber,order_reference,order_date,declared_total,validation_status,supplier:suppliers(name))",{count:"exact"})
        .eq("order.order_year",year)
        .order("created_at",{ascending:false})
        .limit(20),
    ]);
    if(requestId!==importAuditGeneration)return;
    const all=[allOrders,allLines,yearOrders,flaggedOrders,reviewPending,counter,imports];
    const firstError=all.find((x)=>x.error)?.error;
    if(firstError)throw firstError;
    const last=counter.data?.[0]?.last_registered;
    const lastNum=last===null||last===undefined?null:Number(last);
    let possibleGaps=[];
    let start=null;
    if(lastNum!==null&&Number.isFinite(lastNum)&&lastNum>=1){
      start=Math.max(1,lastNum-99);
      const numbers=await supabase.from("orders").select("order_number")
        .eq("order_year",year).gte("order_number",start).lte("order_number",lastNum)
        .limit(1000);
      if(requestId!==importAuditGeneration)return;
      if(numbers.error)throw numbers.error;
      const found=new Set((numbers.data||[]).map((o)=>Number(o.order_number)));
      for(let n=start;n<=lastNum;n++)if(!found.has(n))possibleGaps.push(n);
    }
    const recent=imports.data||[];
    // El listado indica pedidos creados mediante el flujo web (V9 en adelante).
    importAuditMetrics.innerHTML=[
      importAuditMetric("Pedidos en la base",number(allOrders.count,0),"Todos los años"),
      importAuditMetric("Líneas históricas",number(allLines.count,0),"Todos los años"),
      importAuditMetric("Pedidos de "+year,number(yearOrders.count,0),"Incluye subpedidos"),
      importAuditMetric("Último número registrado",lastNum===null?"—":String(year).slice(-2)+"/"+lastNum,"Siguiente: "+(lastNum===null?"—":String(year).slice(-2)+"/"+(lastNum+1))),
      importAuditMetric("Pedidos con aviso de totales",number(flaggedOrders.count,0),"Del año seleccionado"),
      importAuditMetric("Normalizaciones pendientes",number(reviewPending.count,0),"Todas las referencias"),
      importAuditMetric("Altas desde la web",number(imports.count??recent.length,0),"Del año seleccionado"),
      importAuditMetric("Números sin pedido",number(possibleGaps.length,0),"Últimos 100 números"),
    ].join("");
    importGapCount.textContent=possibleGaps.length+" posibles huecos";
    importGapDescription.textContent=start===null
      ?"Todavía no hay pedidos numerados para este año."
      :"Se comprueban los números del "+String(year).slice(-2)+"/"+start+
       " al "+String(year).slice(-2)+"/"+lastNum+
       ". Son ausencias numéricas, no errores confirmados. Puede haber anulaciones, reservas o pedidos sin incorporar.";
    importGaps.replaceChildren();
    if(!possibleGaps.length){
      const p=document.createElement("p");
      p.className="import-gaps-empty";
      p.textContent="No se observan números sin pedido en este tramo.";
      importGaps.appendChild(p);
    }else{
      for(const n of possibleGaps){
        const tag=document.createElement("span");
        tag.className="import-gap-token";
        tag.textContent=String(year).slice(-2)+"/"+n;
        importGaps.appendChild(tag);
      }
    }
    importAuditRows.replaceChildren();
    if(!recent.length){
      const tr=document.createElement("tr");
      const td=document.createElement("td");
      td.colSpan=8;
      td.textContent="No hay importaciones registradas mediante la web para "+year+".";
      tr.appendChild(td);
      importAuditRows.appendChild(tr);
    }
    for(const entry of recent){
      const o=entry.order||{};
      const supplier=o.supplier?.name||"—";
      const orderNum=o.order_number?String(year).slice(-2)+"/"+o.order_number+
        (o.order_subnumber?"."+o.order_subnumber:""):(o.order_reference||"—");
      const date=new Date(entry.created_at);
      const imported=Number.isFinite(date.getTime())?date.toLocaleString("es-ES"):"—";
      const cells=[
        imported,
        orderNum,
        o.order_date||"—",
        supplier,
        entry.source_filename||"—",
        String(entry.line_count??"—"),
        money(o.declared_total),
        o.validation_status==="valid"?"Correcto":o.validation_status==="incomplete_prices"
          ?"Precios incompletos":o.validation_status==="total_mismatch"
          ?"No cuadra":"Pendiente de revisar",
      ];
      const tr=document.createElement("tr");
      if(o.validation_status!=="valid")tr.classList.add("import-audit-flag");
      cells.forEach((value)=>{
        const td=document.createElement("td");
        td.textContent=value;
        tr.appendChild(td);
      });
      importAuditRows.appendChild(tr);
    }
    importAuditStatus.textContent="Control actualizado. "+recent.length+
      " importaciones web recientes consultadas; "+possibleGaps.length+
      " posibles huecos numéricos en el tramo analizado.";
    importAuditRefresh.disabled=false;
  } catch(error) {
    if(requestId!==importAuditGeneration)return;
    console.error("Control de importación no disponible",error);
    importAuditStatus.textContent="No se pudo actualizar el control: "+
      (error?.message||"consulta no disponible")+". Puedes volver a intentarlo.";
    importAuditStatus.classList.add("is-error");
    importAuditRefresh.disabled=false;
    importAuditLoaded=false;
  }
}
importAuditRefresh.addEventListener("click",loadImportDashboard);
importAuditYear.addEventListener("change",loadImportDashboard);

// --- V9: alta controlada de pedidos nuevos (solo administradores).
function importMessage(message, isError=false) {
  importStatus.textContent=message;
  importStatus.classList.toggle("is-error",isError);
}
function showImportPreview({payload,warnings,computedTotal}, blocker=null) {
  const html=[];
  html.push('<h3>Vista previa — '+escapeHtml(payload.source_filename)+'</h3>');
  html.push('<div class="import-metrics">');
  const rows=[
    ["Pedido",String(payload.order_year).slice(-2)+"/"+payload.order_number+(payload.order_subnumber?"."+payload.order_subnumber:"")],
    ["Fecha",payload.order_date||"—"],
    ["Proveedor",payload.supplier],
    ["Obra",payload.project||"No indicada"],
    ["Líneas",String(payload.lines.length)],
    ["Importe del pedido",money(payload.declared_total)],
    ["Suma de líneas",money(computedTotal)],
    ["Revisión de totales",payload.validation_status==="valid"?"Cuadra":payload.validation_status==="incomplete_prices"?"Precios incompletos":"Diferencia detectada"],
  ];
  for(const [label,value] of rows) {
    html.push('<div class="import-metric"><span>'+escapeHtml(label)+'</span><strong>'+escapeHtml(value)+'</strong></div>');
  }
  html.push('</div>');
  html.push('<p class="import-digest">Huella SHA-256 del Excel: <code>'+escapeHtml(payload.source_sha256)+'</code></p>');
  if(blocker){
    html.push('<p class="import-warning-block"><strong>Importación bloqueada:</strong> '+escapeHtml(blocker)+'</p>');
  }
  if(warnings.length){
    html.push('<div class="import-warnings"><strong>Advertencias para revisar ('+warnings.length+')</strong><ul>');
    for(const warning of warnings.slice(0,20)) html.push('<li>'+escapeHtml(warning)+'</li>');
    if(warnings.length>20)html.push('<li>Hay '+(warnings.length-20)+' advertencias más.</li>');
    html.push('</ul></div>');
  }
  html.push('<div class="import-table-scroll"><table class="import-lines-table"><thead><tr>');
  html.push('<th>Fila</th><th>Referencia</th><th>Descripción original</th><th>Cant.</th><th>PVP</th><th>Dto.</th><th>Neto</th><th>Total</th></tr></thead><tbody>');
  for(const row of payload.lines.slice(0,50)) {
    html.push('<tr><td>'+row.source_row+'</td><td>'+escapeHtml(row.supplier_reference||"—")+
      '</td><td>'+escapeHtml(row.description_original)+'</td><td>'+escapeHtml(row.quantity)+
      '</td><td>'+money(row.pvp)+'</td><td>'+escapeHtml(displayDiscount(row.discount_raw))+
      '</td><td>'+money(row.net_unit_price)+'</td><td>'+money(row.total_price)+'</td></tr>');
  }
  html.push('</tbody></table></div>');
  if(payload.lines.length>50) html.push('<p class="hint">Se muestran 50 de '+payload.lines.length+' líneas. La importación incluirá todas.</p>');
  importPreview.innerHTML=html.join("");
  importPreview.classList.remove("hidden");
  importConfirmPanel.classList.toggle("hidden",!!blocker);
  importAcknowledged.checked=false;
  importSubmitButton.disabled=true;
}

async function inspectNewOrderFile(){
  const generation=++importSelectionGeneration;
  currentImport=null;
  importAcknowledged.checked=false;
  importSubmitButton.disabled=true;
  importConfirmPanel.classList.add("hidden");
  importPreview.classList.add("hidden");
  const file=importFile.files?.[0];
  if(!file){importMessage("Selecciona un XLSX de pedido.");return;}
  if(currentUserRole!=="admin"){importMessage("No tienes permisos de importación.",true);return;}
  importMessage("Leyendo el Excel y sus fórmulas calculadas localmente…");
  try{
    const extracted=await readProsoelXlsx(file);
    if(generation!==importSelectionGeneration)return;
    const p=extracted.payload;

    const duplicate=await supabase.from("orders")
      .select("id,order_reference,source_sha256").eq("source_sha256",p.source_sha256).maybeSingle();
    if(generation!==importSelectionGeneration)return;
    if(duplicate.error)throw duplicate.error;
    let blocker=null;
    if(duplicate.data){
      blocker="Este mismo archivo ya se importó ("+
        (duplicate.data.order_reference||"pedido #"+duplicate.data.id)+"). No se creará un duplicado.";
    }else{
      const reused=await supabase.from("orders")
        .select("id,order_reference,order_subnumber,source_sha256")
        .eq("order_year",p.order_year).eq("order_number",p.order_number)
        .limit(40);
      if(generation!==importSelectionGeneration)return;
      if(reused.error)throw reused.error;
      const sameNumber=(reused.data||[]).find((item)=>
        String(item.order_subnumber||"")===String(p.order_subnumber||""));
      if(sameNumber){
        blocker="Ya existe "+(sameNumber.order_reference||"ese número de pedido")+
          " con un archivo diferente. No se incorporará sin resolver la numeración.";
      }
    }
    currentImport={...extracted,blocker};
    showImportPreview(extracted,blocker);
    importMessage(blocker?"Revisa el pedido existente: la importación está detenida.":
      extracted.warnings.length
        ?"Vista previa lista. Revisa las advertencias y confirma solo si los datos corresponden al pedido."
        :"Vista previa lista. Comprueba los datos y confirma cuando estés conforme.",!!blocker);
  }catch(error){
    if(generation!==importSelectionGeneration)return;
    console.error("No se pudo leer el pedido",error);
    importMessage(error?.message||"No se ha podido interpretar este archivo.",true);
  }
}

async function commitNewOrder(){
  if(currentUserRole!=="admin"||!currentImport||currentImport.blocker||!importAcknowledged.checked)return;
  const payload=currentImport.payload;
  const generation=importSelectionGeneration;
  importSubmitButton.disabled=true;
  importFile.disabled=true;
  importMessage("Guardando pedido y todas sus líneas en una sola operación…");
  const {data,error}=await supabase.rpc("import_new_prosoel_order",{p_order:payload});
  if(generation!==importSelectionGeneration)return;
  importFile.disabled=false;
  const outcome=Array.isArray(data)?data[0]:data;
  if(error){
    importMessage(error.message||"La importación ha fallado. Ninguna línea ha quedado grabada parcialmente.",true);
    importSubmitButton.disabled=false;
    return;
  }
  if(!outcome){
    importMessage("No se recibió confirmación de Supabase. Consulta el pedido antes de reintentar.",true);
    return;
  }
  if(outcome.result==="imported"){
    importMessage("Pedido guardado correctamente · "+outcome.imported_lines+
      " líneas · Resultado de totales: "+outcome.detail+".");
    currentImport=null;
    importConfirmPanel.classList.add("hidden");
    importFile.value="";
    reviewLoaded=false; // Refrescar la cola al volver a Normalización.
    await Promise.all([loadCounter(),loadSuppliers(),loadImportDashboard()]);
  }else{
    importMessage(outcome.result==="duplicate"
      ?"El mismo archivo ya figura en el histórico. No se ha duplicado."
      :outcome.result==="number_conflict"
        ?"Ya existe ese número de pedido con otro archivo. Revisa antes de intentar otra importación."
        :"Supabase no ha importado el archivo: "+(outcome.detail||outcome.result),true);
    importConfirmPanel.classList.add("hidden");
  }
}

importFile.addEventListener("change",inspectNewOrderFile);
importAcknowledged.addEventListener("change",()=>{
  importSubmitButton.disabled=!importAcknowledged.checked || !currentImport || !!currentImport.blocker;
});
importSubmitButton.addEventListener("click",commitNewOrder);

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
