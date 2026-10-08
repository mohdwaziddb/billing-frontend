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

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const discountAmount = (base: number, type: DiscountType | undefined, value: string | number | undefined) => {
  const safeBase = Math.max(0, round2(base));
  const amount = Math.max(0, numberValue(value));
  if ((type ?? "FIXED") === "PERCENT") {
    return round2(Math.min(safeBase, safeBase * amount / 100));
  }
  return round2(Math.min(safeBase, amount));
};

export const InvoiceCalculationService = {
  calculate(input: InvoiceCalculationInput): InvoiceCalculationResult {
    const sameState = Boolean(input.sameState);
    const baseRows = input.rows.map((row) => {
      const qty = Math.max(0, numberValue(row.qty));
      const rate = Math.max(0, numberValue(row.rate));
      const taxPercent = Math.max(0, numberValue(row.taxPercent));
      const taxable = row.taxable ?? true;
      const lineTotal = round2(qty * rate);
      const productDiscount = discountAmount(lineTotal, row.productDiscountType, row.productDiscountValue);
      const afterProductDiscount = round2(lineTotal - productDiscount);
      return {
        id: row.id,
        productId: row.productId,
        qty,
        rate,
        lineTotal,
        productDiscount,
        afterProductDiscount,
        invoiceDiscountShare: 0,
        taxableAmount: 0,
        taxPercent,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: 0,
        igstAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        taxable,
        taxType: row.taxType
      };
    });

    const subtotal = round2(baseRows.reduce((sum, row) => sum + row.lineTotal, 0));
    const productDiscountTotal = round2(baseRows.reduce((sum, row) => sum + row.productDiscount, 0));
    const afterProductDiscountSubtotal = round2(baseRows.reduce((sum, row) => sum + row.afterProductDiscount, 0));
    const totalBeforeInvoiceDiscount = afterProductDiscountSubtotal;
    const invoiceDiscount = discountAmount(afterProductDiscountSubtotal, input.invoiceDiscountType, input.invoiceDiscountValue);

    // Largest-remainder split: per-row rounded shares must add up EXACTLY to
    // invoiceDiscount (naive per-row round2 drifts paise across rows).
    const rawShares = baseRows.map((row) =>
      afterProductDiscountSubtotal > 0 ? invoiceDiscount * (row.afterProductDiscount / afterProductDiscountSubtotal) : 0
    );
    const flooredShares = rawShares.map((share) => Math.floor((share + Number.EPSILON) * 100) / 100);
    let shareRemainderPaise = Math.round((invoiceDiscount - flooredShares.reduce((sum, share) => sum + share, 0)) * 100);
    const fractionOrder = rawShares
      .map((share, index) => ({ index, fraction: share * 100 - Math.floor((share + Number.EPSILON) * 100) }))
      .sort((a, b) => b.fraction - a.fraction);
    const invoiceDiscountShares = [...flooredShares];
    for (const { index } of fractionOrder) {
      if (shareRemainderPaise <= 0) {
        break;
      }
      invoiceDiscountShares[index] = round2(invoiceDiscountShares[index] + 0.01);
      shareRemainderPaise -= 1;
    }

    const rows = baseRows.map((row, rowIndex) => {
      const invoiceDiscountShare = invoiceDiscountShares[rowIndex] ?? 0;
      const taxableAmount = round2(Math.max(0, row.afterProductDiscount - invoiceDiscountShare));
      const effectiveTaxPercent = row.taxable ? row.taxPercent : 0;
      const taxType = (row.taxType ?? "GST").toUpperCase();
      const treatAsGst = taxType === "GST";
      // Display rates stay half-split rounded; AMOUNTS derive from the full
      // rate so cgst+sgst always equals the true tax (no 1p drift on odd rates).
      const cgstRate = row.taxable && treatAsGst && sameState ? round2(effectiveTaxPercent / 2) : 0;
      const sgstRate = row.taxable && treatAsGst && sameState ? round2(effectiveTaxPercent / 2) : 0;
      const igstRate = row.taxable && (!treatAsGst || !sameState) ? effectiveTaxPercent : 0;
      const cgstAmount = row.taxable && treatAsGst && sameState ? round2(taxableAmount * effectiveTaxPercent / 200) : 0;
      const sgstAmount = row.taxable && treatAsGst && sameState ? round2(taxableAmount * effectiveTaxPercent / 200) : 0;
      const igstAmount = round2(taxableAmount * igstRate / 100);
      const taxAmount = round2(cgstAmount + sgstAmount + igstAmount);
      const totalAmount = round2(taxableAmount + taxAmount);
      return { ...row, invoiceDiscountShare, taxableAmount, cgstRate, cgstAmount, sgstRate, sgstAmount, igstRate, igstAmount, taxAmount, totalAmount };
    });

    const taxableAmount = round2(rows.reduce((sum, row) => sum + row.taxableAmount, 0));
    const cgstTotal = round2(rows.reduce((sum, row) => sum + row.cgstAmount, 0));
    const sgstTotal = round2(rows.reduce((sum, row) => sum + row.sgstAmount, 0));
    const igstTotal = round2(rows.reduce((sum, row) => sum + row.igstAmount, 0));
    const taxAmount = round2(rows.reduce((sum, row) => sum + row.taxAmount, 0));
    const grandTotal = round2(rows.reduce((sum, row) => sum + row.totalAmount, 0));
    const paidAmount = round2(Math.min(Math.max(0, numberValue(input.paidAmount)), grandTotal));
    const outstandingAmount = round2(grandTotal - paidAmount);

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
