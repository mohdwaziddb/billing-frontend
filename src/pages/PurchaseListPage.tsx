import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Plus, Trash2 } from "lucide-react";
import { createPurchase, deletePurchase, getPurchase, getPurchasesPage } from "../api/purchases";
import { getProducts } from "../api/products";
import { ActionDropdown } from "../components/ActionDropdown";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { CommonListPage } from "../components/CommonListPage";
import { GlassCard } from "../components/GlassCard";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useAddEditForm } from "../hooks/useAddEditForm";
import { useApiMessage } from "../hooks/useApiFeedback";
import { useListPage } from "../hooks/useListPage";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { formatDate } from "../lib/format";
import type { Product, Purchase, PurchaseRequest } from "../types/api";

const emptyLine = { productId: "", qty: "1", purchaseRate: "", sellingRate: "" };
const defaultSupplierName = "Opening Balance";
const todayString = () => new Date().toISOString().slice(0, 10);

type PurchaseFilters = {
  search: string;
  status: string;
  startDate: string;
  endDate: string;
};

type FormState = {
  purchaseDate: string;
  supplierName: string;
  remarks: string;
  items: (typeof emptyLine)[];
};

const emptyFilters: PurchaseFilters = {
  search: "",
  status: "true",
  startDate: "",
  endDate: ""
};

const getEmptyForm = (): FormState => ({
  purchaseDate: todayString(),
  supplierName: defaultSupplierName,
  remarks: "",
  items: [{ ...emptyLine }]
});

const parseItems = (items: FormState["items"]) =>
  items.map((item) => ({
    productId: Number(item.productId),
    qty: Number(item.qty),
    purchaseRate: Number(item.purchaseRate),
    sellingRate: Number(item.sellingRate)
  }));

const isItemsValid = (items: FormState["items"]) => {
  const parsedItems = parseItems(items);
  return parsedItems.length > 0 && parsedItems.every(
    (item) => Number.isInteger(item.productId) && item.productId > 0
      && Number.isFinite(item.qty) && item.qty > 0 && Number.isInteger(item.qty)
      && Number.isFinite(item.purchaseRate) && item.purchaseRate >= 0
      && Number.isFinite(item.sellingRate) && item.sellingRate >= item.purchaseRate
  );
};

