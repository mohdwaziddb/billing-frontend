const DEFAULT_CURRENCY = "INR";
const DEFAULT_LOCALE = "en-IN";

const currencyConfig = {
  code: DEFAULT_CURRENCY,
  locale: DEFAULT_LOCALE
};

const formatter = new Intl.NumberFormat(currencyConfig.locale, {
  style: "currency",
  currency: currencyConfig.code,
  maximumFractionDigits: 2
});

const amountFormatter = new Intl.NumberFormat(currencyConfig.locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const normalizeAmount = (value: number | string | null | undefined) => {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

export const formatCurrency = (value: number | string | null | undefined) => {
  return formatter.format(normalizeAmount(value));
};

const trimDecimals = (amount: number) => {
  const rounded = Math.round(amount * 100) / 100;
  return String(rounded).replace(/\.0+$/, "").replace(/(\.\d)0$/, "$1");
};

export const formatCompactCurrency = (value: number | string | null | undefined) => {
  const amount = normalizeAmount(value);
  const absolute = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (absolute >= 9.95e6) {
    return `${sign}₹${trimDecimals(absolute / 1e7)}Cr`;
  }
  if (absolute >= 1e6) {
    return `${sign}₹${trimDecimals(absolute / 1e5)}L`;
  }
  return formatCurrency(amount);
};

/**
 * Chart axis / chhote labels ke liye Indian short form: ₹950, ₹12K, ₹1.25L, ₹2.4Cr.
 * (formatCompactCurrency 10L se neeche poora "₹1,00,000.00" deta hai — axis par kat jata tha.)
 */
export const formatShortCurrency = (value: number | string | null | undefined) => {
  const amount = normalizeAmount(value);
  const absolute = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (absolute >= 1e7) {
    return `${sign}₹${trimDecimals(Math.round((absolute / 1e7) * 100) / 100)}Cr`;
  }
  if (absolute >= 1e5) {
    return `${sign}₹${trimDecimals(Math.round((absolute / 1e5) * 100) / 100)}L`;
  }
  if (absolute >= 1e3) {
    return `${sign}₹${trimDecimals(Math.round((absolute / 1e3) * 10) / 10)}K`;
  }
  return `${sign}₹${trimDecimals(absolute)}`;
};

export const formatAmount = (value: number | string | null | undefined) => {
  return amountFormatter.format(normalizeAmount(value));
};
