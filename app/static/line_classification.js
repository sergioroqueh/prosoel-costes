// Clasificador derivado para la interfaz, v1. No modifica el pedido ni su line_kind.
// Solo se propone "Material" cuando hay vocabulario técnico inequívoco.
// Las clasificaciones importadas de portes/RAEE/servicios siempre tienen prioridad.
const LINE_LABELS = Object.freeze({
  material: "Material",
  environmental_fee: "RAEE / ecotasa",
  freight: "Portes / transporte",
  service: "Servicio",
  service_candidate: "Posible servicio",
});

const FAMILIES = [
  ["Puesta a tierra", [
    /\b(?:PICA DE TIERRA|TOMA DE TIERRA|RED EQUIPOTENCIAL|ELECTRODO DE TIERRA|CABLE DE TIERRA|BORNE DE TIERRA|ARQUETA DE TIERRA|SOLDADURA ALUMINOTERMICA)\b/,
  ]],
  ["Aparamenta y protecciones", [
    /\b(?:MAGNETOTERMIC[OA]|DIFERENCIAL|AUTOMATICO MCCB|INTERRUPTOR AUTOMATICO|FUSIBLE|SECCIONADOR|CONTACTOR|GUARDAMOTOR|SOBRETENSION(?:ES)?|PROTECTOR (?:DE )?SOBRETENSION(?:ES)?|REPARTIDOR MODULAR|RELE (?:TERMICO|DE CONTROL|DE PROTECCION))\b/,
  ]],
  ["Envolventes y cajas", [
    /\b(?:ENVOLVENTE|ARMARIO ELECTRICO|CUADRO ELECTRICO|COFRET|PRISMASET|CAJA (?:GENERAL DE PROTECCION|DE PROTECCION|DE DISTRIBUCION|ESTANCA|ALUMBRADO|DE MECANISMOS?|DE REGISTRO|DE EMPALMES|DERIVACION)|CAJA DE PROTECCION Y MEDIDA)\b/,
  ]],
  ["Telecomunicaciones y datos", [
    /\b(?:RJ[\s-]*45|ROSETA DE DATOS|VIDEOPORTERO|VIDEO PORTERO|PORTERO ELECTRONICO|ANTENA (?:TV|SAT)|REPARTIDOR (?:TV|SAT)|SWITCH (?:ETHERNET|DE RED)|PUNTO DE ACCESO|FIBRA OPTICA|MODULO SFP)\b/,
  ]],
  ["Cables y conductores", [
    /\b(?:CABLE|MANGUERA|HILO FLEXIBLE|HILO (?:ELECTRICO|LSFH|LIBRE)|CONDUCTOR(?:ES)? (?:ELECTRICO|DE COBRE|DE ALUMINIO)|RZ1[\s-]*K|RV[\s-]*K|H07Z1[\s-]*K|H07V[\s-]*K|UTP CAT|FTP CAT|COAXIAL)\b/,
  ]],
  ["Iluminación", [
    /\b(?:LUMINARIA|DOWNLIGHT|PROYECTOR LED|PANEL LED|TIRA LED|BOMBILLA|LAMPARA|APLIQUE|FOCO LED|DRIVER LED|BALIZA LED|PANTALLA ESTANCA|PLAFON|EMERGENCIA LED|BLOQUE AUTONOMO DE EMERGENCIA)\b/,
  ]],
  ["Mecanismos y tomas", [
    /\b(?:PLACA CIEGA|PLACA SIMON|TECLA(?: DOBLE)?|CONMUTADOR|PULSADOR|BASE DE (?:CORRIENTE|ENCHUFE)|TOMA DE (?:CORRIENTE|ENCHUFE)|MECANISMO(?:S)?|ENCHUFE|INTERRUPTOR DE PERSIANA|MARCO (?:DE )?EMPOTRAR|MARCO (?:DE )?[1-9] (?:ELEMENTOS?|MODULOS?))\b/,
  ]],
  ["Canalizaciones y tubos", [
    /\b(?:TUBO(?:S)?|TUBERIA|BANDEJA(?:S)?(?: PORTACABLES)?|CANALETA(?:S)?|CANALIZACION(?:ES)?|TUBODIX|RACOR|MANGUITO (?:DE )?(?:PVC|TUBO|UNION)|CURVA AISCAN)\b/,
  ]],
  ["Bornas y conexiones", [
    /\b(?:BORNA(?:S)?|REGLETA(?:S)?|CONECTOR(?:ES)?|PUNTERA(?:S)?|TERMINAL(?:ES)? (?:DE )?(?:COBRE|COMPRESION|PREAISLAD)|REPARTIDOR (?:DE )?(?:CONEXIONES|4P)|CONECTOR WAGO|CLEMA(?:S)?)\b/,
  ]],
  ["Fijaciones y consumibles", [
    /\b(?:TORNILLO(?:S)?|TACO(?:S)? (?:NYLON|METALICO|DE FIJACION)|ABRAZADERA(?:S)?|BRIDA(?:S)?|ANCLAJE(?:S)?|TUERCA(?:S)?|ARANDELA(?:S)?|GRAPA(?:S)?|CINTA AISLANTE|CINTA DE DOBLE CARA|SILICONA|CARTUCHO DE SELLADO)\b/,
  ]],
];

