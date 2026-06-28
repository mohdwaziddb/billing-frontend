import { useMemo, useRef, useState, type ChangeEvent, type HTMLAttributes } from "react";
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Loader2,
  Trash2,
  Upload,
  CheckCircle2
} from "lucide-react";
import { downloadProductDataPortSample, importProductDataPort, previewProductDataPort } from "../api/dataPorts";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { notificationService } from "../services/notificationService";
import type {
  DataPortPreviewResponse,
  ImportResult,
  ProductDataPortReferenceData,
  ProductDataPortRow
} from "../types/api";

const emptyReferenceData: ProductDataPortReferenceData = {
  categories: [],
  subCategories: [],
  existingSkus: []
};

const emptyPreview: DataPortPreviewResponse<ProductDataPortRow, ProductDataPortReferenceData> = {
  rows: [],
  totalRows: 0,
  validRows: 0,
  invalidRows: 0,
  referenceData: emptyReferenceData
};

const activeOptions = [
  { label: "Yes", value: "Yes" },
  { label: "No", value: "No" },
  { label: "True", value: "True" },
  { label: "False", value: "False" },
  { label: "1", value: "1" },
  { label: "0", value: "0" }
];

type EditableField =
  | "productName"
  | "productCategory"
  | "productSubCategory"
  | "sku"
  | "active"
  | "brand"
  | "hsnCode"
  | "minimumStockQty"
  | "taxPercent";

