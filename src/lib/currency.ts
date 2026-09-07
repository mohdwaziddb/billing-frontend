const DEFAULT_CURRENCY = "INR";
const DEFAULT_LOCALE = "en-IN";

export const currencyConfig = {
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

export const formatAmount = (value: number | string | null | undefined) => {
  return amountFormatter.format(normalizeAmount(value));
};
