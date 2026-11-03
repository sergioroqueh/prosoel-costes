// Enlaces documentales de ofertas comprobadas. Nunca se deducen de albaranes
// ni del nombre de un PDF: la asociación se revisa por pedido y proveedor.
const DRIVE_ID_PATTERN = /^[A-Za-z0-9_-]{10,128}$/;

export function offerDocumentUrl(driveFileId) {
  const id = String(driveFileId ?? "").trim();
  return DRIVE_ID_PATTERN.test(id) ? "https://drive.google.com/file/d/" + id + "/view" : null;
}

export function offerLinksHtml(documents, escapeHtml) {
  if (!Array.isArray(documents)) return "";
  return documents.map((document, index) => {
    const url = offerDocumentUrl(document.drive_file_id);
    if (!url) return "";
    const label = documents.length > 1 ? "Ver oferta PDF " + (index + 1) : "Ver oferta PDF";
    return '<a class="offer-document-link" href="' + url +
      '" target="_blank" rel="noopener noreferrer" title="' +
      escapeHtml(document.filename || "Oferta del proveedor") + '">' +
      escapeHtml(label) + ' ↗</a>';
  }).filter(Boolean).join(" ");
}

export async function fetchVerifiedOfferMap(client, inputRows) {
  const orders = (inputRows || []).filter(row => Number(row?.order_year) === 2026);
  const ids = [...new Set(orders.map(row => Number(row.order_id ?? row.id))
    .filter(id => Number.isSafeInteger(id) && id > 0))];
  const byOrder = new Map();
  if (!ids.length) return byOrder;

  // Consultas en lotes pequeños para evitar filtros excesivos de PostgREST.
  for (let start = 0; start < ids.length; start += 150) {
    const { data, error } = await client.from("order_offer_documents")
      .select("order_id,drive_file_id,filename,offer_reference")
      .eq("review_status", "verified")
      .in("order_id", ids.slice(start, start + 150));
    if (error) {
      // Si la migración todavía no está desplegada, las consultas existentes
      // siguen funcionando. No simular enlaces sin comprobación documental.
      console.warn("Ofertas documentales no disponibles:", error.message);
      return new Map();
    }
    for (const document of data || []) {
      if (!offerDocumentUrl(document.drive_file_id)) continue;
      const key = String(document.order_id);
      if (!byOrder.has(key)) byOrder.set(key, []);
      byOrder.get(key).push(document);
    }
  }
  return byOrder;
}
