// node --test tests/line_classification.test.mjs
// Sin CI ni GitHub Actions. Sólo JavaScript puro y datos originales ficticios.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/static/line_classification.js", import.meta.url), "utf8");
const { classifyOriginalLine, classifyLineCollection, foldClassificationText } =
  await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

const line = (description_original, line_kind = "unknown", supplier_reference = null) =>
  ({ description_original, line_kind, supplier_reference });

test("clasificación clara de material y familia técnica por descripción", () => {
  const cases = [
    ["MTS.MANGUERA FLEXIBLE 0,6/1 KV RV-K 5X10 MM ROLLO", "Cables y conductores"],
    ["Placa ciega SIMON 82 blanco", "Mecanismos y tomas"],
    ["Marco SIMON 82 con 3 elementos blanco", "Mecanismos y tomas"],
    ["MAGNETOTERMICO TX3 6kA-C 2P 25A", "Aparamenta y protecciones"],
    ["LUMINARIA DOWNLIGHT LED 12W 4000K", "Iluminación"],
    ["Tubo Aiscan-CR corrugado doble capa diámetro 25 negro", "Canalizaciones y tubos"],
    ["Envolvente modular PrismaSeT XS de superficie", "Envolventes y cajas"],
    ["Borna VIKING3 35mm²", "Bornas y conexiones"],
    ["CINTA AISLANTE PVC 20x19x0,13 MM GRIS", "Fijaciones y consumibles"],
    ["Conector UTP RJ45 M categoría 6", "Telecomunicaciones y datos"],
    ["Pica de tierra cobre 1,5m", "Puesta a tierra"],
  ];
  for (const [description, family] of cases) {
    const value = classifyOriginalLine(line(description));
    assert.equal(value.kind, "material", description);
    assert.equal(value.familyLabel, family, description);
    assert.equal(value.kindLabel, "Material probable", description);
    assert.equal(value.suggested, true);
  }
});

test("no sustituir las clasificaciones almacenadas de RAEE, portes y servicios", () => {
  for (const kind of ["environmental_fee", "freight", "service", "service_candidate"]) {
    const saved = line("Cable RV-K 5x10", kind);
    assert.equal(classifyOriginalLine(saved).kind, kind);
    assert.equal(saved.line_kind, kind);
    assert.equal(classifyOriginalLine(saved).familyLabel, "—");
  }
});

test("conceptos ambiguos quedan pendientes y jamás se convierten en material automáticamente", () => {
  for (const description of [
    "Manipulación de tira led",
    "Instalación de cable RV-K 5X10",
    "Montaje de tubo PVC M20",
    "GASTOS DE TRANSPORTE Cable",
    "Mantenimiento de luminaria LED",
    "CABLE Y TUBO EN EL MISMO KIT",
    "Producto técnico con referencia 22108",
  ]) {
    assert.equal(classifyOriginalLine(line(description)).kind, "pending", description);
  }
});

test("se normalizan las tildes y saltos de línea sólo para reconocimiento", () => {
  assert.equal(foldClassificationText("  Tubo\n corrugado  "), "TUBO CORRUGADO");
  assert.equal(classifyOriginalLine(line("tornillos de fijación")).familyLabel, "Fijaciones y consumibles");
});

test("los precios, descuentos, referencias y descripciones originales nunca se modifican", () => {
  const sample = Object.freeze({
    id: 11726, supplier_reference: "82800-30", description_original: "Placa ciega SIMON 82 blanco",
    quantity: "1", pvp: "10.51", discount_raw: "52", net_unit_price: "5.0448",
    total_price: "5.0448", line_kind: "unknown",
  });
  const before = JSON.stringify(sample);
  const result = classifyOriginalLine(sample);
  assert.equal(result.kind, "material");
  assert.equal(JSON.stringify(sample), before);
  assert.equal(sample.line_kind, "unknown");
});

test("conteo propuesto por clase, sin modificar las líneas", () => {
  assert.deepEqual(classifyLineCollection([
    line("Cable RV-K 5X10"),
    line("Fusible 10A"),
    line("Ajuste de luminaria LED"),
    line("Portes de envío", "freight"),
  ]), { material: 2, pending: 1, freight: 1,
    environmental_fee: 0, service: 0, service_candidate: 0 });
});
