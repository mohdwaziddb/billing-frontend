import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Plus, Trash2 } from "lucide-react";
import { createPurchase, deletePurchase, getPurchase, getPurchasesPage } from "../api/purchases";
import { getProducts } from "../api/products";
import { ActionDropdown } from "../components/ActionDropdown";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { Table } from "../components/Table";
import { useApiMessage } from "../hooks/useApiFeedback";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { formatDate } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { PageResponse, Product, Purchase, PurchaseRequest } from "../types/api";

const emptyPage: PageResponse<Purchase> = { records: [], page: 0, size: DEFAULT_PAGE_SIZE, totalRecords: 0, totalPages: 0 };
const emptyLine = { productId: "", qty: "1", purchaseRate: "", sellingRate: "" };
const defaultSupplierName = "Opening Balance";

export const PurchaseListPage = () => {
  const { setApiError, clearMessage } = useApiMessage();
  const [purchasePage, setPurchasePage] = useState<PageResponse<Purchase>>(emptyPage);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [activeFilter, setActiveFilter] = useState("true");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Purchase | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    purchaseDate: new Date().toISOString().slice(0, 10),
    supplierName: defaultSupplierName,
    remarks: "",
    items: [emptyLine]
  });

  const loadPage = async (nextPage = page, nextActiveFilter = activeFilter, searchValue = search, nextStartDate = startDate, nextEndDate = endDate) => {
    const response = await getPurchasesPage({
      page: nextPage,
      size: DEFAULT_PAGE_SIZE,
      active: nextActiveFilter === "all" ? undefined : nextActiveFilter === "true",
      search: searchValue.trim() || undefined,
      startDate: nextStartDate || undefined,
      endDate: nextEndDate || undefined
    });
    setPurchasePage(response);
  };

  useEffect(() => {
    void loadPage(0).catch((err: any) => setApiError(err, "Unable to load purchases"));
    void getProducts({ active: true, size: 1000 })
      .then((productRows) => setProducts(productRows))
      .catch((err: any) => setApiError(err, "Unable to load products"));
  }, [setApiError]);

  useEffect(() => {
    setPage(0);
    void loadPage(0, activeFilter).catch((err: any) => setApiError(err, "Unable to load purchases"));
  }, [activeFilter, setApiError]);

  const canSubmit = useMemo(() => form.items.every((item) => item.productId && Number(item.qty) > 0 && Number(item.purchaseRate) >= 0 && Number(item.sellingRate) >= Number(item.purchaseRate)), [form.items]);
  const purchaseExportColumns = useMemo(() => ([
    { key: "purchaseNo", header: "Purchase No" },
    { key: "purchaseDate", header: "Purchase Date", type: "date" as const },
    { key: "supplierName", header: "Supplier", value: (row: Purchase) => row.supplierName ?? "--" },
    { key: "items", header: "Items", value: (row: Purchase) => row.items.length, type: "number" as const },
    { key: "totalAmount", header: "Amount", type: "amount" as const },
    { key: "remarks", header: "Remarks", value: (row: Purchase) => row.remarks ?? "--" }
  ]), []);

  const openView = async (purchaseId: number) => {
    clearMessage();
    try {
      const purchase = await getPurchase(purchaseId);
      setSelectedPurchase(purchase);
      setViewOpen(true);
    } catch (err: any) {
      setApiError(err, "Unable to load purchase details");
    }
  };

  const removePurchase = async () => {
    if (!deleteTarget) {
      return;
    }
    clearMessage();
    try {
      setDeleting(true);
      await deletePurchase(deleteTarget.id);
      notificationService.showSuccess("Purchase deleted successfully");
      if (selectedPurchase?.id === deleteTarget.id) {
        setViewOpen(false);
        setSelectedPurchase(null);
      }
      setDeleteTarget(null);
      await loadPage(page);
    } catch (err: any) {
      setApiError(err, "Unable to delete purchase");
    } finally {
      setDeleting(false);
    }
  };

  const submit = async () => {
    clearMessage();
    setSubmitting(true);
    try {
      const payload: PurchaseRequest = {
        purchaseDate: form.purchaseDate,
        supplierName: form.supplierName.trim() || undefined,
        remarks: form.remarks.trim() || undefined,
        items: form.items.map((item) => ({
          productId: Number(item.productId),
          qty: Number(item.qty),
          purchaseRate: Number(item.purchaseRate),
          sellingRate: Number(item.sellingRate)
        }))
      };
      await createPurchase(payload);
      notificationService.showSuccess(CommonSuccessMessageUtil.created("Purchase"));
      setOpen(false);
      setForm({ purchaseDate: new Date().toISOString().slice(0, 10), supplierName: defaultSupplierName, remarks: "", items: [emptyLine] });
      await loadPage(0);
    } catch (err: any) {
      setApiError(err, "Unable to save purchase");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title="Purchases" subtitle="Inventory replenishment always happens through purchases. Every purchase creates a new batch and ledger trail." />
      <GlassCard className="space-y-4 p-6 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CommonBreadcrumb items={[{ label: "Inventory" }, { label: "Purchases" }]} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={!purchasePage.records.length} onClick={() => exportToExcel("purchases.xlsx", purchasePage.records, purchaseExportColumns)}>
              <Download size={16} />
              Export Excel
            </Button>
            <Button type="button" onClick={() => setOpen(true)}>
              <Plus size={16} />
              New Purchase
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_170px_180px_180px_140px]">
          <Input value={search} label="Search Purchase" placeholder="Purchase no or supplier" onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              setPage(0);
              void loadPage(0);
            }
          }} />
          <Select
            label="Status"
            placeholder={null}
            options={[
              { label: "Active", value: "true" },
              { label: "Inactive", value: "false" },
              { label: "All", value: "all" }
            ]}
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
          />
          <Input label="From Date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <Input label="To Date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          <div className="flex items-end">
            <Button type="button" variant="secondary" className="w-full" onClick={() => { setPage(0); void loadPage(0); }}>Search</Button>
          </div>
        </div>
        <Table
          data={purchasePage.records}
          emptyText="No purchases recorded yet."
          columns={[
            { key: "purchaseNo", header: "Purchase No", render: (item) => item.purchaseNo },
            { key: "purchaseDate", header: "Purchase Date", render: (item) => formatDate(item.purchaseDate) },
            { key: "supplierName", header: "Supplier", render: (item) => item.supplierName ?? "--" },
            { key: "status", header: "Status", render: (item) => item.active ? "Active" : "Inactive" },
            { key: "items", header: "Items", className: "text-right", render: (item) => <span className="block text-right">{item.items.length} Item{item.items.length === 1 ? "" : "s"}</span> },
            { key: "subtotal", header: "Amount", className: "text-right", render: (item) => <span className="block text-right font-semibold">{formatCurrency(item.totalAmount)}</span> },
            {
              key: "actions",
              header: "Action",
              className: "text-right",
              render: (item) => (
                <ActionDropdown
                  actions={[
                    { label: "View", icon: <Eye size={15} />, onClick: () => void openView(item.id) },
                    ...(item.active ? [{ label: "Delete", icon: <Trash2 size={15} />, danger: true, onClick: () => setDeleteTarget(item) }] : [])
                  ]}
                />
              )
            }
          ]}
        />
        <Pagination page={purchasePage.page} size={purchasePage.size} totalRecords={purchasePage.totalRecords} totalPages={purchasePage.totalPages} onPageChange={(nextPage) => {
          setPage(nextPage);
          void loadPage(nextPage);
        }} />
      </GlassCard>

      <Modal open={open} title="New Purchase" onClose={() => !submitting && setOpen(false)} maxWidthClass="max-w-4xl">
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="Purchase Date" requiredMark type="date" value={form.purchaseDate} onChange={(event) => setForm((current) => ({ ...current, purchaseDate: event.target.value }))} />
            <Input label="Supplier Name" requiredMark value={form.supplierName} onChange={(event) => setForm((current) => ({ ...current, supplierName: event.target.value }))} />
            <Input label="Remarks" value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} />
          </div>
          <div className="space-y-3">
            {form.items.map((item, index) => (
              <div key={`purchase-item-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_90px_140px_140px_52px]">
                <Select
                  label="Product"
                  requiredMark
                  placeholder="Select Product"
                  options={[{ label: "Select Product", value: "" }, ...products.map((product) => ({ label: `${product.name} (${product.sku})`, value: String(product.id) }))]}
                  value={item.productId}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, productId: event.target.value } : row)
                  }))}
                />
                <Input label="Qty" requiredMark type="number" value={item.qty} onChange={(event) => setForm((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, qty: event.target.value } : row) }))} />
                <Input label="Purchase Rate" requiredMark type="number" step="0.01" value={item.purchaseRate} onChange={(event) => setForm((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, purchaseRate: event.target.value } : row) }))} />
                <Input label="Selling Rate" requiredMark type="number" step="0.01" value={item.sellingRate} onChange={(event) => setForm((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, sellingRate: event.target.value } : row) }))} />
                <div className="flex items-end">
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Remove line ${index + 1}`}
                    title="Remove line"
                    onClick={() => setForm((current) => ({ ...current, items: current.items.length === 1 ? [emptyLine] : current.items.filter((_, rowIndex) => rowIndex !== index) }))}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => setForm((current) => ({ ...current, items: [...current.items, emptyLine] }))}>Add More</Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" disabled={!canSubmit || submitting} onClick={() => void submit()}>{submitting ? "Saving..." : "Save Purchase"}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={viewOpen} title="Purchase Details" onClose={() => setViewOpen(false)} maxWidthClass="max-w-4xl">
        {selectedPurchase ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="Purchase No" value={selectedPurchase.purchaseNo} />
              <InfoCard label="Purchase Date" value={formatDate(selectedPurchase.purchaseDate)} />
              <InfoCard label="Supplier" value={selectedPurchase.supplierName ?? "--"} />
              <InfoCard label="Status" value={selectedPurchase.active ? "Active" : "Inactive"} />
              <InfoCard label="Amount" value={formatCurrency(selectedPurchase.totalAmount)} />
              <InfoCard label="Created By" value={selectedPurchase.createdBy ?? "--"} />
              <InfoCard label="Updated By" value={selectedPurchase.updatedBy ?? "--"} />
              <InfoCard label="Created By Ref" value={selectedPurchase.createdByRef ?? "--"} />
            </div>
            <GlassCard className="p-4">
              <Table
                data={selectedPurchase.items}
                emptyText="No purchase items found."
                columns={[
                  { key: "productName", header: "Product", render: (item) => item.productName },
                  { key: "qty", header: "Qty", className: "text-right", render: (item) => <span className="block text-right">{item.qty}</span> },
                  { key: "purchaseRate", header: "Purchase Rate", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.purchaseRate)}</span> },
                  { key: "sellingRate", header: "Selling Rate", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.sellingRate)}</span> },
                  { key: "batchNo", header: "Batch No", render: (item) => item.batchNo ?? "--" },
                  { key: "lineTotal", header: "Line Total", className: "text-right", render: (item) => <span className="block text-right font-semibold">{formatCurrency(item.lineTotal)}</span> }
                ]}
              />
            </GlassCard>
            {selectedPurchase.remarks ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remarks</p>
                <p className="mt-2 text-sm text-slate-700">{selectedPurchase.remarks}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <CommonDeleteModal
        open={Boolean(deleteTarget)}
        loading={deleting}
        title="Delete Purchase"
        description={deleteTarget ? `Do you want to delete purchase ${deleteTarget.purchaseNo}?` : "Do you want to delete this purchase?"}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => void removePurchase()}
      />
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
  </div>
);
