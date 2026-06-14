export type DiscountType = "FIXED" | "PERCENT";

export type InvoiceCalculationRowInput = {
  id?: string;
  productId?: string;
  qty?: string | number;
  rate?: string | number;
  taxPercent?: string | number;
  productDiscountType?: DiscountType;
  productDiscountValue?: string | number;
};

export type InvoiceCalculationInput = {
  rows: InvoiceCalculationRowInput[];
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
    const baseRows = input.rows.map((row) => {
      const qty = Math.max(0, numberValue(row.qty));
      const rate = Math.max(0, numberValue(row.rate));
      const taxPercent = Math.max(0, numberValue(row.taxPercent));
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
        taxPercent,
        taxAmount: 0,
        totalAmount: 0
      };
    });

    const subtotal = round2(baseRows.reduce((sum, row) => sum + row.lineTotal, 0));
    const productDiscountTotal = round2(baseRows.reduce((sum, row) => sum + row.productDiscount, 0));
    const afterProductDiscountSubtotal = round2(baseRows.reduce((sum, row) => sum + row.afterProductDiscount, 0));
    const taxBeforeInvoiceDiscount = round2(baseRows.reduce((sum, row) => sum + round2(row.lineTotal * row.taxPercent / 100), 0));
    const totalBeforeInvoiceDiscount = round2(afterProductDiscountSubtotal + taxBeforeInvoiceDiscount);
    const invoiceDiscount = discountAmount(totalBeforeInvoiceDiscount, input.invoiceDiscountType, input.invoiceDiscountValue);

    const rows = baseRows.map((row) => {
      const taxAmount = round2(row.lineTotal * row.taxPercent / 100);
      const lineTotalBeforeInvoiceDiscount = round2(row.afterProductDiscount + taxAmount);
      const invoiceDiscountShare = totalBeforeInvoiceDiscount > 0
        ? round2(invoiceDiscount * (lineTotalBeforeInvoiceDiscount / totalBeforeInvoiceDiscount))
        : 0;
      const totalAmount = round2(lineTotalBeforeInvoiceDiscount - invoiceDiscountShare);
      return { ...row, invoiceDiscountShare, taxAmount, totalAmount };
    });

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
      taxAmount,
      grandTotal,
      paidAmount,
      outstandingAmount
    };
  }
};
