import { CommonErrorMessageUtil } from "./CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "./CommonSuccessMessageUtil";
import { notificationService } from "../services/notificationService";

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
  return Object.values(record).some((value) => typeof value === "string" && /grand total/i.test(value));
};

export const exportToExcel = <T,>(fileName: string, rows: T[], columns: ExcelColumn<T>[]) => {
  try {
    const widths = columns.map((column) => Math.max(12, column.header.length + 2));
    const headerRow = `<row r="1">${columns.map((column, index) => `<c r="${columnName(index)}1" s="1" t="inlineStr"><is><t>${xmlEscape(column.header)}</t></is></c>`).join("")}</row>`;
    const dataRows = rows.map((row, rowIndex) => {
      const rowNumber = rowIndex + 2;
      const grandTotal = isGrandTotalRow(row);
      const cells = columns.map((column, columnIndex) => {
        const rawValue = getValue(row, column);
        const ref = `${columnName(columnIndex)}${rowNumber}`;
        if (rawValue === null || rawValue === undefined || rawValue === "") {
          widths[columnIndex] = Math.max(widths[columnIndex], 4);
          return `<c r="${ref}"${grandTotal ? ' s="4"' : ""} t="inlineStr"><is><t>--</t></is></c>`;
        }
        if (column.type === "amount" || column.type === "number") {
          const numericValue = Number(rawValue);
          if (!Number.isNaN(numericValue)) {
            widths[columnIndex] = Math.max(widths[columnIndex], String(numericValue).length + 3);
            return `<c r="${ref}" s="${grandTotal ? 5 : column.type === "amount" ? 2 : 0}"><v>${numericValue}</v></c>`;
          }
        }
        if (column.type === "date") {
          const serial = toExcelSerialDate(rawValue);
          if (serial !== null) {
            widths[columnIndex] = Math.max(widths[columnIndex], 12);
            return `<c r="${ref}" s="${grandTotal ? 4 : 3}"><v>${serial}</v></c>`;
          }
        }
        const value = String(rawValue).replace(/_/g, " ");
        widths[columnIndex] = Math.max(widths[columnIndex], Math.min(60, value.length + 2));
        return `<c r="${ref}"${grandTotal ? ' s="4"' : ""} t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
      }).join("");
      return `<row r="${rowNumber}">${cells}</row>`;
    }).join("");

    const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.min(60, width)}" customWidth="1"/>`).join("")}</cols><sheetData>${headerRow}${dataRows}</sheetData></worksheet>`;
    const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Export" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="#,##0.00"/><numFmt numFmtId="165" formatCode="dd-mm-yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="164" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/></cellXfs></styleSheet>`;
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

    const bytes = makeZip([
      { name: "[Content_Types].xml", content: contentTypes },
      { name: "_rels/.rels", content: rels },
      { name: "xl/workbook.xml", content: workbook },
      { name: "xl/_rels/workbook.xml.rels", content: workbookRels },
      { name: "xl/worksheets/sheet1.xml", content: sheet },
      { name: "xl/styles.xml", content: styles }
    ]);
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
    notificationService.showSuccess(CommonSuccessMessageUtil.exportGenerated());
  } catch (error) {
    notificationService.showError(CommonErrorMessageUtil.exportFailed, error);
  }
};
