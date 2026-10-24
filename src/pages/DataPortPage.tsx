import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useParams } from "react-router-dom";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  XCircle
} from "lucide-react";
import { downloadDataPortSample, getDataPortModules, importDataPort, previewDataPort, revalidateDataPort } from "../api/dataPorts";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { exportToExcel } from "../lib/excelExport";
import { notificationService } from "../services/notificationService";
import type { DataPortField, DataPortModuleMeta, DataPortRow, ImportResult } from "../types/api";

type RowFilter = "all" | "valid" | "errors";

const REVALIDATE_DELAY_MS = 500;

/**
 * Common DataPort page: /data-port/:moduleKey. Columns, rules aur sample file
 * backend module se aate hain — naya module = sirf backend class, yahan kuch nahi.
 */
export const DataPortPage = () => {
  const { moduleKey = "" } = useParams();
  const [modules, setModules] = useState<DataPortModuleMeta[] | null>(null);
  const module = modules?.find((item) => item.key === moduleKey) ?? null;

  useEffect(() => {
    let cancelled = false;
    getDataPortModules()
      .then((rows) => !cancelled && setModules(rows))
      .catch((error) => {
        if (!cancelled) {
          setModules([]);
          notificationService.showError("Unable to load DataPort modules", error);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (modules === null) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
        <Loader2 size={18} className="mr-2 animate-spin" /> Loading DataPort…
      </div>
    );
  }
  if (!module) {
    return (
      <div className="space-y-4 pb-6">
        <Header title="DataPort" subtitle="This import is not available for your role." />
        <GlassCard className="p-6 text-sm text-slate-600">
          You do not have access to this DataPort. <Link className="font-semibold text-[var(--theme-color)]" to="/data-port">See all DataPorts</Link>
        </GlassCard>
      </div>
    );
  }
  // key: module badalte hi poora state reset (purani file ki rows dusre module me na dikhें).
  return <DataPortWorkspace key={module.key} module={module} modules={modules} />;
};

const DataPortWorkspace = ({ module, modules }: { module: DataPortModuleMeta; modules: DataPortModuleMeta[] }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const revalidateTimer = useRef<number | null>(null);
  const revalidateAbort = useRef<AbortController | null>(null);
  const [rows, setRows] = useState<DataPortRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [filter, setFilter] = useState<RowFilter>("all");
  const [guideOpen, setGuideOpen] = useState(false);

  const counts = useMemo(() => {
    const valid = rows.filter((row) => row.valid).length;
    return { total: rows.length, valid, errors: rows.length - valid };
  }, [rows]);
  const visibleRows = useMemo(
    () => rows.filter((row) => (filter === "valid" ? row.valid : filter === "errors" ? !row.valid : true)),
    [rows, filter]
  );
  // Invoice / purchase: same group ki rows ek rang me (kaunsi rows ek record hain, dikh jaye).
  const groupShade = useMemo(() => {
    const shades = new Map<number, boolean>();
    if (!module.groupField) {
      return shades;
    }
    let shaded = false;
    let previous: string | null = null;
    rows.forEach((row) => {
      const key = (row.values[module.groupField!] ?? "").trim().toLowerCase();
      if (!key || key !== previous) {
        shaded = !shaded;
      }
      previous = key || null;
      shades.set(row.rowNumber, shaded);
    });
    return shades;
  }, [rows, module.groupField]);

  const step = result ? 3 : rows.length ? 2 : 1;
  const canImport = module.canImport && counts.valid > 0 && !importing && !checking;

  useEffect(() => () => {
    if (revalidateTimer.current) {
      window.clearTimeout(revalidateTimer.current);
    }
    revalidateAbort.current?.abort();
  }, []);

  const runRevalidate = useCallback(async (nextRows: DataPortRow[]) => {
    revalidateAbort.current?.abort();
    if (!nextRows.length) {
      setChecking(false);
      return;
    }
    const controller = new AbortController();
    revalidateAbort.current = controller;
    setChecking(true);
    try {
      const response = await revalidateDataPort(module.key, nextRows, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setRows(response.rows);
      }
    } catch (error: any) {
      if (error?.code !== "ERR_CANCELED" && !controller.signal.aborted) {
        notificationService.showError("Unable to re-check the rows", error);
      }
    } finally {
      if (!controller.signal.aborted) {
        setChecking(false);
      }
    }
  }, [module.key]);

  const scheduleRevalidate = (nextRows: DataPortRow[]) => {
    if (revalidateTimer.current) {
      window.clearTimeout(revalidateTimer.current);
    }
    setChecking(true);
    revalidateTimer.current = window.setTimeout(() => void runRevalidate(nextRows), REVALIDATE_DELAY_MS);
  };

  const handleSampleDownload = async () => {
    try {
      setDownloading(true);
      const { blob, fileName: sampleName } = await downloadDataPortSample(module.key);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = sampleName;
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

  const handleFile = async (file: File) => {
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      notificationService.showError("Please upload an Excel file (.xlsx or .xls). Start from the sample file.");
      return;
    }
    try {
      setUploading(true);
      setResult(null);
      setFilter("all");
      const response = await previewDataPort(module.key, file);
      setRows(response.rows);
      setFileName(file.name);
      if (response.invalidRows > 0) {
        notificationService.showError(`${response.invalidRows} row(s) need attention. Fix them in the table below.`);
      } else {
        notificationService.showSuccess(`All ${response.totalRows} rows look good. Ready to import.`);
      }
    } catch (error) {
      notificationService.showError("Unable to read this file", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const updateCell = (rowNumber: number, field: string, value: string) => {
    const nextRows = rows.map((row) => (row.rowNumber === rowNumber ? { ...row, values: { ...row.values, [field]: value } } : row));
    setRows(nextRows);
    scheduleRevalidate(nextRows);
  };

  const deleteRow = (rowNumber: number) => {
    const nextRows = rows.filter((row) => row.rowNumber !== rowNumber);
    setRows(nextRows);
    scheduleRevalidate(nextRows);
  };

  const clearAll = () => {
    revalidateAbort.current?.abort();
    setRows([]);
    setFileName("");
    setResult(null);
    setChecking(false);
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      const summary = await importDataPort(module.key, rows);
      setResult(summary);
      setConfirmOpen(false);
      const failedRowNumbers = new Set(summary.failures.map((failure) => failure.rowNumber));
      // Jo import ho gayi wo hatao; galat / fail rows theek karne ke liye rahne do.
      const remaining = rows
        .filter((row) => !row.valid || failedRowNumbers.has(row.rowNumber))
        .map((row) => {
          const failure = summary.failures.find((item) => item.rowNumber === row.rowNumber);
          return failure ? { ...row, valid: false, validationErrors: { ...row.validationErrors, _import: failure.message } } : row;
        });
      setRows(remaining);
      setFilter(remaining.length ? "errors" : "all");
      if (summary.importedRecords > 0) {
        notificationService.showSuccess(`${summary.importedRecords} row(s) imported into ${module.title}`);
      }
      if (summary.failures.length > 0) {
        notificationService.showError(`${summary.failures.length} row(s) could not be saved. See the reasons in the table.`);
      }
    } catch (error) {
      setConfirmOpen(false);
      notificationService.showError(`${module.title} import failed`, error);
    } finally {
      setImporting(false);
    }
  };

  const downloadErrorRows = () => {
    const errorRows = rows.filter((row) => !row.valid);
    exportToExcel(
      `${module.key}-rows-to-fix`,
      errorRows,
      [
        { key: "rowNumber", header: "Excel Row", type: "number", value: (row) => row.rowNumber },
        ...module.fields.map((field) => ({ key: field.key, header: field.header, value: (row: DataPortRow) => row.values[field.key] ?? "" })),
        { key: "errors", header: "Problems", value: (row) => Object.values(row.validationErrors).join(" | ") }
      ],
      { title: `${module.title} — rows to fix`, totalRow: false }
    );
  };

  return (
    <div className="space-y-4 pb-6 md:space-y-5">
      <Header title={`${module.title} DataPort`} subtitle={module.description} />

      <GlassCard className="flex flex-col gap-5 p-4 md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <CommonBreadcrumb items={[{ label: "DataPort", to: "/data-port" }, { label: module.title }]} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void handleSampleDownload()} disabled={downloading}>
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {downloading ? "Downloading…" : "Download Sample"}
            </Button>
            <Button type="button" disabled={!module.canImport || uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? "Reading file…" : "Upload Excel"}
            </Button>
          </div>
        </div>

        <StepStrip step={step} />

        {!module.canImport ? (
          <Notice tone="info">You can view this page and download the sample. Importing needs the “Add” permission for {module.title} DataPort.</Notice>
        ) : null}

        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }} />

        <section
          className={clsx(
            "rounded-xl border-2 border-dashed p-5 transition md:p-6",
            dragActive
              ? "border-[var(--theme-color)] bg-[color:color-mix(in_srgb,var(--theme-color)_8%,white)]"
              : "border-slate-200 bg-slate-50/60"
          )}
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
            if (file && module.canImport) {
              void handleFile(file);
            }
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--theme-color)] shadow-sm ring-1 ring-slate-200">
                <FileSpreadsheet size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Drop your filled sample file here</p>
                <p className="mt-1 text-sm text-slate-500">
                  Excel (.xlsx) · first sheet only · keep the header row unchanged · up to 5,000 rows
                </p>
                {fileName ? (
                  <p className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    <FileSpreadsheet size={13} /> {fileName}
                  </p>
                ) : null}
              </div>
            </div>
            <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={!module.canImport || uploading}>
              Choose File
            </Button>
          </div>
        </section>

        <ColumnGuide module={module} open={guideOpen} onToggle={() => setGuideOpen((open) => !open)} />

        <div className="grid gap-3 sm:grid-cols-3">
          <CountTile label="Rows in file" value={counts.total} tone="default" active={filter === "all"} onClick={() => setFilter("all")} />
          <CountTile label="Ready to import" value={counts.valid} tone="success" active={filter === "valid"} onClick={() => setFilter("valid")} />
          <CountTile label="Need attention" value={counts.errors} tone="danger" active={filter === "errors"} onClick={() => setFilter("errors")} />
        </div>

        {result ? <ResultPanel result={result} title={module.title} /> : null}

        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                Preview &amp; fix
                {checking ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                    <Loader2 size={12} className="animate-spin" /> checking…
                  </span>
                ) : null}
              </h3>
              <p className="mt-1 text-sm text-slate-500">Edit any cell — rows are re-checked automatically. Only rows marked ready are imported.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" variant="secondary" disabled={!counts.errors} onClick={downloadErrorRows}>
                <Download size={16} /> Rows to fix
              </Button>
              <Button type="button" variant="secondary" disabled={!rows.length || checking} onClick={() => void runRevalidate(rows)}>
                <RefreshCw size={16} /> Re-check
              </Button>
              <Button type="button" variant="ghost" disabled={!rows.length} onClick={clearAll}>
                Clear
              </Button>
              <Button type="button" disabled={!canImport} onClick={() => setConfirmOpen(true)}>
                {importing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Import {counts.valid ? `${counts.valid} row${counts.valid === 1 ? "" : "s"}` : ""}
              </Button>
            </div>
          </div>

          <div className="scrollbar-thin max-h-[62vh] overflow-auto">
            <table className="w-full border-separate border-spacing-0 text-left text-sm text-slate-700">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  {/* Row + Status sticky: lambe module (invoice) me side-scroll par bhi pata rahe kaunsi row hai. */}
                  <Th className="sticky left-0 z-20 w-14 min-w-[56px] bg-slate-50">Row</Th>
                  <Th className="sticky left-14 z-20 w-28 min-w-[112px] bg-slate-50 shadow-[1px_0_0_#e2e8f0]">Status</Th>
                  {module.fields.map((field) => (
                    <Th key={field.key} title={field.hint ?? undefined}>
                      {field.header}
                      {field.required ? <span className="ml-0.5 text-rose-500">*</span> : null}
                    </Th>
                  ))}
                  <Th className="w-14 text-right"> </Th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={module.fields.length + 3} className="px-6 py-16 text-center">
                      <EmptyState hasRows={rows.length > 0} filter={filter} />
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    // Solid rang (opacity nahi) — sticky cells ke neeche scroll hoti cells na jhaanken.
                    const rowBg = !row.valid ? "bg-rose-50" : groupShade.get(row.rowNumber) ? "bg-slate-50" : "bg-white";
                    return (
                    <tr key={row.rowNumber} className={rowBg}>
                      <Td className={clsx("sticky left-0 z-10 font-semibold text-slate-400", rowBg)}>{row.rowNumber}</Td>
                      <Td className={clsx("sticky left-14 z-10 shadow-[1px_0_0_#e2e8f0]", rowBg)}>
                        <RowStatus row={row} />
                      </Td>
                      {module.fields.map((field) => (
                        <Td key={field.key}>
                          <CellEditor
                            field={field}
                            value={row.values[field.key] ?? ""}
                            error={row.validationErrors[field.key]}
                            disabled={!module.canImport}
                            onChange={(value) => updateCell(row.rowNumber, field.key, value)}
                          />
                        </Td>
                      ))}
                      <Td className="text-right">
                        <button
                          type="button"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => deleteRow(row.rowNumber)}
                          aria-label={`Remove row ${row.rowNumber}`}
                          title="Remove row"
                        >
                          <Trash2 size={16} />
                        </button>
                      </Td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <OtherModules modules={modules} current={module.key} />
      </GlassCard>

      <Modal open={confirmOpen} title={`Import ${module.title}`} eyebrow="DataPort" onClose={() => !importing && setConfirmOpen(false)} maxWidthClass="max-w-lg">
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            {counts.valid} ready row{counts.valid === 1 ? "" : "s"} will be saved using the same rules as the {module.title} screen.
            {counts.errors ? ` ${counts.errors} row(s) with problems will be skipped.` : ""}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <MiniStat label="Rows" value={counts.total} />
            <MiniStat label="Importing" value={counts.valid} tone="success" />
            <MiniStat label="Skipped" value={counts.errors} tone="danger" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)} disabled={importing}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleImport()} disabled={!counts.valid || importing}>
              {importing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {importing ? "Importing…" : "Yes, import"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const StepStrip = ({ step }: { step: number }) => {
  const steps = ["Download sample", "Upload & fix", "Import"];
  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((label, index) => {
        const number = index + 1;
        const done = number < step;
        const current = number === step;
        return (
          <li
            key={label}
            className={clsx(
              "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold sm:text-sm",
              current ? "border-[var(--theme-color)] bg-[color:color-mix(in_srgb,var(--theme-color)_8%,white)] text-slate-900" : "border-slate-200 text-slate-500"
            )}
          >
            <span
              className={clsx(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                done ? "bg-emerald-500 text-white" : current ? "bg-[var(--theme-color)] text-white" : "bg-slate-100 text-slate-500"
              )}
            >
              {done ? <CheckCircle2 size={14} /> : number}
            </span>
            <span className="truncate">{label}</span>
          </li>
        );
      })}
    </ol>
  );
};

const ColumnGuide = ({ module, open, onToggle }: { module: DataPortModuleMeta; open: boolean; onToggle: () => void }) => (
  <section className="rounded-xl border border-slate-200">
    <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Info size={16} className="text-[var(--theme-color)]" />
        Column guide · {module.fields.length} columns · <span className="text-rose-500">*</span> required
      </span>
      <ChevronDown size={16} className={clsx("text-slate-400 transition", open && "rotate-180")} />
    </button>
    {open ? (
      <div className="space-y-3 border-t border-slate-100 px-4 py-3">
        {module.notes.length ? (
          <ul className="space-y-1 text-sm text-slate-600">
            {module.notes.map((note) => (
              <li key={note} className="flex gap-2"><ArrowRight size={14} className="mt-0.5 shrink-0 text-[var(--theme-color)]" />{note}</li>
            ))}
          </ul>
        ) : null}
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {module.fields.map((field) => (
            <div key={field.key} className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-800">
                {field.header}
                {field.required ? <span className="ml-0.5 text-rose-500">*</span> : null}
                <span className="ml-2 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 ring-1 ring-slate-200">
                  {typeLabel(field)}
                </span>
              </p>
              {field.hint ? <p className="mt-1 text-xs text-slate-500">{field.hint}</p> : null}
            </div>
          ))}
        </div>
      </div>
    ) : null}
  </section>
);

const typeLabel = (field: DataPortField) => {
  switch (field.type) {
    case "NUMBER":
      return "whole no.";
    case "DECIMAL":
      return "number";
    case "DATE":
      return "dd-mm-yyyy";
    case "BOOLEAN":
      return "yes / no";
    case "CHOICE":
      return "list";
    default:
      return "text";
  }
};

const CellEditor = ({
  field,
  value,
  error,
  disabled,
  onChange
}: {
  field: DataPortField;
  value: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) => {
  const options = field.type === "BOOLEAN" ? ["Yes", "No"] : field.type === "CHOICE" ? field.options : null;
  return (
    <div className="min-w-[150px]">
      {options ? (
        <Select
          density="sm"
          placeholder={null}
          disabled={disabled}
          aria-label={field.header}
          options={[{ label: field.required ? "Select" : "—", value: "" }, ...options.map((option) => ({ label: option, value: option }))]}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value}
          disabled={disabled}
          aria-label={field.header}
          inputMode={field.type === "NUMBER" ? "numeric" : field.type === "DECIMAL" ? "decimal" : undefined}
          placeholder={field.type === "DATE" ? "dd-mm-yyyy" : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={clsx(
            "w-full rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-[var(--theme-color)] disabled:bg-slate-50",
            error ? "border-rose-300" : "border-slate-200"
          )}
        />
      )}
      {error ? <p className="mt-1 max-w-[260px] text-xs font-medium leading-snug text-rose-600">{error}</p> : null}
    </div>
  );
};

const RowStatus = ({ row }: { row: DataPortRow }) => {
  const importError = row.validationErrors._import;
  if (row.valid) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <CheckCircle2 size={13} /> Ready
      </span>
    );
  }
  const messages = Object.entries(row.validationErrors).filter(([key]) => key !== "_import").map(([, message]) => message);
  return (
    <div className="space-y-1">
      {/* Side-scroll par cell ka error chhup jata hai: ginti + hover par saari wajah yahin. */}
      <span
        title={messages.join("\n") || importError}
        className="inline-flex cursor-help items-center gap-1 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200"
      >
        <XCircle size={13} /> {importError ? "Not saved" : `${messages.length} issue${messages.length === 1 ? "" : "s"}`}
      </span>
      {importError ? <p className="max-w-[220px] text-xs text-rose-600">{importError}</p> : null}
    </div>
  );
};

