import DOMPurify from "dompurify";

/**
 * Central HTML sanitizer for all dangerouslySetInnerHTML / iframe srcDoc /
 * document.write sinks. DOMPurify strips <script>, event handlers
 * (onerror=, onclick=), javascript: URLs and other active content while
 * keeping safe formatting tags used by email/invoice templates.
 */
const BASE_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "oninput"],
  ALLOW_DATA_ATTR: false
} as unknown as Parameters<typeof DOMPurify.sanitize>[1];

export const sanitizeHtml = (dirty: string | null | undefined): string => {
  if (!dirty) {
    return "";
  }
  return String(DOMPurify.sanitize(dirty, BASE_CONFIG));
};

/**
 * Only allow http/https links from window.prompt() style inputs.
 * Returns null for javascript:, data:, vbscript:, file: etc.
 */
export const sanitizeLinkUrl = (raw: string | null | undefined): string | null => {
  if (!raw) {
    return null;
  }
  const value = raw.trim();
  if (!value) {
    return null;
  }
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
};
