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

export const formatCurrency = (value: number | string | null | undefined) => {
  const amount = typeof value === "number" ? value : Number(value ?? 0);
  return formatter.format(Number.isFinite(amount) ? amount : 0);
};
