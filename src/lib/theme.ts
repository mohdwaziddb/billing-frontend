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

const getRelativeLuminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
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

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_THEME_COLOR = "#0EA5E9";

export const normalizeHexColor = (value: string) => {
  const trimmed = value.trim();
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed.toUpperCase() : DEFAULT_THEME_COLOR;
};

export const isHexColor = (value: string) => HEX_COLOR_PATTERN.test(value.trim());

export type ThemeValue = {
  primary: string;
  accent: string | null;
};

// Theme value formats (single source of truth for storage, the bootstrap
// cache, the settings picker, and live preview):
//   "#RRGGBB"            solid theme
//   "#RRGGBB,#RRGGBB"    gradient theme (primary -> accent)
export const parseThemeValue = (value?: string | null): ThemeValue => {
  if (!value) {
    return { primary: DEFAULT_THEME_COLOR, accent: null };
  }
  const [primaryPart, accentPart] = value.toUpperCase().split(",");
  const primary = HEX_COLOR_PATTERN.test((primaryPart ?? "").trim()) ? primaryPart.trim() : DEFAULT_THEME_COLOR;
  const accent = accentPart !== undefined && HEX_COLOR_PATTERN.test(accentPart.trim()) ? accentPart.trim() : null;
  return { primary, accent };
};

export const normalizeThemeValue = (value?: string | null) => {
  const { primary, accent } = parseThemeValue(value);
  return accent ? `${primary},${accent}` : primary;
};

const buildGradient = (primary: string, accent: string) =>
  `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`;

export const themeSwatchBackground = (value?: string | null) => {
  const { primary, accent } = parseThemeValue(value);
  return accent ? buildGradient(primary, accent) : primary;
};

export const getContrastTextColor = (backgroundColor: string) => {
  const color = normalizeHexColor(backgroundColor);
  return getRelativeLuminance(hexToRgb(color)) < 0.48 ? "#FFFFFF" : "#111827";
};

export const applyThemeColor = (themeColor?: string | null) => {
  const { primary: color, accent } = parseThemeValue(themeColor);
  const root = document.documentElement;
  const light = mix(color, { r: 255, g: 255, b: 255 }, 0.38);
  const dark = mix(color, { r: 2, g: 6, b: 23 }, 0.42);
  const hover = mix(color, { r: 255, g: 255, b: 255 }, 0.22);
  const border = mix(color, { r: 255, g: 255, b: 255 }, 0.58);
  const contrast = getContrastTextColor(color);
  const lightContrast = getContrastTextColor(light);
  const darkContrast = getContrastTextColor(dark);
  // Accent falls back to the primary color, so a solid theme simply gets a
  // single-color gradient and every gradient consumer stays identical.
  const gradientTo = accent ?? color;
  const gradient = buildGradient(color, gradientTo);
  const gradientHover = buildGradient(
    mix(color, { r: 255, g: 255, b: 255 }, 0.22),
    mix(gradientTo, { r: 255, g: 255, b: 255 }, 0.22)
  );
  // Sidebar uses a rich dark blend: primary on top, accent at the bottom in
  // gradient mode (solid mode gets the same color in two depths).
  const sidebarBgTop = mix(color, { r: 5, g: 9, b: 20 }, 0.62);
  const sidebarBgDeep = mix(gradientTo, { r: 5, g: 9, b: 20 }, 0.66);
  // 1px border layer for gradient surfaces: same gradient in a darker shade.
  const gradientDeep = buildGradient(
    mix(color, { r: 2, g: 6, b: 23 }, 0.16),
    mix(gradientTo, { r: 2, g: 6, b: 23 }, 0.16)
  );
  root.style.setProperty("--theme-color", color);
  root.style.setProperty("--theme-accent", gradientTo);
  root.style.setProperty("--theme-light", light);
  root.style.setProperty("--theme-dark", dark);
  root.style.setProperty("--theme-hover", hover);
  root.style.setProperty("--theme-border", border);
  root.style.setProperty("--theme-contrast", contrast);
  root.style.setProperty("--theme-light-contrast", lightContrast);
  root.style.setProperty("--theme-dark-contrast", darkContrast);
  root.style.setProperty("--theme-gradient", gradient);
  root.style.setProperty("--theme-gradient-hover", gradientHover);
  root.style.setProperty("--theme-gradient-deep", gradientDeep);
  root.style.setProperty("--sidebar-bg", sidebarBgTop);
  root.style.setProperty("--sidebar-bg-deep", sidebarBgDeep);
  return {
    color,
    accent: gradientTo,
    light,
    dark,
    hover,
    border,
    contrast,
    lightContrast,
    darkContrast,
    gradient,
    gradientHover,
    sidebarBgTop,
    sidebarBgDeep,
    hasGradient: accent !== null
  };
};

/**
 * Shared gradient surface style for primary-action buttons everywhere:
 * gradient fill + matching darker 1px border (fill/border split via
 * background-clip) so the border looks correct on every gradient theme.
 */
export const gradientSurfaceClass =
  "border border-transparent bg-[image:var(--theme-gradient),var(--theme-gradient-deep)] bg-origin-border [background-clip:padding-box,border-box] text-[var(--theme-contrast)] hover:bg-[image:var(--theme-gradient-hover),var(--theme-gradient-deep)]";

export const SOLID_THEME_PRESETS = [
  { label: "Blue", value: "#0EA5E9" },
  { label: "Green", value: "#10B981" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Orange", value: "#F97316" },
  { label: "Red", value: "#EF4444" },
  { label: "Teal", value: "#14B8A6" },
  { label: "Indigo", value: "#6366F1" }
];

export const GRADIENT_THEME_PRESETS = [
  { label: "Sunset", value: "#F97316,#EC4899" },
  { label: "Ocean", value: "#0EA5E9,#14B8A6" },
  { label: "Aurora", value: "#22C55E,#0EA5E9" },
  { label: "Purple Dream", value: "#8B5CF6,#EC4899" },
  { label: "Ember", value: "#EF4444,#F59E0B" },
  { label: "Lagoon", value: "#06B6D4,#3B82F6" }
];