export const ProductDataPortPage = () => {
  const { can } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(emptyPreview);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const counts = useMemo(() => ({
    totalRows: preview.rows.length,
    validRows: preview.rows.filter((row) => row.valid).length,
    invalidRows: preview.rows.filter((row) => !row.valid).length
  }), [preview.rows]);

  const handleSampleDownload = async () => {
    try {
      setDownloading(true);
      const { blob, fileName } = await downloadProductDataPortSample();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      notificationService.showError("Unable to download sample file", error);
    } finally {
      setDownloading(false);
    }
  };

  const refreshRows = (rows: ProductDataPortRow[], referenceData = preview.referenceData) => {
    const nextRows = validateRows(rows, referenceData);
    setPreview({
      rows: nextRows,
      totalRows: nextRows.length,
      validRows: nextRows.filter((row) => row.valid).length,
      invalidRows: nextRows.filter((row) => !row.valid).length,
      referenceData
    });
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setResult(null);
      const response = await previewProductDataPort(file);
      const nextRows = validateRows(response.rows, response.referenceData);
      setPreview({
        ...response,
        rows: nextRows,
        totalRows: nextRows.length,
        validRows: nextRows.filter((row) => row.valid).length,
        invalidRows: nextRows.filter((row) => !row.valid).length
      });
      setSelectedFileName(file.name);
    } catch (error) {
      notificationService.showError("Unable to preview product file", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await handleFileUpload(file);
  };

  const updateRow = (rowNumber: number, field: EditableField, value: string) => {
    const nextRows = preview.rows.map((row) => row.rowNumber === rowNumber ? { ...row, [field]: value } : row);
    refreshRows(nextRows);
  };

  const handleDeleteRow = (rowNumber: number) => {
    refreshRows(preview.rows.filter((row) => row.rowNumber !== rowNumber));
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      const importSummary = await importProductDataPort(preview.rows);
      setResult(importSummary);
      setConfirmOpen(false);
      notificationService.showSuccess("Products imported successfully");
      if (importSummary.importedRecords > 0) {
        const remainingRows = validateRows(preview.rows.filter((row) => !row.valid), preview.referenceData);
        setPreview({
          rows: remainingRows,
          totalRows: remainingRows.length,
          validRows: remainingRows.filter((row) => row.valid).length,
          invalidRows: remainingRows.filter((row) => !row.valid).length,
          referenceData: preview.referenceData
        });
      }
    } catch (error) {
      setConfirmOpen(false);
      notificationService.showError("Product import failed", error);
    } finally {
      setImporting(false);
    }
  };

  const canImport = can("PRODUCT_DATAPORT", "ADD") && counts.validRows > 0 && !importing;

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header
        title="DataPort > Product DataPort"
        subtitle="Upload product master data with sample download, preview edits, validation, and controlled import. Inventory batches must be created separately through Purchases."
      />

      <GlassCard className="flex flex-col gap-5 p-6 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CommonBreadcrumb items={[{ label: "DataPort" }, { label: "Product DataPort" }]} />
            <h2 className="mt-1 text-xl font-bold text-white">Product DataPort</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Download the sample Excel, fill in product records, preview the data, fix anything that is off, and import only the rows that pass validation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void handleSampleDownload()} disabled={downloading}>
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {downloading ? "Downloading..." : "Download Sample"}
            </Button>
            <Button
              type="button"
              disabled={!can("PRODUCT_DATAPORT", "ADD") || uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? "Uploading..." : "Upload Excel"}
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(event) => void handleFileSelection(event)}
        />

        <section
          className={`rounded-2xl border border-dashed p-5 transition ${dragActive ? "border-[var(--theme-color)] bg-[color:color-mix(in_srgb,var(--theme-color)_10%,white)]" : "border-white/15 bg-white/5"}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragActive(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragActive(false);
            const file = event.dataTransfer.files?.[0];
            if (file) {
              void handleFileUpload(file);
            }
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--theme-color)] shadow-sm">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Drag and drop your Excel file here</p>
                <p className="mt-1 text-sm text-slate-300">
                  Expected format: sample workbook with the required product columns.
                </p>
                {selectedFileName ? <p className="mt-2 text-xs font-semibold text-slate-300">Latest file: {selectedFileName}</p> : null}
              </div>
            </div>
            <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={!can("PRODUCT_DATAPORT", "ADD") || uploading}>
              Choose File
            </Button>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-3">
          <SummaryTile label="Total Rows" value={counts.totalRows} tone="default" />
          <SummaryTile label="Valid Rows" value={counts.validRows} tone="success" />
          <SummaryTile label="Invalid Rows" value={counts.invalidRows} tone="danger" />
        </div>

        {result ? (
          <section className="grid gap-3 md:grid-cols-2">
            <ResultTile label="Imported Records" value={result.importedRecords} tone="success" />
            <ResultTile label="Failed Records" value={result.failedRecords} tone={result.failedRecords > 0 ? "danger" : "default"} />
          </section>
        ) : null}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Preview & Edit Data</h3>
              <p className="mt-1 text-sm text-slate-300">Inline changes update validation instantly. Invalid rows stay out of the import.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={!preview.rows.length}
                onClick={() => refreshRows(preview.rows)}
              >
                Refresh Validation
              </Button>
              <Button type="button" disabled={!canImport} onClick={() => setConfirmOpen(true)}>
                {importing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Import Products
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-[1080px] w-full border-separate border-spacing-0 text-left text-sm text-slate-700">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  {[
                    "#",
                    "Product Name",
                    "Product Category",
                    "Product Sub Category",
                    "SKU",
                    "Active",
                    "Brand",
                    "HSN Code",
                    "Minimum Stock Qty",
                    "Tax Percent",
                    "Status",
                    "Actions"
                  ].map((header) => (
                    <th key={header} className="border-b border-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-16 text-center text-slate-500">
                      Upload a sample-filled Excel file to preview product data here.
                    </td>
                  </tr>
                ) : (
                  preview.rows.map((row) => (
                    <tr key={row.rowNumber} className={row.valid ? "bg-white" : "bg-rose-50/60"}>
                      <td className="border-b border-slate-100 px-3 py-3 align-top font-semibold text-slate-500">{row.rowNumber}</td>
                      <EditableCell row={row} field="productName" value={row.productName} onChange={updateRow} />
                      <EditableCell row={row} field="productCategory" value={row.productCategory} onChange={updateRow} />
                      <EditableCell row={row} field="productSubCategory" value={row.productSubCategory} onChange={updateRow} />
                      <EditableCell row={row} field="sku" value={row.sku} onChange={updateRow} />
                      <td className="border-b border-slate-100 px-3 py-3 align-top">
                        <select
                          value={row.active}
                          onChange={(event) => updateRow(row.rowNumber, "active", event.target.value)}
                          className="w-[110px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-[var(--theme-color)]"
                        >
                          <option value="">Blank</option>
                          {activeOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <ValidationMessage message={row.validationErrors.active} />
                      </td>
                      <EditableCell row={row} field="brand" value={row.brand ?? ""} onChange={updateRow} />
                      <EditableCell row={row} field="hsnCode" value={row.hsnCode ?? ""} onChange={updateRow} />
                      <EditableCell row={row} field="minimumStockQty" value={row.minimumStockQty} onChange={updateRow} inputMode="numeric" />
                      <EditableCell row={row} field="taxPercent" value={row.taxPercent} onChange={updateRow} inputMode="decimal" />
                      <td className="border-b border-slate-100 px-3 py-3 align-top">
                        {row.valid ? (
                          <span className="inline-flex min-h-9 items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Valid
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex min-h-9 items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                              Invalid
                            </span>
                            <ul className="space-y-1 text-xs text-rose-600">
                              {Object.entries(row.validationErrors).map(([field, message]) => (
                                <li key={field}>{message}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 align-top">
                        <button
                          type="button"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                          onClick={() => handleDeleteRow(row.rowNumber)}
                          aria-label={`Delete row ${row.rowNumber}`}
                          title="Delete row"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </GlassCard>

      <Modal open={confirmOpen} title="Confirm Import" eyebrow="Product DataPort" onClose={() => !importing && setConfirmOpen(false)} maxWidthClass="max-w-lg">
        <div className="space-y-5">
          <p className="text-sm text-slate-600">Do you want to import this data?</p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <span>Total Rows</span>
              <span className="font-semibold text-slate-950">{counts.totalRows}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span>Valid Rows</span>
              <span className="font-semibold text-emerald-700">{counts.validRows}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span>Invalid Rows</span>
              <span className="font-semibold text-rose-700">{counts.invalidRows}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)} disabled={importing}>
              No Cancel
            </Button>
            <Button type="button" onClick={() => void handleImport()} disabled={!counts.validRows || importing}>
              {importing ? <Loader2 size={16} className="animate-spin" /> : null}
              {importing ? "Importing..." : "Yes Import"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const EditableCell = ({
  row,
  field,
  value,
  onChange,
  inputMode
}: {
  row: ProductDataPortRow;
  field: EditableField;
  value: string;
  onChange: (rowNumber: number, field: EditableField, value: string) => void;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) => (
  <td className="border-b border-slate-100 px-3 py-3 align-top">
    <input
      value={value}
      inputMode={inputMode}
      onChange={(event) => onChange(row.rowNumber, field, event.target.value)}
      className="w-full min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition focus:border-[var(--theme-color)]"
    />
    <ValidationMessage message={row.validationErrors[field]} />
  </td>
);

const ValidationMessage = ({ message }: { message?: string }) => (
  message ? (
    <p className="mt-2 text-xs font-medium text-rose-600">{message}</p>
  ) : null
);

const SummaryTile = ({ label, value, tone }: { label: string; value: number; tone: "default" | "success" | "danger" }) => {
  const toneClasses = tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-white/10 bg-white/5 text-white";

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
};

const ResultTile = ({ label, value, tone }: { label: string; value: number; tone: "default" | "success" | "danger" }) => {
  const icon = tone === "success" ? <CheckCircle2 size={18} /> : tone === "danger" ? <AlertTriangle size={18} /> : <FileSpreadsheet size={18} />;
  const toneClasses = tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-white text-slate-700";

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
};

const validateRows = (rows: ProductDataPortRow[], referenceData: ProductDataPortReferenceData) => {
  const categoriesByName = new Map(referenceData.categories.map((category) => [normalizeKey(category.name), category]));
  const existingSkuSet = new Set(referenceData.existingSkus.map(normalizeKey));
  const uploadSkuCounts = new Map<string, number>();

  rows.forEach((row) => {
    const normalizedSku = normalizeKey(row.sku);
    if (!normalizedSku) {
      return;
    }
    uploadSkuCounts.set(normalizedSku, (uploadSkuCounts.get(normalizedSku) ?? 0) + 1);
  });

  return rows.map((row) => {
    const nextRow: ProductDataPortRow = {
      ...row,
      productName: row.productName?.trim() ?? "",
      productCategory: row.productCategory?.trim() ?? "",
      productSubCategory: row.productSubCategory?.trim() ?? "",
      sku: row.sku?.trim() ?? "",
      active: row.active?.trim() ?? "",
      brand: trimToNull(row.brand),
      hsnCode: trimToNull(row.hsnCode),
      minimumStockQty: row.minimumStockQty?.trim() ?? "",
      taxPercent: row.taxPercent?.trim() ?? "",
      productCategoryId: null,
      productSubCategoryId: null,
      activeValue: null,
      valid: true,
      validationErrors: {}
    };

    const errors: Record<string, string> = {};

    if (!nextRow.productName) {
      errors.productName = "Product name is required";
    }
    if (!nextRow.productCategory) {
      errors.productCategory = "Product category is required";
    }
    if (!nextRow.productSubCategory) {
      errors.productSubCategory = "Product sub category is required";
    }
    if (!nextRow.sku) {
      errors.sku = "SKU is required";
    }
    if (!nextRow.taxPercent) {
      errors.taxPercent = "Tax percent is required";
    }

    if (nextRow.productCategory) {
      const category = categoriesByName.get(normalizeKey(nextRow.productCategory));
      if (!category) {
        errors.productCategory = "Product category was not found in your company";
      } else {
        nextRow.productCategoryId = category.id;
      }
    }

    if (nextRow.productCategoryId && nextRow.productSubCategory) {
      const subCategory = referenceData.subCategories.find((item) =>
        item.categoryId === nextRow.productCategoryId && normalizeKey(item.name) === normalizeKey(nextRow.productSubCategory)
      );
      if (!subCategory) {
        errors.productSubCategory = "Product sub category was not found under the selected category in your company";
      } else {
        nextRow.productSubCategoryId = subCategory.id;
      }
    }

    const normalizedSku = normalizeKey(nextRow.sku);
    if (normalizedSku && existingSkuSet.has(normalizedSku)) {
      errors.sku = "SKU already exists in your company";
    } else if (normalizedSku && (uploadSkuCounts.get(normalizedSku) ?? 0) > 1) {
      errors.sku = "SKU is duplicated in the uploaded file";
    }

    const taxPercent = parseDecimal(nextRow.taxPercent);
    const minimumStockQty = parseInteger(nextRow.minimumStockQty || "0");

    if (nextRow.taxPercent && taxPercent === null) {
      errors.taxPercent = "Tax percent must be a valid number";
    } else if (taxPercent !== null && taxPercent < 0) {
      errors.taxPercent = "Tax percent must be 0 or more";
    }

    if (minimumStockQty === null) {
      errors.minimumStockQty = "Minimum stock qty must be a whole number";
    } else if (minimumStockQty < 0) {
      errors.minimumStockQty = "Minimum stock qty must be 0 or more";
    }

    const activeValue = parseActive(nextRow.active);
    if (nextRow.active && activeValue === null) {
      errors.active = "Active must be Yes, No, True, False, 1, or 0";
    } else {
      nextRow.activeValue = activeValue ?? true;
    }

    nextRow.validationErrors = errors;
    nextRow.valid = Object.keys(errors).length === 0;
    return nextRow;
  });
};

const normalizeKey = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

const trimToNull = (value: string | null | undefined) => {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
};

const parseDecimal = (value: string) => {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const parseInteger = (value: string) => {
  if (!value.trim()) {
    return 0;
  }
  return /^-?\d+$/.test(value.trim()) ? Number(value.trim()) : null;
};

const parseActive = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  if (["yes", "true", "1"].includes(normalized)) {
    return true;
  }
  if (["no", "false", "0"].includes(normalized)) {
    return false;
  }
  return null;
};
