import type { CompanySummary, Invoice } from "../types/api";
import { env } from "../config/env";
import { formatAmount } from "./currency";
import { formatDate } from "./format";

const companyInitials = (name?: string | null) =>
  (name ?? "NB")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "NB";

const apiOrigin = env.apiBaseUrl.replace(/\/api\/?$/, "");

const resolveAssetUrl = (url?: string | null) => {
  if (!url) {
    return null;
  }
  return url.startsWith("http") ? url : `${apiOrigin}${url}`;
};

const companyAddress = (company: CompanySummary | null) => {
  const parts = [
    company?.addressLine1 ?? company?.address,
    company?.addressLine2,
    company?.city,
    company?.state,
    company?.country,
    company?.pincode
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "Business address";
};

const imageToDataUrl = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const imageFormat = (dataUrl: string) => {
  if (dataUrl.startsWith("data:image/jpeg")) {
    return "JPEG";
  }
  if (dataUrl.startsWith("data:image/webp")) {
    return "WEBP";
  }
  return "PNG";
};

const currentThemeRgb = () => {
  const color = getComputedStyle(document.documentElement).getPropertyValue("--theme-color").trim() || "#0EA5E9";
  const normalized = color.replace("#", "");
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16)
  ] as const;
};

export const downloadInvoicePdf = async (invoice: Invoice, company: CompanySummary | null) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable")
  ]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoUrl = resolveAssetUrl(company?.logoUrl);
  const [themeR, themeG, themeB] = currentThemeRgb();

  if (logoUrl) {
    try {
      const logoData = await imageToDataUrl(logoUrl);
      doc.addImage(logoData, imageFormat(logoData), 40, 36, 56, 56, undefined, "FAST");
    } catch {
      doc.setFillColor(themeR, themeG, themeB);
      doc.roundedRect(40, 36, 56, 56, 14, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text(companyInitials(company?.name), 68, 72, { align: "center" });
    }
  } else {
    doc.setFillColor(themeR, themeG, themeB);
    doc.roundedRect(40, 36, 56, 56, 14, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(companyInitials(company?.name), 68, 72, { align: "center" });
  }

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(22);
  doc.text(company?.name ?? "NovaBill", 112, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(doc.splitTextToSize(companyAddress(company), 280), 112, 78);
  doc.text(`Phone: ${company?.phone ?? "--"}   GST: ${company?.taxId ?? "--"}`, 112, 108);

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
  doc.line(40, 126, pageWidth - 40, 126);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Bill To", 40, 154);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(invoice.customerName, 40, 172);
  doc.text(`Mobile: ${invoice.customerMobile}`, 40, 188);
  doc.text(invoice.customerAddress ?? "Address not available", 40, 204);

  autoTable(doc, {
    startY: 232,
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
      formatAmount(item.price),
      formatAmount(item.lineTotal)
    ])
  });

  const finalY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 400;
  const summaryX = pageWidth - 240;
  let y = finalY + 26;

  const summaryRows: Array<[string, string]> = [
    ["Subtotal", formatAmount(invoice.subtotal)],
    ["Discount", formatAmount(invoice.discountAmount)],
    ["Tax", formatAmount(invoice.taxAmount)],
    ["Grand Total", formatAmount(invoice.totalAmount)],
    ["Paid Amount", formatAmount(invoice.paidAmount)],
    ["Remaining Balance", formatAmount(invoice.balanceAmount)]
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
