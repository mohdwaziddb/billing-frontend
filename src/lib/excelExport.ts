import { CommonErrorMessageUtil } from "./CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "./CommonSuccessMessageUtil";
import { notificationService } from "../services/notificationService";
import { authStorage } from "./storage";

export type ExcelColumn<T> = {
  key: keyof T | string;
  header: string;
  type?: "text" | "date" | "amount" | "number";
  value?: (row: T) => string | number | Date | null | undefined;
};

const encoder = new TextEncoder();
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const dosDateTime = () => {
  const date = new Date();
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
};

const u16 = (value: number) => {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
};

const u32 = (value: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
};

const concatBytes = (parts: Uint8Array[]) => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
};

const makeZip = (files: Array<{ name: string; content: string }>) => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const stamp = dosDateTime();

  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const content = encoder.encode(file.content);
    const crc = crc32(content);
    const localHeader = concatBytes([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(stamp.time), u16(stamp.date),
      u32(crc), u32(content.length), u32(content.length), u16(name.length), u16(0), name
    ]);
    localParts.push(localHeader, content);
    centralParts.push(concatBytes([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(stamp.time), u16(stamp.date),
      u32(crc), u32(content.length), u32(content.length), u16(name.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), name
    ]));
    offset += localHeader.length + content.length;
  });

  const central = concatBytes(centralParts);
  const end = concatBytes([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(central.length), u32(offset), u16(0)
  ]);

  return concatBytes([...localParts, central, end]);
};

const xmlEscape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const columnName = (index: number) => {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
};

const toExcelSerialDate = (value: unknown) => {
  const raw = String(value ?? "");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const date = value instanceof Date ? value : match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(1899, 11, 30)) / 86400000;
};

const getValue = <T,>(row: T, column: ExcelColumn<T>) => {
  if (column.value) {
    return column.value(row);
  }
  return (row as Record<string, unknown>)[String(column.key)] as string | number | Date | null | undefined;
};

const isGrandTotalRow = <T,>(row: T) => {
  const record = row as Record<string, unknown>;
  if (record.__rowType === "grandTotal") {
    return true;
  }
  // Exact "Grand Total" hi: pehle "Grand Total Traders" jaisa customer naam bhi total row ban jata tha.
  return Object.values(record).some((value) => typeof value === "string" && value.trim().toLowerCase() === "grand total");
};

export type ExcelExportOptions = {
  /** Report ka naam (default: file name se, e.g. "gst-invoice-wise" -> "GST Invoice Wise"). */
  title?: string;
  /** Filter / period line, e.g. "Period: 01-10-2026 to 23-10-2026 | Status: Paid". */
  filters?: string | string[];
  /** Header ke neeche summary chips (Total Records apne aap judta hai). */
  summary?: Array<{ label: string; value: string | number }>;
  /** Amount/number columns ka TOTAL row (default: true, agar data me pehle se Grand Total row na ho). */
  totalRow?: boolean;
};

// Style ids (styles.xml ke cellXfs order me) — reference "Employee Leave Register" jaisa layout.
const S = {
  company: 1,
  info: 2,
  title: 3,
  meta: 4,
  chip: 5,
  header: 6,
  text: 7,
  amount: 8,
  date: 9,
  number: 10,
  totalText: 11,
  totalAmount: 12,
  center: 13
} as const;

const ACRONYMS: Record<string, string> = { gst: "GST", hsn: "HSN", sku: "SKU", upi: "UPI", id: "ID", pnl: "P&L" };