const CountTile = ({
  label,
  value,
  tone,
  active,
  onClick
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "danger";
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      "rounded-xl border p-4 text-left transition hover:shadow-sm",
      tone === "success" && "border-emerald-200 bg-emerald-50/70 text-emerald-800",
      tone === "danger" && "border-rose-200 bg-rose-50/70 text-rose-800",
      tone === "default" && "border-slate-200 bg-white text-slate-800",
      // Active filter ka ring tile ke apne rang me (theme laal ho to "Rows" error jaisa dikhta tha).
      active && "ring-2 ring-offset-1",
      active && (tone === "success" ? "ring-emerald-400" : tone === "danger" ? "ring-rose-400" : "ring-slate-400")
    )}
  >
    <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
    <p className="mt-1 text-2xl font-bold">{value.toLocaleString("en-IN")}</p>
  </button>
);

const ResultPanel = ({ result, title }: { result: ImportResult; title: string }) => (
  <section
    className={clsx(
      "flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between",
      result.failedRecords ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"
    )}
  >
    <div className="flex items-center gap-3">
      {result.failedRecords ? <AlertTriangle className="text-amber-600" size={22} /> : <CheckCircle2 className="text-emerald-600" size={22} />}
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {result.importedRecords} row{result.importedRecords === 1 ? "" : "s"} imported into {title}
        </p>
        <p className="text-xs text-slate-600">
          {result.failedRecords ? `${result.failedRecords} row(s) were not imported — they are listed below to fix and import again.` : "Everything was imported."}
        </p>
      </div>
    </div>
  </section>
);

