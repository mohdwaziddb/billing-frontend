// Theme bootstrap: React load hone se pehle cached theme lagata hai (no flash).
// index.html me inline tha; CSP script-src 'self' inline script block karta hai,
// isliye alag file. <head> me sync load hota hai, behaviour wahi hai.
(function () {
  var key = "billing_frontend_theme_bootstrap";
  var fallback = "#0EA5E9";
  var root = document.documentElement;
  var clamp = function (value) { return Math.max(0, Math.min(255, Math.round(value))); };
  var normalize = function (value) {
    return /^#[0-9a-fA-F]{6}$/.test(String(value || "").trim()) ? String(value).trim().toUpperCase() : fallback;
  };
  var parseTheme = function (value) {
    var parts = String(value || "").toUpperCase().split(",");
    var primary = normalize(parts[0]);
    var accent = parts.length > 1 && /^#[0-9a-fA-F]{6}$/.test(parts[1].trim()) ? parts[1].trim() : null;
    return { primary: primary, accent: accent };
  };
  var gradient = function (from, to) {
    return "linear-gradient(135deg, " + from + " 0%, " + to + " 100%)";
  };
  var hexToRgb = function (hex) {
    var value = hex.replace("#", "");
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  };
  var rgbToHex = function (rgb) {
    return "#" + [rgb.r, rgb.g, rgb.b].map(function (part) {
      return clamp(part).toString(16).padStart(2, "0");
    }).join("");
  };
  var mix = function (hex, target, weight) {
    var source = hexToRgb(hex);
    return rgbToHex({
      r: source.r + (target.r - source.r) * weight,
      g: source.g + (target.g - source.g) * weight,
      b: source.b + (target.b - source.b) * weight
    });
  };
  var luminance = function (rgb) {
    var channels = [rgb.r, rgb.g, rgb.b].map(function (channel) {
      var value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
  };
  var contrast = function (hex) {
    return luminance(hexToRgb(hex)) < 0.48 ? "#FFFFFF" : "#111827";
  };
  try {
    var cached = JSON.parse(localStorage.getItem(key) || "{}");
    var theme = parseTheme(cached.themeColor);
    var color = theme.primary;
    var accent = theme.accent || theme.primary;
    var light = mix(color, { r: 255, g: 255, b: 255 }, 0.38);
    var dark = mix(color, { r: 2, g: 6, b: 23 }, 0.42);
    var hover = mix(color, { r: 255, g: 255, b: 255 }, 0.22);
    var border = mix(color, { r: 255, g: 255, b: 255 }, 0.58);
    root.style.setProperty("--theme-color", color);
    root.style.setProperty("--theme-accent", accent);
    root.style.setProperty("--theme-light", light);
    root.style.setProperty("--theme-dark", dark);
    root.style.setProperty("--theme-hover", hover);
    root.style.setProperty("--theme-border", border);
    root.style.setProperty("--theme-contrast", contrast(color));
    root.style.setProperty("--theme-light-contrast", contrast(light));
    root.style.setProperty("--theme-dark-contrast", contrast(dark));
    root.style.setProperty("--theme-gradient", gradient(color, accent));
    root.style.setProperty("--theme-gradient-hover", gradient(mix(color, { r: 255, g: 255, b: 255 }, 0.22), mix(accent, { r: 255, g: 255, b: 255 }, 0.22)));
    root.style.setProperty("--theme-gradient-deep", gradient(mix(color, { r: 2, g: 6, b: 23 }, 0.16), mix(accent, { r: 2, g: 6, b: 23 }, 0.16)));
    root.style.setProperty("--sidebar-bg", mix(color, { r: 5, g: 9, b: 20 }, 0.62));
    root.style.setProperty("--sidebar-bg-deep", mix(accent, { r: 5, g: 9, b: 20 }, 0.66));
    root.classList.toggle("dark", Boolean(cached.darkModeEnabled));
  } catch (error) {
    root.classList.remove("dark");
  }
})();