export const PurchaseListPage = () => {
  const { can } = useAuth();
  const { setApiError, clearMessage } = useApiMessage();
  const [products, setProducts] = useState<Product[]>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const purchaseExportColumns = useMemo(() => ([
    { key: "purchaseNo", header: "Purchase No" },
    { key: "purchaseDate", header: "Purchase Date", type: "date" as const },
    { key: "supplierName", header: "Supplier", value: (row: Purchase) => row.supplierName ?? "--" },
    { key: "items", header: "Items", value: (row: Purchase) => row.items.length, type: "number" as const },
    { key: "totalAmount", header: "Amount", type: "amount" as const },
    { key: "remarks", header: "Remarks", value: (row: Purchase) => row.remarks ?? "--" }
  ]), []);

  const list = useListPage<Purchase, PurchaseFilters>({
    initialFilters: emptyFilters,
    errorMessage: "Unable to load purchases",
    fetchPage: ({ page, size, search, filters }) =>
      getPurchasesPage({
        page,
        size,
        active: filters.status === "all" ? undefined : filters.status === "true",
        search: search.trim() || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      })
  });

  useEffect(() => {
    void getProducts({ active: true, size: 1000 })
      .then((productRows) => setProducts(productRows))
      .catch((err: any) => setApiError(err, "Unable to load products"));
  }, [setApiError]);

  const form = useAddEditForm<Purchase, FormState, PurchaseRequest>({
    emptyForm: getEmptyForm(),
    entityName: "Purchase",
    errorMessage: "Unable to save purchase",
    toFormValues: (purchase) => ({
      purchaseDate: purchase.purchaseDate,
      supplierName: purchase.supplierName ?? defaultSupplierName,
      remarks: purchase.remarks ?? "",
      items: purchase.items.map((item) => ({
        productId: String(item.productId),
        qty: String(item.qty),
        purchaseRate: String(item.purchaseRate),
        sellingRate: String(item.sellingRate)
      }))
    }),
    validate: (values) => {
      if (!values.purchaseDate || !isItemsValid(values.items)) {
        return "Enter a valid date, product, whole quantity and rates (selling >= purchase) for every item.";
      }
      return null;
    },
    buildRequest: (values) => ({
      purchaseDate: values.purchaseDate,
      supplierName: values.supplierName.trim() || undefined,
      remarks: values.remarks.trim() || undefined,
      items: parseItems(values.items)
    }),
    create: createPurchase,
    update: (_id, _payload) => Promise.reject(new Error("Purchase update is not supported")),
    remove: deletePurchase,
    onSaved: ({ wasEditing, wasDelete, deletedId }) => {
      if (wasDelete && selectedPurchase?.id === deletedId) {
        setViewOpen(false);
        setSelectedPurchase(null);
      }
      if (wasEditing || wasDelete) {
        list.refreshTable();
      } else {
        list.goToPage(0);
      }
    }
  });

  const canSubmit = useMemo(() => form.formValues.items.every((item) => item.productId && Number(item.qty) > 0 && Number(item.purchaseRate) >= 0 && Number(item.sellingRate) >= Number(item.purchaseRate)), [form.formValues.items]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const purchaseColumns = useMemo(() => [
    { key: "purchaseNo", header: "Purchase No", render: (item: Purchase) => item.purchaseNo },
    { key: "purchaseDate", header: "Purchase Date", render: (item: Purchase) => formatDate(item.purchaseDate) },
    { key: "supplierName", header: "Supplier", render: (item: Purchase) => item.supplierName ?? "--" },
    { key: "status", header: "Status", render: (item: Purchase) => item.active ? "Active" : "Inactive" },
    { key: "items", header: "Items", className: "text-right", render: (item: Purchase) => <span className="block text-right">{item.items.length} Item{item.items.length === 1 ? "" : "s"}</span> },
    { key: "subtotal", header: "Amount", className: "text-right", render: (item: Purchase) => <span className="block text-right font-semibold">{formatCurrency(item.totalAmount)}</span> }
  ], []);
  const visiblePurchaseColumns = useMemo(() => applyVisibleColumns(purchaseColumns, visibleColumns), [purchaseColumns, visibleColumns]);

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

  return (
    <CommonListPage<Purchase, PurchaseFilters>
      pageTitle="Purchases"
      pageSubtitle="Inventory replenishment always happens through purchases. Every purchase creates a new batch and ledger trail."
      list={list}
      searchPlaceholder="Search Purchase"
      activeFilterCount={(filters) => (filters.status !== "true" ? 1 : 0) + (filters.startDate ? 1 : 0) + (filters.endDate ? 1 : 0)}
      filterFields={
        <>
          <Select
            label="Status"
            placeholder={null}
            options={[
              { label: "Active", value: "true" },
              { label: "Inactive", value: "false" },
              { label: "All", value: "all" }
            ]}
            value={list.formFilters.status}
            onChange={(event) => list.updateFormFilters({ status: event.target.value })}
          />
          <Input label="From Date" type="date" value={list.formFilters.startDate} onChange={(event) => list.updateFormFilters({ startDate: event.target.value })} />
          <Input label="To Date" type="date" value={list.formFilters.endDate} onChange={(event) => list.updateFormFilters({ endDate: event.target.value })} />
        </>
      }
      toolbarButtons={
        <>
          <Button type="button" variant="secondary" disabled={!list.tableData.length} onClick={() => exportToExcel("purchases.xlsx", list.tableData, purchaseExportColumns)}>
            <Download size={16} />
            Export Excel
          </Button>
          <Button type="button" onClick={() => form.openAddForm(getEmptyForm())}>
            <Plus size={16} />
            New Purchase
          </Button>
        </>
      }
      columnSelector={{ tableName: "PURCHASES", columns: purchaseColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["purchaseNo"] }}
      tableColumns={[
        ...visiblePurchaseColumns,
        {
          key: "actions",
          header: "Action",
          className: "text-right",
          render: (item: Purchase) => (
            <ActionDropdown
              actions={[
                { label: "View", icon: <Eye size={15} />, onClick: () => void openView(item.id) },
                ...(item.active && can("PURCHASES", "DELETE") ? [{ label: "Delete", icon: <Trash2 size={15} />, danger: true, onClick: () => form.askDelete(item) }] : [])
              ]}
            />
          )
        }
      ]}
      emptyMessage="No purchases recorded yet."
      modals={
        <>
          <Modal open={form.formOpen} title="New Purchase" onClose={() => { if (!form.saving) form.closeForm(); }} maxWidthClass="max-w-4xl">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Input label="Purchase Date" requiredMark type="date" value={form.formValues.purchaseDate} onChange={(event) => form.setFormValues((current) => ({ ...current, purchaseDate: event.target.value }))} />
                <Input label="Supplier Name" requiredMark value={form.formValues.supplierName} onChange={(event) => form.setFormValues((current) => ({ ...current, supplierName: event.target.value }))} />
                <Input label="Remarks" value={form.formValues.remarks} onChange={(event) => form.setFormValues((current) => ({ ...current, remarks: event.target.value }))} />
              </div>
              <div className="space-y-3">
                {form.formValues.items.map((item, index) => (
                  <div key={`purchase-item-${index}`} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_90px_140px_140px_52px]">
                    <Select
                      label="Product"
                      requiredMark
                      placeholder="Select Product"
                      options={[{ label: "Select Product", value: "" }, ...products.map((product) => ({ label: `${product.name} (${product.sku})`, value: String(product.id) }))]}
                      value={item.productId}
                      onChange={(event) => form.setFormValues((current) => ({
                        ...current,
                        items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, productId: event.target.value } : row)
                      }))}
                    />
                    <Input label="Qty" requiredMark type="number" value={item.qty} onChange={(event) => form.setFormValues((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, qty: event.target.value } : row) }))} />
                    <Input label="Purchase Rate" requiredMark type="number" step="0.01" value={item.purchaseRate} onChange={(event) => form.setFormValues((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, purchaseRate: event.target.value } : row) }))} />
                    <Input label="Selling Rate" requiredMark type="number" step="0.01" value={item.sellingRate} onChange={(event) => form.setFormValues((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, sellingRate: event.target.value } : row) }))} />
                    <div className="flex items-end">
                      <button
                        type="button"
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label={`Remove line ${index + 1}`}
                        title="Remove line"
                        onClick={() => form.setFormValues((current) => ({ ...current, items: current.items.length === 1 ? [{ ...emptyLine }] : current.items.filter((_, rowIndex) => rowIndex !== index) }))}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => form.setFormValues((current) => ({ ...current, items: [...current.items, { ...emptyLine }] }))}>Add More</Button>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={form.closeForm}>Cancel</Button>
                <Button type="button" disabled={!canSubmit || form.saving} onClick={() => void form.saveForm()}>{form.saving ? "Saving..." : "Save Purchase"}</Button>
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
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remarks</p>
                    <p className="mt-2 text-sm text-slate-700">{selectedPurchase.remarks}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Modal>

          <CommonDeleteModal
            open={Boolean(form.deleteTarget)}
            loading={form.deleting}
            title="Delete Purchase"
            description={form.deleteTarget ? `Do you want to delete purchase ${form.deleteTarget.purchaseNo}?` : "Do you want to delete this purchase?"}
            onCancel={form.cancelDelete}
            onConfirm={() => void form.confirmDelete()}
          />
        </>
      }
    />
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
  </div>
);