const MiniStat = ({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" }) => (
  <div className={clsx("rounded-lg border p-3", tone === "success" ? "border-emerald-200 bg-emerald-50" : tone === "danger" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50")}>
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
  </div>
);

const EmptyState = ({ hasRows, filter }: { hasRows: boolean; filter: RowFilter }) => (
  <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-slate-500">
    <FileSpreadsheet size={28} className="text-slate-300" />
    {hasRows ? (
      <p className="text-sm">{filter === "errors" ? "No rows need attention." : "No rows are ready yet."}</p>
    ) : (
      <>
        <p className="text-sm font-semibold text-slate-700">No file uploaded yet</p>
        <p className="text-sm">Download the sample, fill it in Excel and upload it. You can fix mistakes right here before importing.</p>
      </>
    )}
  </div>
);

const Notice = ({ tone, children }: { tone: "info"; children: React.ReactNode }) => (
  <div className={clsx("flex items-start gap-2 rounded-xl border px-4 py-3 text-sm", tone === "info" && "border-sky-200 bg-sky-50 text-sky-800")}>
    <Info size={16} className="mt-0.5 shrink-0" />
    <span>{children}</span>
  </div>
);

const OtherModules = ({ modules, current }: { modules: DataPortModuleMeta[]; current: string }) => {
  const others = modules.filter((item) => item.key !== current);
  if (!others.length) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm">
      <span className="font-semibold text-slate-500">Other imports:</span>
      {others.map((item) => (
        <Link
          key={item.key}
          to={`/data-port/${item.key}`}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[var(--theme-color)] hover:text-[var(--theme-color)]"
        >
          {item.title}
        </Link>
      ))}
    </div>
  );
};

const Th = ({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) => (
  <th title={title} className={clsx("whitespace-nowrap border-b border-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500", className)}>
    {children}
  </th>
);

const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={clsx("border-b border-slate-100 px-3 py-2.5 align-top", className)}>{children}</td>
);
