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

export const sanitizeHtml = (
  dirty: string | null | undefined,
  options?: { allowStyle?: boolean }
): string => {
  if (!dirty) {
    return "";
  }
  if (!options?.allowStyle) {
    return String(DOMPurify.sanitize(dirty, BASE_CONFIG));
  }
  // First-party invoice HTML only: backend inlines template.css into a
  // <style> block, and stripping it renders raw unstyled invoices. <style>
  // cannot run scripts in modern browsers, and both sinks using this are
  // sandboxed (preview iframe) or print-only. Every other caller (AI output,
  // emails, messages) stays on the strict config.
  const { FORBID_TAGS, ...rest } = BASE_CONFIG as unknown as {
    FORBID_TAGS: string[];
    [key: string]: unknown;
  };
  // WHOLE_DOCUMENT: backend <style> ko <head> me inline karta hai. Iske bina DOMPurify
  // sirf <body> lautata tha, to print/document.write me invoice bina CSS ke chhapta tha.
  return String(
    DOMPurify.sanitize(dirty, {
      ...rest,
      WHOLE_DOCUMENT: true,
      FORBID_TAGS: FORBID_TAGS.filter((tag) => tag !== "style")
    } as unknown as Parameters<typeof DOMPurify.sanitize>[1])
  );
};

/**
 * AI chat table: sirf table + basic text tags. Model ka output prompt-injection
 * se aa sakta hai (customer/product name me chhupi instructions); <img src=...>
 * se data bahar bhejna ya <a> se phishing link dikhana yahan block hai.
 */
export const sanitizeTableHtml = (dirty: string | null | undefined): string => {
  if (!dirty) {
    return "";
  }
  return String(
    DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ["table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "b", "strong", "i", "em", "br", "p"],
      ALLOWED_ATTR: ["colspan", "rowspan"],
      ALLOW_DATA_ATTR: false
    } as unknown as Parameters<typeof DOMPurify.sanitize>[1])
  );
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
