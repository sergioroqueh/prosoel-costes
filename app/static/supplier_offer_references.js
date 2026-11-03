// Números de oferta del proveedor (documentación distinta de los PDF).
// Compatibilidad de lectura con las cuatro referencias ya guardadas en orders.
export async function fetchSupplierOfferRefsMap(client, rows) {
  const orderIds = [...new Set((rows || [])
    .filter(row => Number(row.order_year) >= 2026)
    .map(row => Number(row.order_id ?? row.id))
    .filter(id => Number.isSafeInteger(id) && id > 0))];
  const map = new Map();
  const add = (id, reference) => {
    const ref = String(reference || "").trim();
    if (!ref) return;
    const key = String(id);
    if (!map.has(key)) map.set(key, []);
    const list = map.get(key);
    if (!list.some(value => value.toLocaleUpperCase("es") === ref.toLocaleUpperCase("es"))) {
      list.push(ref);
    }
  };
  for (let offset = 0; offset < orderIds.length; offset += 150) {
    const chunk = orderIds.slice(offset, offset + 150);
    // El campo legacy se mantiene sin ninguna modificación.
    const old = await client.from("orders")
      .select("id,supplier_offer_reference").in("id", chunk);
    if (old.error) {
      console.warn("No se han podido leer las referencias de oferta antiguas:", old.error.message);
    } else {
      for (const row of old.data || []) add(row.id, row.supplier_offer_reference);
    }
    const fresh = await client.from("order_supplier_offer_references")
      .select("order_id,offer_reference").in("order_id", chunk)
      .order("id", { ascending: true });
    if (fresh.error) {
      // Permite desplegar la interfaz de pruebas sin romper el buscador.
      console.warn("Las referencias de oferta múltiples aún no están disponibles:", fresh.error.message);
      continue;
    }
    for (const row of fresh.data || []) add(row.order_id, row.offer_reference);
  }
  return map;
}

export function supplierOfferRefsHtml(references, escapeHtml) {
  if (!Array.isArray(references) || !references.length) return "";
  return references.map(reference =>
    '<span class="supplier-offer-ref" title="Número de oferta del proveedor">' +
    escapeHtml(reference) + '</span>'
  ).join(" ");
}
