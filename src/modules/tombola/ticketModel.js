export const defaultTicketTemplate = {
  name: "Mega Tombola 2026",
  causeText: "Organisée au profit du voyage scolaire des élèves de 4ème",
  titlePrefix: "mega",
  title: "TOMBOLA",
  prizeText: "à gagner : 3 ENTRÉES pour le PAF",
  priceLabel: "2€",
  schoolLogoUrl: "/sainte-foy-logo.jpg",
  partnerLogoUrl: "",
  partnerName: "Disneyland Paris",
  numberingDigits: 4,
  ticketsPerPage: 4,
  canvas: {
    widthCm: 12,
    heightCm: 4.2,
    width: 1200,
    height: 420,
    backgroundColor: "#ffffff",
    objects: [
      {
        id: "cause",
        type: "text",
        text: "Organisée au profit du voyage scolaire des élèves de 4ème",
        x: 80,
        y: 28,
        width: 470,
        fontSize: 21,
        fontStyle: "italic",
        fontVariant: "bold",
        fill: "#050816",
        align: "center",
      },
      {
        id: "title-prefix",
        type: "text",
        text: "mega",
        x: 360,
        y: 96,
        width: 150,
        fontSize: 25,
        fontFamily: "Comic Sans MS, Comic Sans, cursive",
        fill: "#d783ff",
        align: "center",
      },
      {
        id: "title",
        type: "text",
        text: "TOMBOLA",
        x: 255,
        y: 126,
        width: 360,
        fontSize: 58,
        fontFamily: "Arial Black, Arial, sans-serif",
        fontVariant: "bold",
        fill: "#d783ff",
        textEffect: "tombola-glow",
        stroke: "#ffffff",
        strokeWidth: 3,
        shadowColor: "#d783ff",
        shadowBlur: 14,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowOpacity: 0.9,
        align: "center",
      },
      {
        id: "school-logo",
        type: "image",
        src: "/sainte-foy-logo.jpg",
        x: 615,
        y: 72,
        width: 86,
        height: 86,
      },
      {
        id: "prize",
        type: "text",
        text: "à gagner : 3 ENTRÉES pour le PAF",
        x: 218,
        y: 222,
        width: 420,
        fontSize: 22,
        fontStyle: "italic",
        fontVariant: "bold",
        fill: "#050816",
        align: "center",
      },
      {
        id: "partner",
        type: "text",
        text: "Disneyland Paris",
        x: 50,
        y: 300,
        width: 260,
        fontSize: 26,
        fontVariant: "bold",
        fill: "#1261a6",
      },
      {
        id: "divider",
        type: "line",
        x: 660,
        y: 0,
        points: [0, 0, 0, 420],
        stroke: "#111827",
        strokeWidth: 2,
        dash: [8, 8],
      },
      {
        id: "name-label",
        type: "text",
        text: "NOM :",
        x: 710,
        y: 145,
        width: 100,
        fontSize: 20,
        fontVariant: "bold",
        fill: "#050816",
      },
      {
        id: "firstname-label",
        type: "text",
        text: "Prénom :",
        x: 710,
        y: 220,
        width: 130,
        fontSize: 20,
        fontVariant: "bold",
        fill: "#050816",
      },
      {
        id: "phone-label",
        type: "text",
        text: "Téléphone :",
        x: 710,
        y: 295,
        width: 150,
        fontSize: 20,
        fontVariant: "bold",
        fill: "#050816",
      },
      {
        id: "name-line",
        type: "line",
        x: 840,
        y: 164,
        points: [0, 0, 310, 0],
        stroke: "#111827",
        strokeWidth: 1,
        dash: [4, 4],
      },
      {
        id: "firstname-line",
        type: "line",
        x: 840,
        y: 239,
        points: [0, 0, 310, 0],
        stroke: "#111827",
        strokeWidth: 1,
        dash: [4, 4],
      },
      {
        id: "phone-line",
        type: "line",
        x: 840,
        y: 314,
        points: [0, 0, 310, 0],
        stroke: "#111827",
        strokeWidth: 1,
        dash: [4, 4],
      },
      {
        id: "number-left",
        type: "number",
        x: 28,
        y: 385,
        width: 120,
        fontSize: 20,
        fontVariant: "bold",
        fill: "#050816",
      },
      {
        id: "number-right",
        type: "number",
        x: 705,
        y: 382,
        width: 130,
        fontSize: 20,
        fontVariant: "bold",
        fill: "#f01291",
      },
      {
        id: "price",
        type: "text",
        text: "2€",
        x: 1020,
        y: 330,
        width: 120,
        fontSize: 64,
        fontVariant: "bold",
        fill: "#050816",
        align: "right",
      },
    ],
  },
};

export function formatTicketNumber(value, digits = 4) {
  return `N°${String(value).padStart(Number(digits) || 4, "0")}`;
}

export function createTicketNumbers(startNumber, quantity, digits) {
  return Array.from({ length: Number(quantity) || 0 }, (_, index) => {
    const value = Number(startNumber) + index;
    return {
      value,
      label: formatTicketNumber(value, digits),
    };
  });
}

export function normalizeTemplate(template) {
  return {
    ...defaultTicketTemplate,
    ...template,
    numberingDigits: Number(template?.numberingDigits || defaultTicketTemplate.numberingDigits),
    ticketsPerPage: Number(template?.ticketsPerPage || defaultTicketTemplate.ticketsPerPage),
    canvas: {
      ...defaultTicketTemplate.canvas,
      ...(template?.canvas ?? {}),
      widthCm: Number(template?.canvas?.widthCm || defaultTicketTemplate.canvas.widthCm),
      heightCm: Number(template?.canvas?.heightCm || defaultTicketTemplate.canvas.heightCm),
      width: Number(template?.canvas?.width || Math.round((template?.canvas?.widthCm || defaultTicketTemplate.canvas.widthCm) * 100)),
      height: Number(template?.canvas?.height || Math.round((template?.canvas?.heightCm || defaultTicketTemplate.canvas.heightCm) * 100)),
      backgroundColor: template?.canvas?.backgroundColor || defaultTicketTemplate.canvas.backgroundColor,
      objects: template?.canvas?.objects ?? defaultTicketTemplate.canvas.objects,
    },
  };
}

export function syncTemplateFromLegacyFields(template) {
  const currentTemplate = normalizeTemplate(template);
  const fieldMap = {
    cause: currentTemplate.causeText,
    "title-prefix": currentTemplate.titlePrefix,
    title: currentTemplate.title,
    prize: currentTemplate.prizeText,
    partner: currentTemplate.partnerName,
    price: currentTemplate.priceLabel,
    "school-logo": currentTemplate.schoolLogoUrl,
  };

  return {
    ...currentTemplate,
    canvas: {
      ...currentTemplate.canvas,
      objects: currentTemplate.canvas.objects.map((object) => {
        if (!(object.id in fieldMap)) return object;
        if (object.type === "image") return { ...object, src: fieldMap[object.id] };
        return { ...object, text: fieldMap[object.id] };
      }),
    },
  };
}
