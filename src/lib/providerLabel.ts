// Provider ka padhne layak naam — Communication setup, Mail/SMS/WhatsApp History sab yahi use karein.
// Backend provider key (GMAIL_SMTP, AWS_SES, MSG91 ...) ya company ka diya hua naam bhejta hai.

const PROVIDER_LABELS: Record<string, string> = {
  GMAIL_SMTP: "Gmail SMTP",
  AWS_SES: "Amazon SES",
  SENDGRID: "SendGrid",
  SMTP: "SMTP",
  MSG91: "MSG91",
  NSTECH: "NSTech",
  PINNACLE: "Pinnacle"
};

// Purani history rows me provider ki jagah channel ka naam save hota tha — wo asli provider nahi.
const LEGACY_CHANNEL_VALUES = new Set(["EMAIL", "SMS", "WHATSAPP"]);

export const providerLabel = (value?: string | null) => {
  const raw = (value ?? "").trim();
  if (!raw) {
    return "Not configured";
  }
  const key = raw.toUpperCase();
  if (LEGACY_CHANNEL_VALUES.has(key)) {
    return "Not recorded";
  }
  return PROVIDER_LABELS[key] ?? raw;
};
