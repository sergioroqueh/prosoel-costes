// Extracción conservadora: solo ofertas mencionadas explícitamente en OBSERVACIONES.
// Conserva códigos literales y permite varias referencias por un mismo pedido.
const OFFER_SIGNAL = /\bOFERTAS?\b/i;
const STOP_WORDS = /\b(?:ENTREGAR|ENTREGA|ENTREGAS|RECOGEN|RECOGER|RECOGEMOS|RECOGIDA|RETIRAN|RETIRARAN|RETIRAR|COMUNICARSE|COMPRA\s+PABLO|REALIZAR\s+SERVICIO|PARA\s+REALIZAR|OBSERVACIONES|AVISAR|AVISASAR|SERVICIO\s+A\s+REALIZARSE)\b/i;
const CODE = /^(?:[A-Z]{1,4}\s*[-/]\s*|[A-Z]{1,4}\s*)?\d{2,}[A-Z]{0,3}\d*(?:\s*[/.-]\s*[A-Z0-9]+)*(?:\s+REV(?:ISI[ÓO]N)?\s*\.?\s*\d{1,3})?/i;

function dropLabels(value) {
  return value.replace(/^(?:\s|[,;:+]|\bY\b|\bN\s*[º°o.]|\bN[ÚU]M(?:ERO)?|\bREF(?:ERENCIA)?|\bDE\s+LA\s+OFERTA)+\s*/i, "").trim();
}

function isValidCode(code) {
  const digits = code.replace(/\D/g, "");
  return code.length <= 45 && (digits.length >= 4 || (/^[A-Z]/i.test(code) && digits.length >= 3));
}

export function extractOffersFromObservation(input) {
  const text = typeof input === "string"
    ? input.replace(/\u00a0/g, " ").replace(/[\t\n\r]+/g, " ").replace(/ {2,}/g, " ").trim()
    : "";
  if (!text) return { references: [], status: "sin_mencion", detail: "" };
  const signal = OFFER_SIGNAL.exec(text);
  if (!signal) return { references: [], status: "sin_mencion", detail: "" };
  if (/\b(?:SIN|NO\s+HAY)\s+OFERTAS?\b/i.test(
    text.slice(Math.max(0, signal.index - 10), signal.index + signal[0].length))) {
    return { references: [], status: "sin_referencia", detail: "Se indica que no hay oferta." };
  }
  let rest = text.slice(signal.index + signal[0].length).trim();
  const stop = STOP_WORDS.exec(rest);
  if (stop) rest = rest.slice(0, stop.index).trim();
  const found = [];
  let rounds = 0;
  while (rest && rounds++ < 12) {
    rest = dropLabels(rest);
    const match = CODE.exec(rest);
    if (!match) break;
    const literal = match[0].replace(/\s*([/-])\s*/g, "$1").replace(/\s+/g, " ").trim();
    if (!isValidCode(literal)) break;
    // Dos códigos largos separados por / son ofertas distintas, a diferencia
    // de las referencias con año/prefijo (O26/846, 28/05/0173/26).
    const references = /^\d{5,}\/\d{5,}$/.test(literal) ? literal.split("/") : [literal];
    for (const ref of references) {
      if (!found.some(x => x.toUpperCase() === ref.toUpperCase())) found.push(ref);
    }
    rest = rest.slice(match[0].length).trim();
    if (!rest || !/^(?:[,;]|\bN\s*[º°o.]|\bY\b|\bN[ÚU]M)/i.test(rest)) break;
  }
  if (found.length) {
    return { references: found, status: "extraido",
      detail: rest.length > 8 ? "Texto adicional a revisar: " + rest.slice(0, 100) : "" };
  }
  return { references: [], status: "mencion_sin_codigo", detail: rest.slice(0, 160) };
}

export function inspectOfferHeader(ws, orderYear) {
  if (Number(orderYear) < 2026) {
    return { references: [], status: "fuera_alcance", sourceCell: null, sourceText: null, detail: "" };
  }
  const sourceText = typeof ws.get(4, "D") === "string" ? ws.get(4, "D") : "";
  return { ...extractOffersFromObservation(sourceText), sourceCell: "D4", sourceText };
}
