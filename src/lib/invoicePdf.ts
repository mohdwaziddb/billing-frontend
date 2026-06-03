import type { CompanySummary, Invoice } from "../types/api";
import { formatCurrency } from "./currency";
import { formatDate } from "./format";

const companyInitials = (name?: string | null) =>
  (name ?? "NB")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "NB";

export const downloadInvoicePdf = async (invoice: Invoice, company: CompanySummary | null) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable")
  ]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(14, 165, 233);
  doc.roundedRect(40, 36, 56, 56, 14, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(companyInitials(company?.name), 68, 72, { align: "center" });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(22);
  doc.text(company?.name ?? "NovaBill", 112, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(company?.address ?? "Business address", 112, 78);
  doc.text(`Phone: ${company?.phone ?? "--"}   GST: ${company?.taxId ?? "--"}`, 112, 94);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  doc.text("Invoice", pageWidth - 40, 60, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`Invoice No: ${invoice.invoiceNo}`, pageWidth - 40, 80, { align: "right" });
  doc.text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, pageWidth - 40, 96, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(40, 118, pageWidth - 40, 118);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Bill To", 40, 146);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(invoice.customerName, 40, 164);
  doc.text(`Mobile: ${invoice.customerMobile}`, 40, 180);
  doc.text(invoice.customerAddress ?? "Address not available", 40, 196);

  autoTable(doc, {
    startY: 224,
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 10,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240]
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold"
    },
    bodyStyles: {
      fillColor: [255, 255, 255]
    },
    head: [["Product Name", "Quantity", "Rate", "Amount"]],
    body: invoice.items.map((item) => [
      item.productName,
      String(item.qty),
      formatCurrency(item.price),
      formatCurrency(item.lineTotal)
    ])
  });

  const finalY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 400;
  const summaryX = pageWidth - 240;
  let y = finalY + 26;

  const summaryRows: Array<[string, string]> = [
    ["Subtotal", formatCurrency(invoice.subtotal)],
    ["Discount", formatCurrency(invoice.discountAmount)],
    ["Tax", formatCurrency(invoice.taxAmount)],
    ["Grand Total", formatCurrency(invoice.totalAmount)],
    ["Paid Amount", formatCurrency(invoice.paidAmount)],
    ["Remaining Balance", formatCurrency(invoice.balanceAmount)]
  ];

  summaryRows.forEach(([label, value], index) => {
    const isGrand = label === "Grand Total" || label === "Remaining Balance";
    doc.setFont("helvetica", isGrand ? "bold" : "normal");
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text(label, summaryX, y);
    doc.text(value, pageWidth - 40, y, { align: "right" });
    y += index === 2 ? 24 : 20;
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(40, y + 12, pageWidth - 40, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Thank you for your business.", 40, y + 38);
  doc.text("Authorized Signature", pageWidth - 40, y + 38, { align: "right" });
  doc.line(pageWidth - 170, y + 28, pageWidth - 40, y + 28);

  doc.save(`${invoice.invoiceNo}.pdf`);
};
