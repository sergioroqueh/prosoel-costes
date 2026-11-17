// Catálogo editorial PROSOEL · REBT. Resúmenes divulgativos, no sustituyen la normativa.
// Fuente primaria: RD 842/2002 consolidado en BOE; se indica ITC, aplicación y fecha de revisión.
// El contenido estático es público; el progreso privado pertenece a la cuenta Sergio (RLS).
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
  },
  {
    "id": "BT01-01",
    "code": "ITC-BT-01",
    "topic": "Terminología",
    "title": "La diferencia entre masa y conductor activo",
    "summary": "La masa es una parte conductora accesible de un equipo que normalmente no está en tensión, pero podría quedar en tensión por un fallo de aislamiento.",
    "application": "Al revisar un cuadro metálico, comprobar la conexión de protección de sus masas.",
    "question": "¿Una carcasa metálica accesible puede considerarse masa?",
    "options": [
      "Sí, si encaja en la definición",
      "No, solo el conductor de fase"
    ],
    "correct": 0,
    "explanation": "La protección de masas es esencial frente a contactos indirectos.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT02-02",
    "code": "ITC-BT-02",
    "topic": "Normas de referencia",
    "title": "Una norma UNE y el REBT no son lo mismo",
    "summary": "El REBT y sus ITC son disposiciones reglamentarias; las normas técnicas referenciadas se deben manejar conforme a su incorporación y edición aplicable.",
    "application": "Justificar especificaciones citando la instrucción y la norma técnica aplicable por separado.",
    "question": "¿Es correcto asumir que toda norma UNE es automáticamente una ITC?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Una norma técnica y una instrucción reglamentaria son documentos distintos.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT03-01",
    "code": "ITC-BT-03",
    "topic": "Empresa instaladora",
    "title": "Categorías de empresas instaladoras",
    "summary": "La ITC-BT-03 distingue la habilitación y categorías de empresas instaladoras de baja tensión; el alcance de los trabajos debe corresponder a las competencias habilitadas.",
    "application": "Comprobar la habilitación requerida antes de valorar una instalación especial.",
    "question": "¿Cualquier empresa sin habilitación puede certificar una instalación BT?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La ejecución y certificación están vinculadas a los requisitos aplicables a la empresa instaladora.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT03-02",
    "code": "ITC-BT-03",
    "topic": "Empresa instaladora",
    "title": "El certificado no sustituye la documentación técnica",
    "summary": "La actuación de la empresa instaladora incluye documentación y verificaciones, pero el tipo de expediente exigido depende de la instalación.",
    "application": "Separar en presupuesto proyecto o MTD, instalación, certificado e inspección cuando corresponda.",
    "question": "¿El certificado de instalación sustituye siempre al proyecto exigible?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Cada documento tiene una función distinta dentro de la tramitación.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT04-02",
    "code": "ITC-BT-04",
    "topic": "Legalización",
    "title": "Reformas y ampliaciones también pueden requerir expediente",
    "summary": "La necesidad de documentación no se limita a instalaciones completamente nuevas; determinadas modificaciones y ampliaciones también deben tramitarse.",
    "application": "Preguntar si la obra modifica potencia, uso o condiciones de seguridad de la instalación existente.",
    "question": "¿Una reforma siempre queda exenta de documentación por no ser obra nueva?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Deben examinarse los supuestos de modificación o ampliación.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT04-03",
    "code": "ITC-BT-04",
    "topic": "Legalización",
    "title": "Proyecto: comprobar el tipo de instalación",
    "summary": "La decisión proyecto frente a memoria técnica depende de los grupos y criterios de la ITC-BT-04; no basta con conocer la superficie de un local.",
    "application": "Crear una comprobación de legalización antes de dar precio cerrado.",
    "question": "¿Basta con saber los metros cuadrados para decidir proyecto o MTD?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La clasificación reglamentaria y la potencia son factores relevantes.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT05-02",
    "code": "ITC-BT-05",
    "topic": "Legalización",
    "title": "Inspección inicial cuando proceda",
    "summary": "Hay instalaciones sometidas a inspección inicial por organismo de control antes de su puesta en servicio; no es un requisito universal para todo circuito doméstico.",
    "application": "Preguntar por uso y clasificación del local antes de añadir OCA.",
    "question": "¿Todas las instalaciones interiores requieren inspección inicial por OCA?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La ITC-BT-05 establece supuestos concretos.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT05-03",
    "code": "ITC-BT-05",
    "topic": "Legalización",
    "title": "Inspecciones periódicas",
    "summary": "Determinadas instalaciones están sujetas a inspecciones periódicas; la obligación y periodicidad dependen de su tipo y características.",
    "application": "Al valorar mantenimiento, distinguir revisión voluntaria de inspección reglamentaria.",
    "question": "¿La inspección periódica se exige idénticamente en cualquier local?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La ITC-BT-05 distingue distintos supuestos.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT06-01",
    "code": "ITC-BT-06",
    "topic": "Redes de distribución",
    "title": "Aérea de distribución frente a instalación interior",
    "summary": "La ITC-BT-06 se ocupa de redes aéreas de distribución en baja tensión; no debe aplicarse como tabla universal a instalaciones interiores de edificio.",
    "application": "No presupuestar cableado de fachada o red pública con criterios de circuito de vivienda sin revisar su ámbito.",
    "question": "¿La ITC-BT-06 está dedicada a redes aéreas de distribución?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "Es una instrucción de redes de distribución, con ámbito propio.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT07-01",
    "code": "ITC-BT-07",
    "topic": "Redes de distribución",
    "title": "Redes subterráneas de distribución",
    "summary": "La ITC-BT-07 contiene prescripciones para redes subterráneas de distribución de energía eléctrica, diferentes de las instalaciones receptoras.",
    "application": "Asegurar qué tramo pertenece a distribuidora y cuál al edificio.",
    "question": "¿Una red subterránea de distribución se estudia exclusivamente con la ITC-BT-25?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Las redes de distribución tienen sus propias ITC.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT08-01",
    "code": "ITC-BT-08",
    "topic": "Redes de distribución",
    "title": "Esquema del neutro en distribución",
    "summary": "Los sistemas de conexión del neutro y de las masas influyen en las medidas de protección que se pueden emplear.",
    "application": "Confirmar esquema de suministro al justificar protección de contactos indirectos.",
    "question": "¿Puede elegirse la protección ignorando el esquema de conexión a tierra?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "El esquema determina condiciones de seguridad y desconexión.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT09-01",
    "code": "ITC-BT-09",
    "topic": "Alumbrado exterior",
    "title": "Alumbrado exterior: instalación especial",
    "summary": "La ITC-BT-09 contiene prescripciones para instalaciones de alumbrado exterior.",
    "application": "En urbanizaciones y viales, separar el estudio del alumbrado exterior de los circuitos interiores.",
    "question": "¿El alumbrado de un vial exterior se trata siempre como C1 de vivienda?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "El alumbrado exterior tiene prescripciones específicas.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT10-05",
    "code": "ITC-BT-10",
    "topic": "Previsión de cargas",
    "title": "Servicios generales del edificio",
    "summary": "La previsión de cargas de un edificio debe incorporar los servicios generales que correspondan, además de las viviendas.",
    "application": "Revisar ascensores, bombas, alumbrado común y otros servicios antes de cerrar la potencia LGA.",
    "question": "¿La LGA de un edificio de viviendas depende únicamente de las viviendas?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "También se consideran servicios generales y otras cargas aplicables.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT10-06",
    "code": "ITC-BT-10",
    "topic": "Previsión de cargas",
    "title": "Locales comerciales en un edificio residencial",
    "summary": "La previsión para un edificio mixto no se obtiene solo con los coeficientes de simultaneidad de las viviendas; hay que incorporar los locales según ITC-BT-10.",
    "application": "Reservar un apartado de locales en el cuadro de previsión de cargas.",
    "question": "¿Puedes omitir un local de la previsión porque aún no tenga actividad definida?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Debe contemplarse la previsión correspondiente a los locales.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT10-07",
    "code": "ITC-BT-10",
    "topic": "Previsión de cargas",
    "title": "Garajes: distinguir sistemas y usos",
    "summary": "Los garajes también intervienen en la previsión de cargas del edificio y requieren verificar sus condiciones de instalación.",
    "application": "Antes de calcular LGA, separar las cargas de garaje y ventilación de las de viviendas.",
    "question": "¿El garaje puede afectar a la potencia prevista del edificio?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "Su carga debe considerarse cuando forma parte de la instalación.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT11-01",
    "code": "ITC-BT-11",
    "topic": "Instalaciones de enlace",
    "title": "Acometida no significa LGA",
    "summary": "La acometida alimenta la instalación de enlace desde la red de distribución, mientras la LGA conecta elementos propios del enlace según su esquema.",
    "application": "Distinguir en presupuesto responsabilidades y límites de propiedad de cada tramo.",
    "question": "¿Es correcto llamar LGA a toda la línea desde la red pública?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La acometida y la LGA tienen funciones distintas.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT12-01",
    "code": "ITC-BT-12",
    "topic": "Instalaciones de enlace",
    "title": "No todos los esquemas de enlace son iguales",
    "summary": "La ITC-BT-12 recoge esquemas de instalaciones de enlace según el número de usuarios y la configuración del suministro.",
    "application": "Elegir el esquema antes de medir CGP, contadores y derivaciones.",
    "question": "¿Sirve el mismo esquema de enlace para cualquier número de usuarios?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Existen esquemas distintos y deben elegirse según el suministro.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT13-01",
    "code": "ITC-BT-13",
    "topic": "Instalaciones de enlace",
    "title": "Función de la CGP",
    "summary": "La caja general de protección contiene los elementos de protección de la línea general de alimentación en la configuración que proceda.",
    "application": "Identificar CGP y fusibles antes de valorar el conjunto del enlace.",
    "question": "¿La función de la CGP es proteger la LGA?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "Esa es una función fundamental en el esquema de enlace.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT13-02",
    "code": "ITC-BT-13",
    "topic": "Instalaciones de enlace",
    "title": "CGP: emplazamiento y accesibilidad",
    "summary": "La ubicación de la CGP debe atender a las prescripciones reglamentarias y a las condiciones de la empresa distribuidora cuando proceda.",
    "application": "No presupuestar una CGP sin revisar el emplazamiento previsto en planos.",
    "question": "¿La CGP puede colocarse en cualquier punto oculto sin condiciones?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Su ubicación debe cumplir criterios de instalación y acceso.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT14-03",
    "code": "ITC-BT-14",
    "topic": "Instalaciones de enlace",
    "title": "LGA: método de instalación",
    "summary": "La sección y el tipo de canalización de la LGA dependen también de su recorrido y modo de instalación.",
    "application": "En bandeja sobre falso techo, estudiar el entorno y sistema antes de seleccionar cable y protección.",
    "question": "¿La sección de LGA se decide sin conocer su recorrido?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "El recorrido afecta, entre otros factores, a caída de tensión y montaje.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT14-04",
    "code": "ITC-BT-14",
    "topic": "Instalaciones de enlace",
    "title": "LGA y reacción al fuego",
    "summary": "La LGA tiene prescripciones de comportamiento frente al incendio y características de los cables empleados.",
    "application": "No sustituir una referencia de cable LGA por otra sin comprobar características exigibles.",
    "question": "¿Basta con que el cable de LGA tenga la sección correcta?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "También se exigen características de los cables y de la instalación.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT15-02",
    "code": "ITC-BT-15",
    "topic": "Instalaciones de enlace",
    "title": "DI: calcular la longitud real",
    "summary": "La longitud de la derivación individual interviene en la caída de tensión; la protección y el sistema de instalación condicionan su dimensionado.",
    "application": "Medir el trazado real desde la centralización hasta cada vivienda o local.",
    "question": "¿La DI de un usuario depende de su recorrido y condiciones de instalación?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "La longitud y el montaje afectan al dimensionado.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT15-03",
    "code": "ITC-BT-15",
    "topic": "Instalaciones de enlace",
    "title": "Identificar circuitos de DI y tierras",
    "summary": "La derivación individual debe atender las prescripciones de conductores, aislamiento, instalación y conductor de protección.",
    "application": "Comprobar que la medición incluye los conductores necesarios del sistema.",
    "question": "¿Puedes valorar una DI solo con conductores de fase y sin revisar protección?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La composición del circuito debe justificarse para su esquema.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT16-01",
    "code": "ITC-BT-16",
    "topic": "Instalaciones de enlace",
    "title": "Contadores: ubicación reglamentaria",
    "summary": "La ITC-BT-16 regula la ubicación y los sistemas de instalación de contadores.",
    "application": "Comprobar cuarto, armario o agrupación de contadores según el esquema y normativa aplicable.",
    "question": "¿La centralización de contadores tiene prescripciones de ubicación?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "La ITC-BT-16 establece condiciones específicas.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT17-01",
    "code": "ITC-BT-17",
    "topic": "Cuadros y protecciones",
    "title": "Cuadro general: mando y protección",
    "summary": "La ITC-BT-17 regula los dispositivos generales e individuales de mando y protección y su disposición en las instalaciones de enlace.",
    "application": "Separar IGA, interruptores diferenciales y protecciones de circuitos al presupuestar cuadros.",
    "question": "¿Un IGA y un diferencial cumplen exactamente la misma función?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Protegen frente a riesgos distintos y deben coordinarse.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT17-02",
    "code": "ITC-BT-17",
    "topic": "Cuadros y protecciones",
    "title": "Poder de corte de las protecciones",
    "summary": "Los dispositivos de protección deben elegirse conforme a las características del punto donde se instalan, incluida la corriente de cortocircuito prevista.",
    "application": "No fijar todos los magnetotérmicos a 6 kA sin comprobar la red y las condiciones de protección.",
    "question": "¿El poder de corte se decide solo por el calibre nominal?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Depende también de la corriente de cortocircuito prevista y coordinación.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT18-02",
    "code": "ITC-BT-18",
    "topic": "Puesta a tierra",
    "title": "Medir la resistencia de tierra",
    "summary": "El diseño y la verificación de puesta a tierra requieren comprobar las condiciones necesarias para la protección de las personas.",
    "application": "Incluir las comprobaciones de tierra cuando se estime la puesta en servicio.",
    "question": "¿Es suficiente instalar una pica sin comprobar el sistema de tierras?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La eficacia del sistema debe verificarse.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT18-03",
    "code": "ITC-BT-18",
    "topic": "Puesta a tierra",
    "title": "Equipotencialidad",
    "summary": "Las conexiones equipotenciales buscan reducir diferencias de potencial peligrosas entre partes conductoras que pueden estar al alcance.",
    "application": "Revisar uniones y conexión de elementos metálicos en locales especiales.",
    "question": "¿La equipotencialidad se limita a conectar una única toma de corriente?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Afecta a la conexión de masas y elementos conductores que correspondan.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT19-02",
    "code": "ITC-BT-19",
    "topic": "Dimensionado",
    "title": "El PE tiene reglas propias de sección",
    "summary": "La sección del conductor de protección no puede elegirse arbitrariamente, sino conforme a los criterios aplicables de la ITC-BT-19.",
    "application": "Cuando cambie la sección de fase, revisar también la de PE.",
    "question": "¿El conductor de protección siempre puede ser de 1,5 mm²?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La sección de PE se determina conforme a reglas específicas.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT19-03",
    "code": "ITC-BT-19",
    "topic": "Dimensionado",
    "title": "Identificación de conductores",
    "summary": "La identificación de conductores facilita reconocer neutro, protección y fases de acuerdo con las prescripciones de instalación.",
    "application": "Comprobar colores y marcado antes de unificar materiales de conductor.",
    "question": "¿Da igual la identificación del conductor de protección?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La identificación forma parte de la seguridad y trazabilidad de la instalación.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT20-01",
    "code": "ITC-BT-20",
    "topic": "Canalizaciones",
    "title": "Sistemas de instalación y protección mecánica",
    "summary": "La ITC-BT-20 aborda distintos sistemas de instalación de cables y sus condiciones de uso.",
    "application": "Comparar tubo empotrado, canal y bandeja sin considerarlos siempre equivalentes.",
    "question": "¿Una canalización permitida para un montaje sirve sin comprobar cualquier otro?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Las condiciones del sistema instalado importan.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT20-02",
    "code": "ITC-BT-20",
    "topic": "Canalizaciones",
    "title": "Influencias externas",
    "summary": "La temperatura, humedad, exposición y otras influencias externas pueden condicionar la selección de canalizaciones y conductores.",
    "application": "Evitar aplicar una solución de interior seco directamente a una zona húmeda.",
    "question": "¿Importa el ambiente al elegir la canalización?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "El entorno modifica las condiciones de instalación.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT21-02",
    "code": "ITC-BT-21",
    "topic": "Canalizaciones",
    "title": "Tubo empotrado y tubo superficial",
    "summary": "Los tubos y canales protectoras tienen requisitos de características y montaje que varían según su colocación.",
    "application": "No intercambiar referencias de tubo sin comprobar resistencia y montaje.",
    "question": "¿Son automáticamente equivalentes tubos empotrados y de superficie?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Deben verificarse las características exigidas a cada instalación.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT21-03",
    "code": "ITC-BT-21",
    "topic": "Canalizaciones",
    "title": "Ocupación real de canalizaciones",
    "summary": "Para dimensionar tubos debe considerarse el número y características de los conductores que discurren por ellos.",
    "application": "No elegir diámetro solo por el cable de mayor sección en una conducción múltiple.",
    "question": "¿El número de conductores afecta a la elección del tubo?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "Las prescripciones de ocupación de la canalización lo tienen en cuenta.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT22-02",
    "code": "ITC-BT-22",
    "topic": "Protecciones",
    "title": "Coordinación del automático con el cable",
    "summary": "La protección frente a sobreintensidades no consiste solo en elegir un amperaje comercial; debe coordinarse con los conductores.",
    "application": "En la revisión del unifilar comprobar Ib, In, Iz y el cortocircuito.",
    "question": "¿Que Ib sea inferior a In basta por sí solo para validar la protección?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "También debe protegerse al conductor según criterios aplicables.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT23-01",
    "code": "ITC-BT-23",
    "topic": "Protecciones",
    "title": "Sobretensiones no son sobrecargas",
    "summary": "La protección contra sobretensiones tiene un objeto distinto de los magnetotérmicos contra sobreintensidades.",
    "application": "Separar SPD de las protecciones magnetotérmicas en el presupuesto.",
    "question": "¿Un magnetotérmico es por sí mismo un protector de sobretensiones?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Las funciones de protección son diferentes.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT23-02",
    "code": "ITC-BT-23",
    "topic": "Protecciones",
    "title": "Sobretensiones: estudiar la exposición",
    "summary": "La selección de medidas contra sobretensiones requiere valorar condiciones y características de la instalación.",
    "application": "Antes de escoger T2 o combinaciones, revisar el proyecto y condiciones de riesgo.",
    "question": "¿Debe elegirse el SPD sin estudiar la instalación?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La protección depende de la situación y de la coordinación.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT24-02",
    "code": "ITC-BT-24",
    "topic": "Protecciones",
    "title": "Contactos directos e indirectos",
    "summary": "Un contacto directo se produce con partes activas; un indirecto, con masas que accidentalmente quedan en tensión.",
    "application": "No confundir medidas de barrera o aislamiento con dispositivos para desconexión por defecto.",
    "question": "¿Tocar una carcasa energizada por fallo de aislamiento es contacto indirecto?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "Corresponde al contacto con una masa accidentalmente en tensión.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT24-03",
    "code": "ITC-BT-24",
    "topic": "Protecciones",
    "title": "Interruptores diferenciales: sensibilidad y criterio",
    "summary": "La protección diferencial debe analizarse según el tipo de instalación y la medida de protección prevista.",
    "application": "No cambiar automáticamente 300 mA por 30 mA sin conocer el circuito y su función.",
    "question": "¿Todos los circuitos, sin distinción, se resuelven siempre con el mismo diferencial?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La coordinación y el contexto normativo condicionan la protección.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT25-02",
    "code": "ITC-BT-25",
    "topic": "Viviendas",
    "title": "C2: tomas de uso general",
    "summary": "La ITC-BT-25 identifica C2 como circuito de tomas de corriente de uso general y frigorífico en la configuración básica.",
    "application": "Medir C2 separado del C1 de iluminación.",
    "question": "¿C2 corresponde a iluminación general?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "C2 está destinado a tomas de uso general y frigorífico.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT25-03",
    "code": "ITC-BT-25",
    "topic": "Viviendas",
    "title": "C3: cocina y horno",
    "summary": "En la electrificación básica, C3 es el circuito destinado a cocina y horno.",
    "application": "Presupuestar el circuito específico y no incorporarlo en tomas generales.",
    "question": "¿C3 corresponde a cocina y horno?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "Es un circuito previsto para estos receptores.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT25-04",
    "code": "ITC-BT-25",
    "topic": "Viviendas",
    "title": "C4: lavadora, lavavajillas y termo",
    "summary": "C4 contempla la alimentación de lavadora, lavavajillas y termo eléctrico según la configuración reglamentaria aplicable.",
    "application": "Identificar estos usos en el plano antes de cerrar circuitos.",
    "question": "¿C4 es el circuito de iluminación?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Se vincula a esos electrodomésticos y equipos.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT25-05",
    "code": "ITC-BT-25",
    "topic": "Viviendas",
    "title": "C5: baños y tomas auxiliares de cocina",
    "summary": "C5 sirve tomas de corriente de cuartos de baño y bases auxiliares del cuarto de cocina.",
    "application": "Distinguir bases auxiliares de cocina del circuito de cocina y horno.",
    "question": "¿C5 se relaciona con tomas de baños y auxiliares de cocina?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "La ITC-BT-25 separa estos circuitos por usos.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT25-06",
    "code": "ITC-BT-25",
    "topic": "Viviendas",
    "title": "Los circuitos adicionales se justifican",
    "summary": "Según grado de electrificación y necesidades de la vivienda, pueden ser precisos circuitos adicionales a los básicos.",
    "application": "Revisar climatización, calefacción y automatización en vivienda elevada.",
    "question": "¿Los cinco circuitos básicos sirven necesariamente para cualquier vivienda?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Los usos y la electrificación pueden exigir circuitos adicionales.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT26-01",
    "code": "ITC-BT-26",
    "topic": "Viviendas",
    "title": "Conductor de protección en viviendas",
    "summary": "La instalación interior de viviendas tiene prescripciones de canalización y conductores, incluido el conductor de protección.",
    "application": "Incluir PE en la medición y no olvidar conexiones a las bases con tierra.",
    "question": "¿La instalación interior puede omitir el conductor de protección sin estudio?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Debe respetarse la configuración reglamentaria de protección.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT26-02",
    "code": "ITC-BT-26",
    "topic": "Viviendas",
    "title": "Identificación y conexiones interiores",
    "summary": "Las conexiones entre conductores en las instalaciones interiores de viviendas deben realizarse mediante dispositivos y disposiciones adecuados.",
    "application": "Medir cajas de conexiones y mecanismos apropiados, no empalmes improvisados.",
    "question": "¿Es indiferente cómo se ejecutan las conexiones en vivienda?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La ITC-BT-26 establece prescripciones de ejecución.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT27-01",
    "code": "ITC-BT-27",
    "topic": "Viviendas",
    "title": "Baños: volúmenes de protección",
    "summary": "En los locales con bañera o ducha existen volúmenes con condiciones distintas sobre equipos y mecanismos admisibles.",
    "application": "Antes de medir un enchufe en baño, comprobar su ubicación respecto a ducha o bañera.",
    "question": "¿Puede colocarse cualquier mecanismo en cualquier punto del baño?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La admisibilidad depende de los volúmenes y equipos.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT27-02",
    "code": "ITC-BT-27",
    "topic": "Viviendas",
    "title": "Grado de protección en zonas húmedas",
    "summary": "La elección de materiales eléctricos en baños exige relacionar ubicación, volúmenes y protección necesaria.",
    "application": "No elegir IP solo por estética o precio en una ducha.",
    "question": "¿Basta con mirar el fabricante sin identificar el volumen?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La ubicación condiciona los requisitos del equipo.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT28-02",
    "code": "ITC-BT-28",
    "topic": "Pública concurrencia",
    "title": "Alumbrado de emergencia",
    "summary": "Los locales de pública concurrencia deben analizar sus requisitos de alumbrado de emergencia y seguridad, según las condiciones exigibles.",
    "application": "Incluir luminarias y pruebas de emergencia cuando corresponda.",
    "question": "¿El alumbrado normal sustituye siempre al de emergencia?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Tienen finalidades y condiciones de servicio diferentes.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT28-03",
    "code": "ITC-BT-28",
    "topic": "Pública concurrencia",
    "title": "Clasificación previa del local",
    "summary": "La clasificación reglamentaria depende de actividad, características y supuestos de la ITC-BT-28.",
    "application": "No dar por hecho que cualquier oficina pequeña está automáticamente incluida o excluida.",
    "question": "¿Se puede decidir la clasificación únicamente por el nombre comercial del local?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Se deben revisar los criterios reglamentarios aplicables.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT30-01",
    "code": "ITC-BT-30",
    "topic": "Locales especiales",
    "title": "Locales húmedos y mojados",
    "summary": "Los locales húmedos y mojados tienen condiciones especiales que influyen en la instalación y sus equipos.",
    "application": "No presupuestar una zona de lavado como si fuera un despacho seco.",
    "question": "¿La humedad del local influye en la solución eléctrica?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "La ITC-BT-30 distingue ambientes y prescripciones.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT31-01",
    "code": "ITC-BT-31",
    "topic": "Instalaciones especiales",
    "title": "Piscinas: condiciones particulares",
    "summary": "En piscinas y fuentes existen zonas y riesgos específicos que condicionan materiales y medios de protección.",
    "application": "En una piscina, identificar volúmenes y equipos permitidos antes de valorar.",
    "question": "¿Se dimensiona la instalación de piscina igual que un dormitorio?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La ITC-BT-31 establece requisitos específicos.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT32-01",
    "code": "ITC-BT-32",
    "topic": "Instalaciones especiales",
    "title": "Ascensores y elevación",
    "summary": "Los equipos de elevación y transporte tienen prescripciones particulares de instalación eléctrica.",
    "application": "Revisar circuitos de fuerza, maniobra y seguridad del equipo de elevación.",
    "question": "¿Una máquina de elevación debe revisarse también conforme a su ITC especial?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "La ITC-BT-32 trata este tipo de instalaciones.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT33-01",
    "code": "ITC-BT-33",
    "topic": "Instalaciones especiales",
    "title": "Instalaciones provisionales de obra",
    "summary": "Las instalaciones temporales para obras requieren medidas adaptadas a las condiciones del emplazamiento.",
    "application": "No emplear sin revisión soluciones de cuadros permanentes de oficina en obra.",
    "question": "¿Ser provisional elimina los requisitos de seguridad eléctrica?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La ITC-BT-33 impone prescripciones particulares.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT34-01",
    "code": "ITC-BT-34",
    "topic": "Instalaciones especiales",
    "title": "Ferias y stands",
    "summary": "Las instalaciones temporales de ferias y stands cuentan con prescripciones propias.",
    "application": "Comprobar montaje, protecciones y desconexión para cada stand.",
    "question": "¿Una instalación para feria está exenta por ser temporal?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La temporalidad no elimina exigencias; hay ITC propia.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT35-01",
    "code": "ITC-BT-35",
    "topic": "Instalaciones especiales",
    "title": "Instalaciones agrícolas",
    "summary": "En instalaciones agrícolas y hortícolas pueden concurrir condiciones de humedad, corrosión o deterioro que condicionan los materiales.",
    "application": "No elegir una caja de mecanismos sin estudiar el ambiente de un invernadero.",
    "question": "¿Un invernadero puede requerir soluciones distintas a una oficina?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "La ITC-BT-35 atiende a sus condiciones particulares.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT36-01",
    "code": "ITC-BT-36",
    "topic": "Instalaciones especiales",
    "title": "Muy baja tensión",
    "summary": "Las instalaciones a muy baja tensión se estudian según su naturaleza y medidas de protección específicas.",
    "application": "Distinguir circuitos de control de MBT de alimentación de potencia.",
    "question": "¿La etiqueta '12 V' basta para asumir que cualquier circuito es seguro?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Deben comprobarse las condiciones del sistema y su protección.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT38-01",
    "code": "ITC-BT-38",
    "topic": "Instalaciones especiales",
    "title": "Quirófanos y salas de intervención",
    "summary": "Los quirófanos tienen exigencias particulares de suministro y seguridad eléctrica.",
    "application": "Identificar si el área de intervención entra en el ámbito de la ITC-BT-38 antes de presupuestar.",
    "question": "¿Un quirófano se resuelve con un cuadro estándar de oficina?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Tiene requisitos particulares.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT40-02",
    "code": "ITC-BT-40",
    "topic": "Generación",
    "title": "Autoconsumo y conexión",
    "summary": "Las instalaciones generadoras requieren analizar las condiciones de conexión y la reglamentación específica aplicable.",
    "application": "No presupuestar FV solo con módulos e inversor; incluir esquemas y protecciones.",
    "question": "¿La modalidad de conexión afecta al diseño de la instalación?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "El diseño depende del esquema y normas aplicables.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT43-01",
    "code": "ITC-BT-43",
    "topic": "Receptores",
    "title": "Instalación de receptores",
    "summary": "La ITC-BT-43 incluye prescripciones generales de instalación de receptores eléctricos.",
    "application": "Revisar las condiciones del receptor real antes de valorar línea y protección.",
    "question": "¿El cable puede dimensionarse sin conocer los datos del receptor?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "Las características del equipo son determinantes.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT44-01",
    "code": "ITC-BT-44",
    "topic": "Receptores",
    "title": "Luminarias y sus alimentaciones",
    "summary": "Los receptores para alumbrado deben atender a prescripciones específicas de instalación y a sus características.",
    "application": "Comprobar tensión, control y método de montaje de luminarias antes de ofertar.",
    "question": "¿La potencia luminosa es la única característica importante al instalar una luminaria?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "También influyen la instalación, alimentación y seguridad.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT47-01",
    "code": "ITC-BT-47",
    "topic": "Receptores",
    "title": "Motores: arranque y protección",
    "summary": "Los motores pueden requerir condiciones específicas para su alimentación, arranque y protección.",
    "application": "Presupuestar protecciones de motor según características del equipo y método de arranque.",
    "question": "¿Se puede escoger la protección de un motor solo por su potencia nominal?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "El arranque y el régimen del motor también influyen.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT48-01",
    "code": "ITC-BT-48",
    "topic": "Receptores",
    "title": "Transformadores y autotransformadores",
    "summary": "Transformadores, reactancias, rectificadores y condensadores tienen prescripciones propias de instalación.",
    "application": "Comprobar protecciones y características reales de equipos auxiliares.",
    "question": "¿Todos estos receptores se valoran con las reglas de una toma de corriente doméstica?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "La ITC-BT-48 trata sus particularidades.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT49-01",
    "code": "ITC-BT-49",
    "topic": "Receptores",
    "title": "Instalaciones en muebles",
    "summary": "La instalación eléctrica incorporada a muebles tiene prescripciones particulares.",
    "application": "Revisar mobiliario técnico con mecanismos integrados antes de ofertar.",
    "question": "¿Un enchufe integrado en un mueble puede requerir prescripciones particulares?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "La ITC-BT-49 se ocupa de estas instalaciones.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT50-01",
    "code": "ITC-BT-50",
    "topic": "Receptores",
    "title": "Saunas y altas temperaturas",
    "summary": "Los locales que contienen radiadores para saunas presentan condiciones particulares por el entorno y equipos.",
    "application": "No aplicar sin más una canalización de oficina a la zona de sauna.",
    "question": "¿La temperatura ambiental afecta a la elección de materiales?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "Las condiciones particulares condicionan materiales y emplazamiento.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT51-01",
    "code": "ITC-BT-51",
    "topic": "Automatización",
    "title": "Sistemas de automatización en edificios",
    "summary": "La ITC-BT-51 recoge sistemas de automatización, gestión técnica de energía y seguridad en viviendas y edificios.",
    "application": "Identificar alimentación y cableado de control en presupuesto domótico.",
    "question": "¿Una instalación domótica exige revisar sus propios circuitos y características?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 0,
    "explanation": "La ITC-BT-51 trata estas instalaciones.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT52-02",
    "code": "ITC-BT-52",
    "topic": "Recarga de vehículos",
    "title": "Esquema de recarga y protecciones",
    "summary": "La ITC-BT-52 distingue esquemas de instalación para infraestructura de recarga y prescribe medidas de protección.",
    "application": "Antes de valorar cargadores, comprobar el esquema, centralización y protecciones.",
    "question": "¿Dos puntos de recarga con el mismo cargador siempre tienen idéntica instalación?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "El esquema y el entorno condicionan la instalación.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  },
  {
    "id": "BT52-03",
    "code": "ITC-BT-52",
    "topic": "Recarga de vehículos",
    "title": "Preinstalación y reserva de canalizaciones",
    "summary": "La infraestructura de recarga puede exigir previsión de canalizaciones y condiciones de instalación vinculadas al tipo de edificio.",
    "application": "Consultar exigencias de preinstalación en obra nueva o intervención sobre aparcamiento.",
    "question": "¿Solo se estudia la ITC-BT-52 cuando se instala físicamente un cargador?",
    "options": [
      "Sí",
      "No"
    ],
    "correct": 1,
    "explanation": "También hay previsiones y esquemas de infraestructura.",
    "source": "REBT consolidado (BOE)",
    "sourceUrl": "https://www.boe.es/buscar/act.php?id=BOE-A-2002-18099",
    "reviewedOn": "2026-11-17"
  }
];
