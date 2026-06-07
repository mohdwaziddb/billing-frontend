const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((part) => part + part).join("")
    : normalized;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${[r, g, b].map((part) => clamp(part).toString(16).padStart(2, "0")).join("")}`;

const mix = (hex: string, target: { r: number; g: number; b: number }, weight: number) => {
  const source = hexToRgb(hex);
  return rgbToHex({
    r: source.r + (target.r - source.r) * weight,
    g: source.g + (target.g - source.g) * weight,
    b: source.b + (target.b - source.b) * weight
  });
};

export const DEFAULT_THEME_COLOR = "#0EA5E9";

export const normalizeHexColor = (value: string) => {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toUpperCase() : DEFAULT_THEME_COLOR;
};

export const applyThemeColor = (themeColor?: string | null) => {
  const color = normalizeHexColor(themeColor ?? DEFAULT_THEME_COLOR);
  const root = document.documentElement;
  const light = mix(color, { r: 255, g: 255, b: 255 }, 0.38);
  const dark = mix(color, { r: 2, g: 6, b: 23 }, 0.42);
  const hover = mix(color, { r: 255, g: 255, b: 255 }, 0.22);
  const border = mix(color, { r: 255, g: 255, b: 255 }, 0.58);
  root.style.setProperty("--theme-color", color);
  root.style.setProperty("--theme-light", light);
  root.style.setProperty("--theme-dark", dark);
  root.style.setProperty("--theme-hover", hover);
  root.style.setProperty("--theme-border", border);
  return { color, light, dark, hover, border };
};
