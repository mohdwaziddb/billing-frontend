export type DiscountType = "FIXED" | "PERCENT";

export type InvoiceCalculationRowInput = {
  id?: string;
  productId?: string;
  qty?: string | number;
  rate?: string | number;
  taxPercent?: string | number;
  taxType?: string | null;
  taxable?: boolean;
  taxName?: string | null;
  hsnCode?: string | null;
  productDiscountType?: DiscountType;
  productDiscountValue?: string | number;
};

export type InvoiceCalculationInput = {
  rows: InvoiceCalculationRowInput[];
  sameState?: boolean;
  invoiceDiscountType?: DiscountType;
  invoiceDiscountValue?: string | number;
  paidAmount?: string | number;
};

export type InvoiceCalculationRow = {
  id?: string;
  productId?: string;
  qty: number;
  rate: number;
  lineTotal: number;
  productDiscount: number;
  afterProductDiscount: number;
  invoiceDiscountShare: number;
  taxPercent: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  taxAmount: number;
  totalAmount: number;
};

export type InvoiceCalculationResult = {
  rows: InvoiceCalculationRow[];
  subtotal: number;
  productDiscountTotal: number;
  afterProductDiscountSubtotal: number;
  totalBeforeInvoiceDiscount: number;
  invoiceDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
};

