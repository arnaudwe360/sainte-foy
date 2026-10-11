export const textFontOptions = [
  { label: "Sans moderne", value: "Inter, Arial, sans-serif" },
  { label: "Arial Black", value: "Arial Black, Arial, sans-serif" },
  { label: "Impact", value: "Impact, Haettenschweiler, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Trebuchet", value: "Trebuchet MS, Arial, sans-serif" },
  { label: "Comic doux", value: "Comic Sans MS, Comic Sans, cursive" },
  { label: "Brush Script", value: "Brush Script MT, cursive" },
  { label: "Courier", value: "Courier New, monospace" },
];

export const textEffectOptions = [
  { label: "Aucun", value: "none" },
  { label: "Ombre douce", value: "soft-shadow" },
  { label: "Contour blanc", value: "white-outline" },
  { label: "Néon tombola", value: "tombola-glow" },
  { label: "Tampon", value: "stamp" },
];

export const textEffectPresets = {
  none: {
    stroke: "",
    strokeWidth: 0,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: 0,
  },
  "soft-shadow": {
    stroke: "",
    strokeWidth: 0,
    shadowColor: "#111827",
    shadowBlur: 8,
    shadowOffsetX: 2,
    shadowOffsetY: 3,
    shadowOpacity: 0.22,
  },
  "white-outline": {
    stroke: "#ffffff",
    strokeWidth: 3,
    shadowColor: "#7c3aed",
    shadowBlur: 7,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: 0.34,
  },
  "tombola-glow": {
    fill: "#d783ff",
    stroke: "#ffffff",
    strokeWidth: 3,
    shadowColor: "#d783ff",
    shadowBlur: 14,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowOpacity: 0.9,
  },
  stamp: {
    stroke: "#050816",
    strokeWidth: 1,
    shadowColor: "#111827",
    shadowBlur: 0,
    shadowOffsetX: 1,
    shadowOffsetY: 1,
    shadowOpacity: 0.28,
  },
};

export function createTextEffectPatch(effectName) {
  return {
    textEffect: effectName,
    ...(textEffectPresets[effectName] || textEffectPresets.none),
  };
}

export function getTextRenderProps(object) {
  const shadowBlur = Number(object.shadowBlur || 0);
  const hasManualHalo = shadowBlur > 0 && Boolean(object.shadowColor);
  const shadowOpacity = hasManualHalo && Number(object.shadowOpacity || 0) <= 0 ? 0.85 : Number(object.shadowOpacity || 0);

  return {
    fill: object.fill || "#111827",
    fontFamily: object.fontFamily || textFontOptions[0].value,
    shadowBlur,
    shadowColor: object.shadowColor || undefined,
    shadowOffsetX: Number(object.shadowOffsetX || 0),
    shadowOffsetY: Number(object.shadowOffsetY || 0),
    shadowOpacity,
    stroke: object.stroke || undefined,
    strokeWidth: Number(object.strokeWidth || 0),
  };
}

export function getTextPrintStyle(object, scale) {
  const rawShadowBlur = Number(object.shadowBlur || 0);
  const hasManualHalo = rawShadowBlur > 0 && Boolean(object.shadowColor);
  const shadowOpacity = hasManualHalo && Number(object.shadowOpacity || 0) <= 0 ? 0.85 : Number(object.shadowOpacity || 0);
  const shadowColor = object.shadowColor || "transparent";
  const shadowBlur = rawShadowBlur * scale * 0.28;
  const shadowOffsetX = Number(object.shadowOffsetX || 0) * scale * 0.28;
  const shadowOffsetY = Number(object.shadowOffsetY || 0) * scale * 0.28;
  const strokeWidth = Number(object.strokeWidth || 0) * scale * 0.22;

  return {
    fontFamily: object.fontFamily || textFontOptions[0].value,
    stroke: object.stroke && strokeWidth ? `${strokeWidth}mm ${object.stroke}` : "",
    textShadow:
      shadowOpacity > 0
        ? `${shadowOffsetX}mm ${shadowOffsetY}mm ${shadowBlur}mm color-mix(in srgb, ${shadowColor} ${Math.round(shadowOpacity * 100)}%, transparent)`
        : "",
  };
}