const titleFromFileName = (fileName: string) =>
  fileName
    .replace(/\.xlsx$/i, "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => ACRONYMS[word.toLowerCase()] ?? word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const pad = (value: number) => String(value).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const generatedStamp = (date = new Date()) => `${pad(date.getDate())} ${MONTHS[date.getMonth()]}, ${date.getFullYear()} | ${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Logged-in user + company: session se (har export call me pass karne ki zarurat nahi). */
const exportContext = () => {
  const session = authStorage.get();
  if (!session || session.type !== "user") {
    return { userName: "", company: null as null | { name: string; address: string; contact: string } };
  }
  const user = session.auth.user;
  const company = user.company;
  if (!company) {
    return { userName: user.fullName ?? "", company: null };
  }
  const address = [company.addressLine1 || company.address, company.addressLine2, company.city, [company.state, company.pincode].filter(Boolean).join(" - ")]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ");
  const contact = [company.email ? `Email ID: ${company.email}` : "", company.phone ? `Phone: ${company.phone}` : "", company.gstin ? `GSTIN: ${company.gstin}` : ""]
    .filter(Boolean)
    .join("  |  ");
  return { userName: user.fullName ?? "", company: { name: company.legalName || company.name, address, contact } };
};

const sheetNameFrom = (title: string) => (title.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Export");

// XML 1.0 me control characters invalid hain (file "corrupt" khulti hai).
const cleanText = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

const inlineCell = (ref: string, style: number, text: string) =>
  `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(cleanText(text))}</t></is></c>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
  + `<numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="dd-mm-yyyy"/></numFmts>`
  + `<fonts count="7">`
  + `<font><sz val="9"/><name val="Helvetica"/><family val="2"/></font>`
  + `<font><b/><sz val="12"/><color rgb="FF1F4E78"/><name val="Helvetica"/><family val="2"/></font>`
  + `<font><sz val="8"/><color rgb="FF374151"/><name val="Helvetica"/><family val="2"/></font>`
  + `<font><b/><sz val="10"/><name val="Helvetica"/><family val="2"/></font>`
  + `<font><b/><sz val="8"/><name val="Helvetica"/><family val="2"/></font>`
  + `<font><b/><sz val="9"/><name val="Helvetica"/><family val="2"/></font>`
  + `<font><b/><sz val="9"/><color rgb="FFFFFFFF"/><name val="Helvetica"/><family val="2"/></font>`
  + `</fonts>`
  // fills[1] Excel ke liye hamesha "gray125" hona chahiye — pehle yahan header ka rang tha, isliye header chaukhane (dotted) dikhta tha.
  + `<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F4E78"/><bgColor indexed="64"/></patternFill></fill></fills>`
  + `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF9CA3AF"/></left><right style="thin"><color rgb="FF9CA3AF"/></right><top style="thin"><color rgb="FF9CA3AF"/></top><bottom style="thin"><color rgb="FF9CA3AF"/></bottom><diagonal/></border></borders>`
  + `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`
  + `<cellXfs count="14">`
  + `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`
  + `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`
  + `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`
  + `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`
  + `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>`
  + `<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>`
  + `<xf numFmtId="0" fontId="6" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>`
  + `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>`
  + `<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>`
  + `<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`
  + `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>`
  + `<xf numFmtId="0" fontId="5" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>`
  + `<xf numFmtId="164" fontId="5" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>`
  + `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`
  + `</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export const exportToExcel = <T,>(fileName: string, rows: T[], columns: ExcelColumn<T>[], options: ExcelExportOptions = {}) => {
  try {
    const columnCount = Math.max(1, columns.length);
    const lastCol = columnName(columnCount - 1);
    const title = options.title?.trim() || titleFromFileName(fileName);
    const { userName, company } = exportContext();
    const filters = (Array.isArray(options.filters) ? options.filters : [options.filters]).map((item) => (item ?? "").trim()).filter(Boolean);
    // +6: header me autoFilter ka dropdown arrow naam ke upar na aaye.
    const widths = columns.map((column) => Math.max(11, Math.min(40, column.header.length + 6)));

    const sheetRows: string[] = [];
    const merges: string[] = [];
    let r = 0;
    const fullWidthRow = (style: number, text: string, height?: number) => {
      r += 1;
      sheetRows.push(`<row r="${r}"${height ? ` ht="${height}" customHeight="1"` : ""}>${inlineCell(`A${r}`, style, text)}</row>`);
      if (columnCount > 1) {
        merges.push(`A${r}:${lastCol}${r}`);
      }
    };

    // 1. Company block
    if (company) {
      fullWidthRow(S.company, company.name, 20);
      if (company.address) fullWidthRow(S.info, company.address);
      if (company.contact) fullWidthRow(S.info, company.contact);
    }
    // 2. Report title + generated by
    fullWidthRow(S.title, title, 18);
    fullWidthRow(S.meta, `Generated By : '${userName || "--"}' on : ${generatedStamp()}`);
    if (filters.length) {
      fullWidthRow(S.meta, filters.join("    |    "), filters.join("").length > 140 ? 30 : undefined);
    }

    // 3. Summary chips (grey, bordered) — 2 columns per chip jaisa reference me.
    const hasGrandTotal = rows.some((row) => isGrandTotalRow(row));
    const dataRows = rows.filter((row) => !isGrandTotalRow(row));
    const chips = [{ label: "Total Records", value: dataRows.length }, ...(options.summary ?? [])];
    {
      r += 1;
      const span = columnCount >= chips.length * 2 ? 2 : 1;
      const cells: string[] = [];
      chips.slice(0, Math.floor(columnCount / span) || 1).forEach((chip, index) => {
        const start = index * span;
        const value = typeof chip.value === "number" ? chip.value.toLocaleString("en-IN") : chip.value;
        cells.push(inlineCell(`${columnName(start)}${r}`, S.chip, `${chip.label} : ${value}`));
        if (span === 2) {
          cells.push(`<c r="${columnName(start + 1)}${r}" s="${S.chip}"/>`);
          merges.push(`${columnName(start)}${r}:${columnName(start + 1)}${r}`);
        }
      });
      sheetRows.push(`<row r="${r}" ht="16" customHeight="1">${cells.join("")}</row>`);
    }
    r += 1;
    sheetRows.push(`<row r="${r}" ht="6" customHeight="1"/>`);

    // 4. Table header
    r += 1;
    const headerRowNumber = r;
    sheetRows.push(`<row r="${r}" ht="22" customHeight="1">${columns.map((column, index) => inlineCell(`${columnName(index)}${r}`, S.header, column.header)).join("")}</row>`);

    // 5. Data
    const totals = columns.map(() => 0);
    const writeRow = (row: T, grandTotal: boolean) => {
      r += 1;
      const cells = columns.map((column, columnIndex) => {
        const rawValue = getValue(row, column);
        const ref = `${columnName(columnIndex)}${r}`;
        if (rawValue === null || rawValue === undefined || rawValue === "") {
          return inlineCell(ref, grandTotal ? S.totalText : S.center, grandTotal ? "" : "-");
        }
        if (column.type === "amount" || column.type === "number") {
          const numericValue = Number(rawValue);
          if (!Number.isNaN(numericValue)) {
            if (!grandTotal) totals[columnIndex] += numericValue;
            widths[columnIndex] = Math.max(widths[columnIndex], numericValue.toLocaleString("en-IN", { minimumFractionDigits: 2 }).length + 3);
            const style = grandTotal ? S.totalAmount : column.type === "amount" ? S.amount : S.number;
            return `<c r="${ref}" s="${style}"><v>${numericValue}</v></c>`;
          }
        }
        // Type na diya ho par value number hai (Invoices count, Qty): number hi likho — text me Excel hara triangle dikhata tha.
        if (!column.type && typeof rawValue === "number" && Number.isFinite(rawValue)) {
          return `<c r="${ref}" s="${grandTotal ? S.totalAmount : S.number}"><v>${rawValue}</v></c>`;
        }
        if (column.type === "date") {
          const serial = toExcelSerialDate(rawValue);
          if (serial !== null) {
            widths[columnIndex] = Math.max(widths[columnIndex], 12);
            return `<c r="${ref}" s="${grandTotal ? S.totalText : S.date}"><v>${serial}</v></c>`;
          }
        }
        // Sirf ENUM_JAISE values (CUSTOMER_RELATED) me "_" -> space. Email, SKU, invoice no ke "_" waise hi rahen.
        const text = String(rawValue);
        const value = /^[A-Z0-9]+(_[A-Z0-9]+)+$/.test(text) ? text.replace(/_/g, " ") : text;
        widths[columnIndex] = Math.max(widths[columnIndex], Math.min(50, value.length + 3));
        return inlineCell(ref, grandTotal ? S.totalText : S.text, value);
      }).join("");
      sheetRows.push(`<row r="${r}">${cells}</row>`);
    };
    dataRows.forEach((row) => writeRow(row, false));
    rows.filter((row) => isGrandTotalRow(row)).forEach((row) => writeRow(row, true));

    // 6. Auto TOTAL row (amount/number columns ka jod) — agar data me pehle se Grand Total na ho.
    const numericColumns = columns.map((column) => column.type === "amount" || column.type === "number");
    const sumColumns = columns.map((column) => column.type === "amount");
    if ((options.totalRow ?? true) && !hasGrandTotal && dataRows.length > 1 && sumColumns.some(Boolean)) {
      r += 1;
      const cells = columns.map((_, columnIndex) => {
        const ref = `${columnName(columnIndex)}${r}`;
        if (sumColumns[columnIndex]) {
          return `<c r="${ref}" s="${S.totalAmount}"><v>${Math.round(totals[columnIndex] * 100) / 100}</v></c>`;
        }
        return inlineCell(ref, S.totalText, columnIndex === 0 ? "Total" : "");
      }).join("");
      sheetRows.push(`<row r="${r}" ht="16" customHeight="1">${cells}</row>`);
    }

    const lastRow = Math.max(r, headerRowNumber);
    const sheetName = sheetNameFrom(title);
    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
      + `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>`
      + `<dimension ref="A1:${lastCol}${lastRow}"/>`
      // Header row tak freeze: scroll karte hue column naam dikhte rahen.
      + `<sheetViews><sheetView workbookViewId="0" tabSelected="1"><pane ySplit="${headerRowNumber}" topLeftCell="A${headerRowNumber + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${headerRowNumber + 1}" sqref="A${headerRowNumber + 1}"/></sheetView></sheetViews>`
      + `<sheetFormatPr defaultRowHeight="15"/>`
      + `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.min(50, width)}" customWidth="1"/>`).join("")}</cols>`
      + `<sheetData>${sheetRows.join("")}</sheetData>`
      + (dataRows.length ? `<autoFilter ref="A${headerRowNumber}:${lastCol}${headerRowNumber + dataRows.length}"/>` : "")
      + (merges.length ? `<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>` : "")
      + `<printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>`
      + `<pageSetup paperSize="9" orientation="${columnCount > 6 ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>`
      + `<headerFooter><oddFooter>&amp;L${xmlEscape(title)}&amp;RPage &amp;P of &amp;N</oddFooter></headerFooter>`
      + `</worksheet>`;
    const definedNames = dataRows.length
      ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${sheetName.replace(/'/g, "''")}'!$A$${headerRowNumber}:$${lastCol}$${headerRowNumber + dataRows.length}</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">'${sheetName.replace(/'/g, "''")}'!$${headerRowNumber}:$${headerRowNumber}</definedName></definedNames>`
      : "";
    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets>${definedNames}</workbook>`;
    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

    const bytes = makeZip([
      { name: "[Content_Types].xml", content: contentTypes },
      { name: "_rels/.rels", content: rels },
      { name: "xl/workbook.xml", content: workbook },
      { name: "xl/_rels/workbook.xml.rels", content: workbookRels },
      { name: "xl/worksheets/sheet1.xml", content: sheet },
      { name: "xl/styles.xml", content: STYLES }
    ]);
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
    link.click();
    // Turant revoke se kuch browsers me download beech me kat jaata hai.
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    notificationService.showSuccess(CommonSuccessMessageUtil.exportGenerated());
  } catch (error) {
    notificationService.showError(CommonErrorMessageUtil.exportFailed, error);
  }
};