const numberValue = (value: string | number | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

// Saara hisaab integer paise (aur rate 1/100 % units) me, taaki backend ke
// BigDecimal HALF_UP se exact match ho. Float round2 me 2.385 -> 2.38 ho jaata
// tha (backend 2.39), aur "fully paid" bill 2 paise PARTIAL save hota tha.
const toCents = (value: string | number | undefined) => {
  const amount = Math.max(0, numberValue(value));
  const text = String(amount);
  // "26.505e2" decimal string se exact 2650.5 deta hai; amount * 100 float drift karta.
  return text.includes("e") ? Math.round(amount * 100) : Math.round(Number(`${text}e2`));
};

const fromCents = (cents: number) => cents / 100;

/** (numerator / denominator) HALF_UP, dono non-negative integers. */
const divideHalfUp = (numerator: number, denominator: number) => {
  const quotient = Math.floor(numerator / denominator);
  return (numerator - quotient * denominator) * 2 >= denominator ? quotient + 1 : quotient;
};

/** base paise par percent (1/100 % units) — backend percentageAmount jaisa. */
const percentOfCents = (baseCents: number, percentHundredths: number) => divideHalfUp(baseCents * percentHundredths, 10000);

const discountCents = (baseCents: number, type: DiscountType | undefined, value: string | number | undefined) => {
  const safeBase = Math.max(0, baseCents);
  if ((type ?? "FIXED") === "PERCENT") {
    return Math.min(safeBase, percentOfCents(safeBase, toCents(value)));
  }
  return Math.min(safeBase, toCents(value));
};

/**
 * Largest-remainder split, backend splitInvoiceDiscount jaisa: raw share 10
 * decimal (rupee) par HALF_UP, phir paise me floor, bache paise sabse bade
 * fraction wali lines ko (barabar par pehli line). BigInt overflow se bachata hai.
 */
const splitInvoiceDiscountCents = (lineCents: number[], discount: number, subtotal: number) => {
  if (subtotal <= 0 || discount <= 0) {
    return lineCents.map(() => 0);
  }
  const scale = 100000000n; // 1e-10 rupee = 1e-8 paisa
  const denominator = BigInt(subtotal);
  const raw = lineCents.map((cents) => {
    const numerator = BigInt(discount) * BigInt(cents) * scale;
    const quotient = numerator / denominator;
    return (numerator - quotient * denominator) * 2n >= denominator ? quotient + 1n : quotient;
  });
  const shares = raw.map((value) => Number(value / scale));
  let remainder = discount - shares.reduce((sum, share) => sum + share, 0);
  const order = raw
    .map((value, index) => ({ index, fraction: value % scale }))
    .sort((left, right) => (right.fraction > left.fraction ? 1 : right.fraction < left.fraction ? -1 : 0));
  for (const { index } of order) {
    if (remainder <= 0) {
      break;
    }
    shares[index] += 1;
    remainder -= 1;
  }
  return shares;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export const InvoiceCalculationService = {
  calculate(input: InvoiceCalculationInput): InvoiceCalculationResult {
    const sameState = Boolean(input.sameState);
    const baseRows = input.rows.map((row) => {
      const qty = Math.max(0, numberValue(row.qty));
      // Backend unit price aur tax rate ko pehle 2 decimal par HALF_UP karta hai.
      const rateCents = toCents(row.rate);
      const taxHundredths = toCents(row.taxPercent);
      const taxable = row.taxable ?? true;
      const lineCents = Math.round(rateCents * qty);
      const productDiscountCents = discountCents(lineCents, row.productDiscountType, row.productDiscountValue);
      return {
        row,
        qty,
        rateCents,
        taxHundredths,
        taxable,
        taxType: (row.taxType ?? "GST").toUpperCase(),
        lineCents,
        productDiscountCents,
        afterProductDiscountCents: lineCents - productDiscountCents
      };
    });

    const subtotalCents = sum(baseRows.map((row) => row.lineCents));
    const productDiscountCentsTotal = sum(baseRows.map((row) => row.productDiscountCents));
    const afterProductDiscountCents = sum(baseRows.map((row) => row.afterProductDiscountCents));
    const invoiceDiscountCents = discountCents(afterProductDiscountCents, input.invoiceDiscountType, input.invoiceDiscountValue);
    const invoiceDiscountShares = splitInvoiceDiscountCents(
      baseRows.map((row) => row.afterProductDiscountCents),
      invoiceDiscountCents,
      afterProductDiscountCents
    );

    const centsRows = baseRows.map((row, rowIndex) => {
      const shareCents = invoiceDiscountShares[rowIndex] ?? 0;
      const taxableCents = Math.max(0, row.afterProductDiscountCents - shareCents);
      const rate = row.taxable ? row.taxHundredths : 0;
      const treatAsGst = row.taxType === "GST";
      const splitGst = rate > 0 && treatAsGst && sameState;
      const igstHundredths = rate > 0 && !splitGst ? rate : 0;
      // Display rate half karke rounded (0.25% -> 0.13%), par AMOUNT full rate / 200 se.
      const halfRateHundredths = splitGst ? divideHalfUp(rate, 2) : 0;
      const halfCents = splitGst ? divideHalfUp(taxableCents * rate, 20000) : 0;
      const igstCents = igstHundredths > 0 ? percentOfCents(taxableCents, igstHundredths) : 0;
      const taxCents = halfCents * 2 + igstCents;
      return { ...row, shareCents, taxableCents, halfRateHundredths, halfCents, igstHundredths, igstCents, taxCents, totalCents: taxableCents + taxCents };
    });

    const rows: InvoiceCalculationRow[] = centsRows.map((row) => ({
      id: row.row.id,
      productId: row.row.productId,
      qty: row.qty,
      rate: fromCents(row.rateCents),
      lineTotal: fromCents(row.lineCents),
      productDiscount: fromCents(row.productDiscountCents),
      afterProductDiscount: fromCents(row.afterProductDiscountCents),
      invoiceDiscountShare: fromCents(row.shareCents),
      taxPercent: fromCents(row.taxHundredths),
      taxableAmount: fromCents(row.taxableCents),
      cgstRate: fromCents(row.halfRateHundredths),
      cgstAmount: fromCents(row.halfCents),
      sgstRate: fromCents(row.halfRateHundredths),
      sgstAmount: fromCents(row.halfCents),
      igstRate: fromCents(row.igstHundredths),
      igstAmount: fromCents(row.igstCents),
      taxAmount: fromCents(row.taxCents),
      totalAmount: fromCents(row.totalCents)
    }));

    const grandTotalCents = sum(centsRows.map((row) => row.totalCents));
    const paidCents = Math.min(toCents(input.paidAmount), grandTotalCents);
    const subtotal = fromCents(subtotalCents);
    const productDiscountTotal = fromCents(productDiscountCentsTotal);
    const afterProductDiscountSubtotal = fromCents(afterProductDiscountCents);
    const totalBeforeInvoiceDiscount = afterProductDiscountSubtotal;
    const invoiceDiscount = fromCents(invoiceDiscountCents);
    const taxableAmount = fromCents(sum(centsRows.map((row) => row.taxableCents)));
    const cgstTotal = fromCents(sum(centsRows.map((row) => row.halfCents)));
    const sgstTotal = cgstTotal;
    const igstTotal = fromCents(sum(centsRows.map((row) => row.igstCents)));
    const taxAmount = fromCents(sum(centsRows.map((row) => row.taxCents)));
    const grandTotal = fromCents(grandTotalCents);
    const paidAmount = fromCents(paidCents);
    const outstandingAmount = fromCents(grandTotalCents - paidCents);

    return {
      rows,
      subtotal,
      productDiscountTotal,
      afterProductDiscountSubtotal,
      totalBeforeInvoiceDiscount,
      invoiceDiscount,
      taxableAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      taxAmount,
      grandTotal,
      paidAmount,
      outstandingAmount
    };
  }
};
