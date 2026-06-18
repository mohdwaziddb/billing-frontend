const fieldDisplayNames: Record<string, string> = {
  product_name: "Product Name",
  stock_qty: "Stock Quantity",
  customer_mobile: "Mobile Number",
  invoice_amount: "Invoice Amount",
  selling_price: "Selling Price",
  purchase_price: "Purchase Price",
  min_stock_qty: "Minimum Stock Quantity",
  tax_percent: "Tax Percent",
  hsn_code: "HSN Code",
  gst_no: "GST Number",
  invoice_no: "Invoice Number",
  invoice_date: "Invoice Date",
  total_amount: "Invoice Amount",
  paid_amount: "Paid Amount",
  balance_amount: "Balance Amount",
  payment_status: "Payment Status",
  payment_date: "Payment Date",
  customer_name: "Customer Name",
  category_name: "Category Name",
  full_name: "Full Name",
  username: "Username",
  mobile_number: "Mobile Number",
  email_body: "Email Body"
};

export const FieldDisplayNameMapper = {
  toDisplayName(fieldName: string) {
    if (!fieldName) {
      return "--";
    }
    const normalized = fieldName.trim();
    const mapped = fieldDisplayNames[normalized] ?? fieldDisplayNames[normalized.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)];
    if (mapped) {
      return mapped;
    }
    return normalized
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
};
