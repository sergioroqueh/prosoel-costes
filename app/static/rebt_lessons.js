// Catálogo editorial piloto: contenido divulgativo con referencias, no sustituye el REBT.
export const REBT_LESSONS = [
  {
    "id": "BT10-01",
    "code": "ITC-BT-10",
    "topic": "Previsión de cargas",
    "title": "Vivienda básica: 5.750 W",
    "summary": "La previsión mínima para electrificación básica es de 5.750 W a 230 V; no equivale a la potencia contratada.",
    "application": "No usar una potencia comercial de 3.450 W para sustituir la previsión de proyecto.",
    "question": "¿Qué potencia mínima se prevé para una vivienda de electrificación básica?",
    "options": [
      "3.450 W",
      "5.750 W",
      "2.300 W"
    ],
    "correct": 1,
    "explanation": "La ITC-BT-10 establece 5.750 W.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT10-02",
    "code": "ITC-BT-10",
    "topic": "Previsión de cargas",
    "title": "Electrificación elevada: 9.200 W",
    "summary": "En electrificación elevada se establece una previsión mínima de 9.200 W a 230 V, sin impedir previsiones superiores.",
    "application": "Distinguir viviendas básicas y elevadas al calcular potencia de edificio.",
    "question": "¿Potencia mínima de previsión en elevada?",
    "options": [
      "9.200 W",
      "5.750 W"
    ],
    "correct": 0,
    "explanation": "El mínimo de electrificación elevada es 9.200 W.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT10-03",
    "code": "ITC-BT-10",
    "topic": "Previsión de cargas",
    "title": "Una vivienda de más de 160 m²",
    "summary": "Una superficie útil superior a 160 m² es uno de los supuestos de electrificación elevada.",
    "application": "Comprobar superficies en el cuadro de previsión de cargas.",
    "question": "¿Una vivienda de 175 m² útiles puede clasificarse como básica sin más comprobaciones?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Por su superficie corresponde electrificación elevada.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT10-04",
    "code": "ITC-BT-10",
    "topic": "Previsión de cargas",
    "title": "Simultaneidad en edificios",
    "summary": "La potencia prevista para el conjunto de viviendas debe atender al procedimiento de simultaneidad de la ITC-BT-10.",
    "application": "Revisar simultaneidad antes de dimensionar la LGA.",
    "question": "¿Se suma necesariamente el 100 % de cada vivienda?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Se aplica el procedimiento de simultaneidad correspondiente.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT14-01",
    "code": "ITC-BT-14",
    "topic": "Instalaciones de enlace",
    "title": "¿Qué alimenta una LGA?",
    "summary": "La línea general de alimentación conecta la CGP con la centralización de contadores en los esquemas de enlace correspondientes.",
    "application": "Medir la LGA separadamente de las derivaciones individuales.",
    "question": "¿La LGA es el tramo hasta cada cuadro de vivienda?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Las derivaciones individuales son un elemento distinto.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT14-02",
    "code": "ITC-BT-14",
    "topic": "Instalaciones de enlace",
    "title": "La caída de tensión de la LGA",
    "summary": "La sección de LGA no se justifica solo por intensidad admisible; también debe cumplir caída de tensión y demás condiciones.",
    "application": "No elegir una sección únicamente porque Iz supera a Ib.",
    "question": "¿Comprobar Iz basta para elegir la sección?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Hay que comprobar también caída de tensión y el resto de requisitos.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT15-01",
    "code": "ITC-BT-15",
    "topic": "Instalaciones de enlace",
    "title": "Derivación individual",
    "summary": "La derivación individual es la parte de la instalación de enlace que suministra a un usuario determinado.",
    "application": "Separar las DI por usuario en mediciones y trazados.",
    "question": "¿La DI corresponde a un suministro individual?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "Se refiere a la alimentación de un usuario concreto.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT04-01",
    "code": "ITC-BT-04",
    "topic": "Legalización",
    "title": "Proyecto o memoria técnica",
    "summary": "La ITC-BT-04 diferencia los supuestos que exigen proyecto y aquellos que requieren memoria técnica de diseño.",
    "application": "No presupuestar proyecto obligatorio sin verificar tipo y características de la instalación.",
    "question": "¿Toda instalación nueva exige proyecto?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Depende de los supuestos de la ITC-BT-04.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT05-01",
    "code": "ITC-BT-05",
    "topic": "Legalización",
    "title": "Verificación e inspección",
    "summary": "Las verificaciones previas y las inspecciones reglamentarias son actuaciones distintas; la inspección por organismo de control se exige en los casos previstos.",
    "application": "Separar en presupuesto pruebas, verificaciones e inspección cuando proceda.",
    "question": "¿Verificación significa siempre inspección por organismo de control?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La ITC-BT-05 diferencia verificaciones e inspecciones.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT18-01",
    "code": "ITC-BT-18",
    "topic": "Protecciones",
    "title": "Puesta a tierra",
    "summary": "La puesta a tierra y los conductores de protección forman parte de las medidas de seguridad de la instalación.",
    "application": "Incluir PE, conexiones y comprobaciones de puesta a tierra.",
    "question": "¿Puede ignorarse la tierra al estudiar protección contra contactos indirectos?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La protección debe evaluarse conjuntamente.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT19-01",
    "code": "ITC-BT-19",
    "topic": "Dimensionado",
    "title": "Sección de un conductor",
    "summary": "La sección depende también del método de instalación, intensidad admisible y caída de tensión.",
    "application": "No usar una tabla de automático a sección sin método de instalación.",
    "question": "¿El mismo automático obliga siempre a la misma sección?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Las condiciones de instalación afectan al dimensionado.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT21-01",
    "code": "ITC-BT-21",
    "topic": "Canalizaciones",
    "title": "Dimensiones del tubo",
    "summary": "Las prescripciones de tubos y canales protectoras dependen de condiciones de montaje y del conjunto de conductores.",
    "application": "Comprobar número de cables y tipo de canalización antes de poner diámetro.",
    "question": "¿El diámetro del tubo depende solo de la sección de un conductor?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Hay que considerar la ocupación y las condiciones de instalación.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT22-01",
    "code": "ITC-BT-22",
    "topic": "Protecciones",
    "title": "Sobreintensidades",
    "summary": "La protección contra sobreintensidades contempla sobrecargas y cortocircuitos.",
    "application": "Coordinar la protección elegida con el conductor y el poder de corte.",
    "question": "¿Se protege únicamente frente a sobrecargas?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "También deben considerarse cortocircuitos.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT24-01",
    "code": "ITC-BT-24",
    "topic": "Protecciones",
    "title": "Protección frente a contactos indirectos",
    "summary": "El diferencial es una medida dentro de un sistema de protección que también depende del esquema y de las condiciones de puesta a tierra.",
    "application": "No dar por validado un cuadro solo por instalar un diferencial.",
    "question": "¿El diferencial evita comprobar el resto de medidas de seguridad?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La seguridad se verifica como conjunto.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT25-01",
    "code": "ITC-BT-25",
    "topic": "Viviendas",
    "title": "Circuito C1",
    "summary": "En viviendas, C1 corresponde al circuito destinado a puntos de iluminación.",
    "application": "Separar el circuito completo de los puntos finales en mediciones.",
    "question": "¿C1 corresponde a iluminación?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "C1 es el circuito de iluminación.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT28-01",
    "code": "ITC-BT-28",
    "topic": "Locales especiales",
    "title": "Locales de pública concurrencia",
    "summary": "La ITC-BT-28 establece exigencias específicas para los locales incluidos en su ámbito.",
    "application": "Revisar clasificación, emergencia y servicios de seguridad antes de valorar.",
    "question": "¿Un local de pública concurrencia se trata siempre igual que una vivienda?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Tiene prescripciones específicas.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT29-01",
    "code": "ITC-BT-29",
    "topic": "Locales especiales",
    "title": "Riesgo de incendio o explosión",
    "summary": "La clasificación del emplazamiento condiciona el tipo de instalación eléctrica y los equipos admisibles.",
    "application": "No valorar mecanismos estándar sin comprobar clasificación del local.",
    "question": "¿Puede elegirse siempre cualquier equipo convencional en zona clasificada?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La instalación debe atender al riesgo y clasificación.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT40-01",
    "code": "ITC-BT-40",
    "topic": "Generación",
    "title": "Instalaciones generadoras",
    "summary": "Las instalaciones generadoras de baja tensión tienen prescripciones específicas.",
    "application": "En fotovoltaica, revisar también esquema y protecciones.",
    "question": "¿Bastan las reglas de circuitos de iluminación para una instalación generadora?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Hay una ITC específica.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT52-01",
    "code": "ITC-BT-52",
    "topic": "Recarga de vehículos",
    "title": "La recarga cambia el diseño",
    "summary": "La ITC-BT-52 contiene prescripciones específicas para infraestructura de recarga de vehículos eléctricos.",
    "application": "Tener en cuenta recarga al prever cargas y canalizaciones.",
    "question": "¿Añadir puntos de recarga requiere revisar el esquema de instalación?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "La infraestructura de recarga exige estudio propio.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT02-01",
    "code": "ITC-BT-02",
    "topic": "Normas de referencia",
    "title": "Ediciones UNE aplicables",
    "summary": "El listado de normas referenciadas por la ITC-BT-02 se actualiza mediante resoluciones; debe revisarse la edición aplicable.",
    "application": "No copiar sin comprobar una referencia UNE de una ficha antigua.",
    "question": "¿La edición de una norma UNE es irrelevante?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Hay ediciones y, en su caso, disposiciones transitorias aplicables.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  }
];
