import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { getInventoryLedgerPage } from "../api/inventory";
import { getProducts } from "../api/products";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonListPage } from "../components/CommonListPage";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useApiMessage } from "../hooks/useApiFeedback";
import { useListPage } from "../hooks/useListPage";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { formatDate } from "../lib/format";
import type { InventoryLedgerEntry, Product } from "../types/api";

type LedgerFilters = {
  search: string;
  productId: string;
  startDate: string;
  endDate: string;
};

const emptyFilters: LedgerFilters = {
  search: "",
  productId: "",
  startDate: "",
  endDate: ""
};

export const StockLedgerPage = () => {
  const { setApiError } = useApiMessage();
  const [products, setProducts] = useState<Product[]>([]);
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

  const list = useListPage<InventoryLedgerEntry, LedgerFilters>({
    initialFilters: emptyFilters,
    errorMessage: "Unable to load stock ledger",
    fetchPage: ({ page, size, search, filters }) =>
      getInventoryLedgerPage({
        page,
        size,
        search: search.trim() || undefined,
        productId: filters.productId ? Number(filters.productId) : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      })
  });

  useEffect(() => {
    void getProducts({ active: true, size: 1000 })
      .then(setProducts)
      .catch((err: any) => setApiError(err, "Unable to load stock ledger"));
  }, [setApiError]);

  // 1000 products tak ka options array har render par dobara na bane.
  const productOptions = useMemo(
    () => [{ label: "All Products", value: "" }, ...products.map((product) => ({ label: `${product.name} (${product.sku})`, value: String(product.id) }))],
    [products]
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const ledgerColumns = useMemo(() => [
    { key: "date", header: "Entry Date", render: (item: InventoryLedgerEntry) => formatDate(item.entryDate) },
    { key: "type", header: "Movement", render: (item: InventoryLedgerEntry) => item.movementType.replace(/_/g, " ") },
    { key: "product", header: "Product", render: (item: InventoryLedgerEntry) => item.productName },
    { key: "batch", header: "Batch", render: (item: InventoryLedgerEntry) => item.batchNo ?? "--" },
    { key: "reference", header: "Reference", render: (item: InventoryLedgerEntry) => item.referenceNo ?? "--" },
    { key: "qtyIn", header: "Qty In", className: "text-right", render: (item: InventoryLedgerEntry) => <span className="block text-right text-emerald-400">{item.qtyIn}</span> },
    { key: "qtyOut", header: "Qty Out", className: "text-right", render: (item: InventoryLedgerEntry) => <span className="block text-right text-rose-300">{item.qtyOut}</span> },
    { key: "balanceAfter", header: "Balance", className: "text-right", render: (item: InventoryLedgerEntry) => <span className="block text-right font-semibold">{item.balanceAfter}</span> },
    { key: "unitCost", header: "Unit Cost", className: "text-right", render: (item: InventoryLedgerEntry) => <span className="block text-right">{formatCurrency(item.unitCost)}</span> }
  ], []);
  const visibleLedgerColumns = useMemo(() => applyVisibleColumns(ledgerColumns, visibleColumns), [ledgerColumns, visibleColumns]);

  return (
    <CommonListPage<InventoryLedgerEntry, LedgerFilters>
      pageTitle="Stock Ledger"
      pageSubtitle="Complete inventory trail across purchases, FIFO sales allocations, and reversals."
      list={list}
      searchPlaceholder="Search Ledger"
      activeFilterCount={(filters) => (filters.productId ? 1 : 0) + (filters.startDate ? 1 : 0) + (filters.endDate ? 1 : 0)}
      filterFields={
        <>
          <Select
            label="Product"
            placeholder={null}
            value={list.formFilters.productId}
            onChange={(event) => list.updateFormFilters({ productId: event.target.value })}
            options={productOptions}
          />
          <Input label="From Date" type="date" value={list.formFilters.startDate} onChange={(event) => list.updateFormFilters({ startDate: event.target.value })} />
          <Input label="To Date" type="date" value={list.formFilters.endDate} onChange={(event) => list.updateFormFilters({ endDate: event.target.value })} />
        </>
      }
      toolbarButtons={
        <Button type="button" variant="secondary" disabled={!list.tableData.length} onClick={() => exportToExcel("stock-ledger.xlsx", list.tableData, ledgerExportColumns)}>
          <Download size={16} />
          Export Excel
        </Button>
      }
      columnSelector={{ tableName: "STOCK_LEDGER", columns: ledgerColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["date"] }}
      tableColumns={visibleLedgerColumns}
      emptyMessage="No inventory ledger entries found."
    />
  );
};
