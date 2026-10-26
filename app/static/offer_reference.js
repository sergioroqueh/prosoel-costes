// Número de oferta del proveedor: lectura estricta desde cabecera de pedido.
// No se infiere de nombres de archivo, número del pedido ni descripciones.
function fold(value) {
  return String(value ?? "").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[º°]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim().toUpperCase().replace(/\s+/g, " ");
}

export function isOfferHeaderLabel(value) {
  const label = fold(value);
  return /^(?:(?:N|NUM|NUMERO|NRO)\s+(?:DE\s+(?:LA\s+)?)?OFERTA(?:\s+(?:DEL?\s+)?PROVEEDOR)?|(?:REF|REFERENCIA)\s+(?:DE\s+(?:LA\s+)?)?OFERTA(?:\s+(?:DEL?\s+)?PROVEEDOR)?|OFERTA(?:\s+(?:N|NUM|NUMERO|NRO))?(?:\s+(?:DEL?\s+)?PROVEEDOR)?)$/.test(label);
}

export function cleanOfferReference(value) {
  if (value === null || value === undefined || typeof value === "boolean") return null;
  const raw = String(value).trim();
  if (!raw || raw.length > 120) return null;
  if (/^(?:0+|[-—–.]+|N\s*\/\s*A|NO|NINGUNA?|SIN OFERTA|NO HAY OFERTA|NO APLICA|PENDIENTE|PRECIO(?:S)? (?:DE )?REFERENCIA|PRECIO(?:S)? TARIFA|SEGUN TARIFA)$/i.test(raw)) return null;
  if (/^[\s"'=<>]*$/.test(raw)) return null;
  if (/[\u0000-\u001f]/.test(raw)) return null;
  return raw;
}

// ws: lector de celdas del mismo Excel; headerRow marca comienzo de partidas.
// Busca solo en columna A del bloque de cabecera, y recupera la celda C
// (formato PROSOEL). Si C está vacía, permite la B sin inventar valores.
export function extractSupplierOfferReference(ws, headerRow) {
  const end = Math.min(80, Math.max(0, Number(headerRow || 0) - 1));
  for (let row = 1; row <= end; row++) {
    const label = ws.get(row, "A");
    if (!isOfferHeaderLabel(label)) continue;
    const textC = cleanOfferReference(ws.get(row, "C"));
    const textB = cleanOfferReference(ws.get(row, "B"));
    const reference = textC || textB;
    return reference ? { reference, sourceLabel: String(label).trim() } : null;
  }
  return null;
}
