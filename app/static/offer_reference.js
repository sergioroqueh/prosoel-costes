// Número de oferta del proveedor: solo evidencias explícitas de la cabecera.
// No se infiere del nombre del archivo, números del pedido ni de los materiales.
function fold(value) {
  return String(value ?? "").replace(/[º°]/g, "").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
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

// Solo texto de OBSERVACIONES y frases vinculadas expresamente a "OFERTA".
// La coincidencia devuelve exactamente el código, sin perder ceros iniciales.
// Casos: "PEDIDO SEGÚN OFERTA Nº 5100012", "OFERTA Nº OF-000123/A".
// La palabra OFERTA aislada, precios de referencia y otras cifras se ignoran.
export function extractOfferFromObservations(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ");
  const identifier = "([A-Z0-9][A-Z0-9._/-]{0,119})";
  const number = "(?:N[º°o.]?|N[ÚU]M(?:ERO)?\\.?|NRO\\.?|REF(?:ERENCIA)?\\.?)";
  const patterns = [
    new RegExp("(?:PEDIDO\\s+)?SEG[UÚ]N\\s+(?:LA\\s+)?OFERTA\\s*(?:"+number+"\\s*)?[:#-]?\\s*"+identifier,"gi"),
    new RegExp("\\bOFERTA\\s*"+number+"\\s*[:#-]?\\s*"+identifier,"gi"),
    new RegExp("\\b"+number+"\\s+DE\\s+OFERTA\\s*[:#-]?\\s*"+identifier,"gi"),
  ];
  const candidates=[];
  for (const pattern of patterns) {
    for (const m of text.matchAll(pattern)) {
      const candidate=cleanOfferReference(m[1]);
      if (!candidate || !/\d/.test(candidate)) continue;
      // "SIN OFERTA Nº...", "NO HAY OFERTA" no documentan una oferta.
      const context=text.slice(Math.max(0,m.index-20),m.index);
      if (/(?:\bSIN|\bNO(?:\s+HAY)?)\s*$|(?:PRECIO|TARIFA)\s+(?:DE\s+)?$/i.test(context)) continue;
      if (/^(?:DE|DEL|LA|EL|SEGUN|SEGÚN|N|Nº|NUMERO|NÚMERO|REF|REFERENCIA)$/i.test(candidate)) continue;
      candidates.push(candidate);
    }
  }
  const distinct=[...new Set(candidates.map(s=>s.toUpperCase()))];
  return distinct.length===1?candidates[0]:null;
}

// ws.get(row, col): lector XLSX real; headerRow: fila de inicio de partidas.
// Comprobamos primero la etiqueta exacta en A con valor C/B, y también
// OBSERVACIONES en D:G de la cabecera (el ejemplo real 25/06 usa D4).
// Si hay dos referencias de oferta distintas, no se elige arbitrariamente.
export function extractSupplierOfferReference(ws, headerRow) {
  const end = Math.min(80, Math.max(0, Number(headerRow || 0) - 1));
  const found=[];
  for (let row=1; row<=end; row++) {
    const label=ws.get(row,"A");
    if (!isOfferHeaderLabel(label)) continue;
    const reference=cleanOfferReference(ws.get(row,"C")) ||
      cleanOfferReference(ws.get(row,"B"));
    if(reference) found.push({reference,sourceLabel:String(label).trim()});
  }
  // OBSERVACIONES aparece en D4 en la plantilla real; no buscar en la tabla
  // de partidas ni en direcciones, contactos, listas de almacenes, etc.
  for (let row=1; row<=Math.min(end,16); row++) {
    for (const col of ["D","E","F","G"]) {
      const text=ws.get(row,col);
      if (typeof text!=="string" || !/\bOBSERVACIONES\b/i.test(text)) continue;
      const reference=extractOfferFromObservations(text);
      if(reference) found.push({
        reference,sourceLabel:"OBSERVACIONES ("+col+row+")"
      });
    }
  }
  if (!found.length) return null;
  const distinct=new Set(found.map(x=>x.reference.toUpperCase()));
  return distinct.size===1?found[0]:null;
}