const POSSIBLE_SERVICE =
  /\b(?:MANO DE OBRA|DESPLAZAMIENTO|MONTAJE|DESMONTAJE|INSTALACION|REPARACION|MANTENIMIENTO|REVISION|CERTIFICACION|CONFIGURACION|PROGRAMACION|ALQUILER|TRABAJOS? DE|PUESTA EN MARCHA|EJECUCION DE OBRA|SERVICIO (?:DE|TECNICO))\b/;

const POSSIBLE_FEE =
  /\b(?:RAEE|ECOTASA|CANON AMBIENTAL|TASA MEDIOAMBIENTAL|PORTES?|GASTOS DE ENVIO|COSTE DE TRANSPORTE)\b/;

export function foldClassificationText(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

export function classifyOriginalLine(line) {
  const originalKind = line?.line_kind || "unknown";
  const description = foldClassificationText(line?.description_original);
  const reference = foldClassificationText(line?.supplier_reference);
  const registered = LINE_LABELS[originalKind];

  // Respetar la clasificación original explícita. No inferir familias para portes
  // ni servicios aunque su texto contenga "cable", "tubo" u otra palabra técnica.
  if (registered && originalKind !== "material") {
    return {
      kind: originalKind,
      kindLabel: registered,
      familyLabel: "—",
      confidence: originalKind === "service_candidate" ? "revisar" : "registrada",
      reason: "Clasificación registrada en el pedido",
      suggested: false,
    };
  }

  if (!description) {
    return { kind: "pending", kindLabel: "Pendiente de revisión",
      familyLabel: "—", confidence: "revisar",
      reason: "Sin descripción suficiente", suggested: true };
  }

  // El vocabulario de servicio/tasa en una línea no clasificada obliga a revisión.
  // No marcar como material un suministro que podría incluir una prestación.
  if (POSSIBLE_SERVICE.test(description) || POSSIBLE_FEE.test(description) ||
      ["PORTES", "RAEE", "ECOTASA", "SERVICIO"].includes(reference)) {
    return { kind: "pending", kindLabel: "Pendiente de revisión",
      familyLabel: "—", confidence: "revisar",
      reason: "Posible servicio, porte o ecotasa: comprobación necesaria", suggested: true };
  }

  const matches = FAMILIES.filter(([, patterns]) =>
    patterns.some((pattern) => pattern.test(description))).map(([name]) => name);
  if (matches.length === 1) {
    return {
      kind: "material", kindLabel: originalKind === "material" ? "Material" : "Material probable",
      familyLabel: matches[0],
      confidence: originalKind === "material" ? "registrada" : "alta",
      reason: originalKind === "material"
        ? "Tipo de línea registrado; familia sugerida por descripción"
        : "Propuesta automática por descripción técnica; pendiente de confirmación",
      suggested: originalKind !== "material",
    };
  }

  // Dos familias diferentes o descripción demasiado genérica: no decidir.
  return {
    kind: "pending", kindLabel: "Pendiente de revisión",
    familyLabel: "—", confidence: "revisar",
    reason: matches.length > 1 ? "Coincidencia con varias familias técnicas" :
      "La descripción no permite una clasificación segura",
    suggested: true,
  };
}

export function classifyLineCollection(lines) {
  const summary = { material: 0, pending: 0, freight: 0, environmental_fee: 0, service: 0, service_candidate: 0 };
  for (const line of lines) {
    const type = classifyOriginalLine(line);
    summary[type.kind] = (summary[type.kind] || 0) + 1;
  }
  return summary;
}
