import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { getInventoryLedgerPage } from "../api/inventory";
import { getProducts } from "../api/products";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { Table } from "../components/Table";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { formatDate } from "../lib/format";
import type { InventoryLedgerEntry, PageResponse, Product } from "../types/api";

const emptyPage: PageResponse<InventoryLedgerEntry> = { records: [], page: 0, size: DEFAULT_PAGE_SIZE, totalRecords: 0, totalPages: 0 };

export const StockLedgerPage = () => {
  const { setApiError } = useApiMessage();
  const [ledgerPage, setLedgerPage] = useState<PageResponse<InventoryLedgerEntry>>(emptyPage);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const ledgerExportColumns = useMemo(() => ([
    { key: "entryDate", header: "Entry Date", type: "date" as const },
    { key: "movementType", header: "Movement", value: (row: InventoryLedgerEntry) => row.movementType.replace(/_/g, " ") },
    { key: "productName", header: "Product" },
    { key: "batchNo", header: "Batch", value: (row: InventoryLedgerEntry) => row.batchNo ?? "--" },
    { key: "referenceNo", header: "Reference", value: (row: InventoryLedgerEntry) => row.referenceNo ?? "--" },
    { key: "qtyIn", header: "Qty In", type: "number" as const },
    { key: "qtyOut", header: "Qty Out", type: "number" as const },
    { key: "balanceAfter", header: "Balance", type: "number" as const },
    { key: "unitCost", header: "Unit Cost", type: "amount" as const },
    { key: "remarks", header: "Remarks", value: (row: InventoryLedgerEntry) => row.remarks ?? "--" }
  ]), []);

  const loadPage = async (nextPage = page) => {
    const response = await getInventoryLedgerPage({
      page: nextPage,
      size: DEFAULT_PAGE_SIZE,
      search: search.trim() || undefined,
      productId: productId ? Number(productId) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    });
    setLedgerPage(response);
  };

  useEffect(() => {
    void Promise.all([loadPage(0), getProducts({ active: true, size: 1000 })])
      .then(([, productRows]) => setProducts(productRows))
      .catch((err: any) => setApiError(err, "Unable to load stock ledger"));
  }, [setApiError]);

  return (
    <div className="space-y-4 pb-6">
      <Header title="Stock Ledger" subtitle="Complete inventory trail across purchases, FIFO sales allocations, and reversals." />
      <GlassCard className="space-y-4 p-6 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CommonBreadcrumb items={[{ label: "Inventory" }, { label: "Stock Ledger" }]} />
          <Button type="button" variant="secondary" disabled={!ledgerPage.records.length} onClick={() => exportToExcel("stock-ledger.xlsx", ledgerPage.records, ledgerExportColumns)}>
            <Download size={16} />
            Export Excel
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_260px_180px_180px_140px]">
          <Input label="Search Ledger" placeholder="Product, reference no, remarks, or date" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              setPage(0);
              void loadPage(0);
            }
          }} />
          <Select
            label="Product"
            placeholder={null}
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            options={[{ label: "All Products", value: "" }, ...products.map((product) => ({ label: `${product.name} (${product.sku})`, value: String(product.id) }))]}
          />
          <Input label="From Date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <Input label="To Date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          <div className="flex items-end">
            <button type="button" className="btn-secondary h-11 w-full rounded-2xl" onClick={() => { setPage(0); void loadPage(0); }}>Search</button>
          </div>
        </div>
        <Table
          data={ledgerPage.records}
          emptyText="No inventory ledger entries found."
          columns={[
            { key: "date", header: "Entry Date", render: (item) => formatDate(item.entryDate) },
            { key: "type", header: "Movement", render: (item) => item.movementType.replace(/_/g, " ") },
            { key: "product", header: "Product", render: (item) => item.productName },
            { key: "batch", header: "Batch", render: (item) => item.batchNo ?? "--" },
            { key: "reference", header: "Reference", render: (item) => item.referenceNo ?? "--" },
            { key: "qtyIn", header: "Qty In", className: "text-right", render: (item) => <span className="block text-right text-emerald-400">{item.qtyIn}</span> },
            { key: "qtyOut", header: "Qty Out", className: "text-right", render: (item) => <span className="block text-right text-rose-300">{item.qtyOut}</span> },
            { key: "balanceAfter", header: "Balance", className: "text-right", render: (item) => <span className="block text-right font-semibold">{item.balanceAfter}</span> },
            { key: "unitCost", header: "Unit Cost", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.unitCost)}</span> }
          ]}
        />
        <Pagination page={ledgerPage.page} size={ledgerPage.size} totalRecords={ledgerPage.totalRecords} totalPages={ledgerPage.totalPages} onPageChange={(nextPage) => {
          setPage(nextPage);
          void loadPage(nextPage);
        }} />
      </GlassCard>
    </div>
  );
};
