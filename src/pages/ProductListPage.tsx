import { useEffect, useMemo, useState } from "react";
import { Download, Eye, History, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import { getProductCategories } from "../api/productCategories";
import { getProductSubCategories } from "../api/productSubCategories";
import { deleteProduct, deleteProductsBulk, getProductsPage } from "../api/products";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { DataPortLink } from "../components/DataPortLink";
import { CommonListPage } from "../components/CommonListPage";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { CommonBulkActionToolbar } from "../components/CommonBulkActionToolbar";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { useBulkSelection } from "../hooks/useBulkSelection";
import { useListPage } from "../hooks/useListPage";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { notificationService } from "../services/notificationService";
import type { Product, ProductCategory, ProductSubCategory } from "../types/api";

type ProductFilters = {
  search: string;
  categoryId: string;
  subCategoryId: string;
  status: string;
};

const emptyFilters: ProductFilters = {
  search: "",
  categoryId: "",
  subCategoryId: "",
  status: "active"
};

export const ProductListPage = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subCategories, setSubCategories] = useState<ProductSubCategory[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [logTarget, setLogTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const { can } = useAuth();
  const { clearMessage, setApiError } = useApiMessage();

  const list = useListPage<Product, ProductFilters>({
    initialFilters: emptyFilters,
    errorMessage: "Unable to load products",
    fetchPage: ({ page, size, search, filters }) =>
      getProductsPage({
        search: search.trim() || undefined,
        active: filters.status === "active" ? true : filters.status === "inactive" ? false : undefined,
        categoryId: filters.categoryId ? Number(filters.categoryId) : undefined,
        subCategoryId: filters.subCategoryId ? Number(filters.subCategoryId) : undefined,
        page,
        size
      })
  });

  const bulkSelection = useBulkSelection<Product>(list.tableData);

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      setDeleting(true);
      clearMessage();
      await deleteProduct(deleteTarget.id);
      list.refreshTable();
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Product"));
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    // Inactive products pehle se deleted (soft) hain — sirf active wale bhejo.
    const activeIds = new Set(list.tableData.filter((product) => product.active).map((product) => product.id));
    const idsToDelete = bulkSelection.selectedIds.filter((id) => activeIds.has(id));
    if (!idsToDelete.length) {
      notificationService.showError("Selected products are already inactive.");
      setBulkDeleteOpen(false);
      return;
    }
    try {
      setDeleting(true);
      clearMessage();
      const resp = await deleteProductsBulk(idsToDelete);
      list.refreshTable();
      bulkSelection.clearSelection();
      setBulkDeleteOpen(false);
      const message = `${resp.deleted} products deleted successfully${resp.failed ? `, ${resp.failed} failed` : ""}`;
      if (resp.failed && resp.failed > 0) {
        notificationService.showError(message);
      } else {
        notificationService.showSuccess(message);
      }
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    void getProductCategories({ active: true, size: 1000 })
      .then((categoryData) => setCategories(categoryData.filter((category) => category.active)))
      .catch((err: any) => setApiError(err, "Unable to load product categories"));
  }, [setApiError]);

  useEffect(() => {
    if (!list.formFilters.categoryId) {
      setSubCategories([]);
      return;
    }
    void getProductSubCategories({ active: true, categoryId: Number(list.formFilters.categoryId), size: 1000 })
      .then((subCategoryData) => setSubCategories(subCategoryData.filter((subCategory) => subCategory.active)))
      .catch((err: any) => setApiError(err, "Unable to load product sub categories"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.formFilters.categoryId, setApiError]);

  const productColumns = useMemo(() => [
    {
      key: "product",
      header: "Product Name",
      render: (item: Product) => (
        <div className="min-w-[180px]">
          <Link to={`/products/${item.id}`} className="font-semibold text-slate-950 transition hover:text-[var(--theme-color)]">{item.name}</Link>
        </div>
      )
    },
    { key: "sku", header: "SKU", render: (item: Product) => item.sku || "--" },
    { key: "brand", header: "Brand", render: (item: Product) => item.brand ?? "--" },
    { key: "category", header: "Category", render: (item: Product) => item.categoryName ?? item.category ?? "--" },
    { key: "subCategory", header: "Sub Category", render: (item: Product) => item.subCategoryName ?? item.subCategory ?? "--" },
    { key: "price", header: "Default Selling Price", className: "text-right", render: (item: Product) => <span className="block text-right font-semibold text-white">{formatCurrency(item.sellingPrice)}</span> },
    {
      key: "stock",
      header: "Current Stock",
      className: "text-right",
      render: (item: Product) => {
        const stockTone = item.stockQty <= 0 ? "amount-danger" : item.stockQty <= item.minStockQty ? "amount-warning" : "amount-success";
        const stockLabel = item.stockQty <= 0 ? "Out Of Stock" : item.stockQty <= item.minStockQty ? "Low Stock" : "In Stock";
        return (
          <div className="text-right">
            <span className={`block font-semibold ${stockTone}`}>{item.stockQty}</span>
            <span className={`mt-1 block text-xs font-semibold ${stockTone}`}>{stockLabel}</span>
          </div>
        );
      }
    },
    { key: "inventoryValue", header: "Inventory Value", className: "text-right", render: (item: Product) => <span className="block text-right font-semibold text-white">{formatCurrency(item.inventoryValue)}</span> },
    { key: "minStockQty", header: "Minimum Stock Qty", className: "text-right", render: (item: Product) => <span className="block text-right font-semibold text-white">{item.minStockQty}</span> },
    {
      key: "taxMaster",
      header: "Tax Master",
      render: (item: Product) => (
        <div className="min-w-[140px]">
          <p className="font-semibold text-white">{item.taxable ? (item.taxName ?? `${item.taxPercent}%`) : "Non Taxable"}</p>
          <p className="mt-1 text-xs text-slate-400">{item.taxable ? (item.hsnCode ? `HSN ${item.hsnCode}` : item.taxCode ?? "--") : "GST exempt / non-taxable"}</p>
        </div>
      )
    },
    { key: "status", header: "Status", render: (item: Product) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> }
  ], []);

  const productActionColumn = useMemo(() => ({
    key: "actions",
    header: "Actions",
    className: "text-right",
    render: (item: Product) => (
      <ActionDropdown
        actions={[
          { label: "View Details", icon: <Eye size={15} />, to: `/products/${item.id}`, hidden: !can("PRODUCTS", "VIEW") },
          { label: "Edit", icon: <Pencil size={15} />, to: `/products/${item.id}/edit`, hidden: !can("PRODUCTS", "EDIT") },
          { label: "Show Logs", icon: <History size={15} />, hidden: !can("PRODUCTS", "LOGS"), onClick: () => setLogTarget(item) },
          { label: "Delete", icon: <CommonDeleteIcon />, danger: true, hidden: !can("PRODUCTS", "DELETE") || !item.active, onClick: () => setDeleteTarget(item) }
        ]}
      />
    )
  }), [can]);

  const visibleProductColumns = useMemo(() => applyVisibleColumns(productColumns, visibleColumns), [productColumns, visibleColumns]);
  const productExportColumns = useMemo(() => applyVisibleColumns([
    { key: "product", header: "Product Name", value: (row: Product) => row.name },
    { key: "sku", header: "SKU" },
    { key: "brand", header: "Brand", value: (row: Product) => row.brand },
    { key: "category", header: "Category", value: (row: Product) => row.categoryName ?? row.category },
    { key: "subCategory", header: "Sub Category", value: (row: Product) => row.subCategoryName ?? row.subCategory },
    { key: "price", header: "Default Selling Price", value: (row: Product) => row.sellingPrice, type: "amount" as const },
    { key: "stock", header: "Current Stock", value: (row: Product) => row.stockQty, type: "number" as const },
    { key: "inventoryValue", header: "Inventory Value", value: (row: Product) => row.inventoryValue, type: "amount" as const },
    { key: "minStockQty", header: "Minimum Stock Qty", type: "number" as const },
    { key: "taxMaster", header: "Tax Master", value: (row: Product) => row.taxable ? row.taxName ?? `${row.taxPercent}%` : "Non Taxable" },
    { key: "status", header: "Status", value: (row: Product) => row.active ? "Active" : "Inactive" }
  ], visibleColumns), [visibleColumns]);

  return (
    <CommonListPage<Product, ProductFilters>
      pageTitle="Products"
      pageSubtitle="Manage product master data while viewing batch-derived stock, inventory value, and default selling price."
      list={list}
      searchPlaceholder="Search Product"
      activeFilterCount={(filters) => (filters.categoryId ? 1 : 0) + (filters.subCategoryId ? 1 : 0) + (filters.status !== "active" ? 1 : 0)}
      filterFields={
        <>
          <Select
            label="Category Filter"
            placeholder={null}
            value={list.formFilters.categoryId}
            onChange={(event) => list.updateFormFilters({ categoryId: event.target.value, subCategoryId: "" })}
            options={[
              { label: "All Categories", value: "" },
              ...categories.map((category) => ({ label: category.categoryName, value: String(category.id) }))
            ]}
          />
          <Select
            label="Sub Category Filter"
            placeholder={null}
            value={list.formFilters.subCategoryId}
            disabled={!list.formFilters.categoryId}
            onChange={(event) => list.updateFormFilters({ subCategoryId: event.target.value })}
            options={[
              { label: "All Sub Categories", value: "" },
              ...subCategories.map((subCategory) => ({ label: subCategory.subCategoryName, value: String(subCategory.id) }))
            ]}
          />
          <Select
            label="Status Filter"
            placeholder={null}
            value={list.formFilters.status}
            onChange={(event) => list.updateFormFilters({ status: event.target.value })}
            options={[
              { label: "All", value: "all" },
              { label: "Active Only", value: "active" },
              { label: "Inactive Only", value: "inactive" }
            ]}
          />
        </>
      }
      toolbarButtons={
        can("PRODUCTS", "EXPORT") || can("PRODUCTS", "ADD") || can("PRODUCT_DATAPORT", "VIEW") ? (
          <>
            {can("PRODUCTS", "EXPORT") ? <Button type="button" variant="secondary" disabled={!list.tableData.length} onClick={() => exportToExcel("products.xlsx", list.tableData, productExportColumns)}>
              <Download size={16} />
              Export Excel
            </Button> : null}
            <DataPortLink menuCode="PRODUCT_DATAPORT" moduleKey="products" />
            {can("PRODUCTS", "ADD") ? <Link to="/products/new">
              <Button>Add product</Button>
            </Link> : null}
          </>
        ) : null
      }
      columnSelector={{ tableName: "PRODUCTS", columns: productColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["product"] }}
      aboveTable={
        <CommonBulkActionToolbar
          selectedCount={bulkSelection.selectedCount}
          canDelete={can("PRODUCTS", "DELETE")}
          onClearSelection={bulkSelection.clearSelection}
          onDeleteSelected={() => setBulkDeleteOpen(true)}
        />
      }
      rowSelection={can("PRODUCTS", "DELETE") ? {
        selectedRowIds: bulkSelection.selectedIds,
        onToggleRow: bulkSelection.toggleRow,
        onToggleAll: (checked) => checked ? bulkSelection.selectAll() : bulkSelection.clearSelection(),
        allSelected: bulkSelection.selectedCount > 0 && bulkSelection.selectedIds.length === list.tableData.length,
        someSelected: bulkSelection.selectedCount > 0 && bulkSelection.selectedIds.length < list.tableData.length,
        getRowId: (item: Product) => item.id
      } : undefined}
      tableColumns={[...visibleProductColumns, productActionColumn]}
      emptyMessage="No products match the current filters."
      fullHeight
      modals={
        <>
          <AuditLogModal open={Boolean(logTarget)} moduleName="Product" entityId={logTarget?.id ?? null} title={logTarget ? `${logTarget.name} Logs` : "Product Logs"} onClose={() => setLogTarget(null)} />
          <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
          <CommonDeleteModal
            open={bulkDeleteOpen}
            loading={deleting}
            onCancel={() => setBulkDeleteOpen(false)}
            onConfirm={() => void handleBulkDelete()}
            title={`Delete ${bulkSelection.selectedCount} selected record${bulkSelection.selectedCount === 1 ? "" : "s"}`}
            description={`This action will permanently delete ${bulkSelection.selectedCount} selected record${bulkSelection.selectedCount === 1 ? "" : "s"}. Are you sure you want to continue?`}
          />
        </>
      }
    />
  );
};
