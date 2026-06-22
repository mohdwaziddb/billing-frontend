import { useEffect, useMemo, useState } from "react";
import { Download, History, Pencil, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { getProductCategories } from "../api/productCategories";
import { getProductSubCategories } from "../api/productSubCategories";
import { deleteProduct, deleteProductsBulk, getProductsPage } from "../api/products";
import { BulkDeleteModal } from "../components/BulkDeleteModal";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { CommonColumnSelector, applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteIcon } from "../components/CommonDeleteAction";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { CommonBulkActionToolbar } from "../components/CommonBulkActionToolbar";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { useBulkSelection } from "../hooks/useBulkSelection";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { notificationService } from "../services/notificationService";
import type { PageResponse, Product, ProductCategory, ProductSubCategory } from "../types/api";

const emptyProductPage: PageResponse<Product> = {
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
};

export const ProductListPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [productPage, setProductPage] = useState<PageResponse<Product>>(emptyProductPage);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subCategories, setSubCategories] = useState<ProductSubCategory[]>([]);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subCategoryFilter, setSubCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [logTarget, setLogTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const { can } = useAuth();
  const { clearMessage, setApiError } = useApiMessage();

  const bulkSelection = useBulkSelection<Product>(products);

  const loadProducts = async (nextPage = page, searchOverride = search) => {
    const active = statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
    const response = await getProductsPage({
      search: searchOverride.trim() || undefined,
      active,
      categoryId: categoryFilter ? Number(categoryFilter) : undefined,
      subCategoryId: subCategoryFilter ? Number(subCategoryFilter) : undefined,
      page: nextPage,
      size: DEFAULT_PAGE_SIZE
    });
    setProductPage(response);
    setProducts(response.records);
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      setDeleting(true);
      clearMessage();
      await deleteProduct(deleteTarget.id);
      await loadProducts(page);
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("Product"));
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkSelection.selectedIds.length) {
      return;
    }
    try {
      setDeleting(true);
      clearMessage();
      const resp = await deleteProductsBulk(bulkSelection.selectedIds);
      await loadProducts(page);
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
    if (!categoryFilter) {
      setSubCategories([]);
      setSubCategoryFilter("");
      return;
    }
    setSubCategoryFilter("");
    void getProductSubCategories({ active: true, categoryId: Number(categoryFilter), size: 1000 })
      .then((subCategoryData) => setSubCategories(subCategoryData.filter((subCategory) => subCategory.active)))
      .catch((err: any) => setApiError(err, "Unable to load product sub categories"));
  }, [categoryFilter, setApiError]);

  useEffect(() => {
    setPage(0);
    void loadProducts(0);
  }, [statusFilter, categoryFilter, subCategoryFilter]);

  const productColumns = useMemo(() => [
    {
      key: "product",
      header: "Product Name",
      render: (item: Product) => (
        <div className="min-w-[180px]">
          <p className="font-semibold text-white">{item.name}</p>
        </div>
      )
    },
    { key: "sku", header: "SKU", render: (item: Product) => item.sku || "--" },
    { key: "brand", header: "Brand", render: (item: Product) => item.brand ?? "--" },
    { key: "category", header: "Category", render: (item: Product) => item.categoryName ?? item.category ?? "--" },
    { key: "subCategory", header: "Sub Category", render: (item: Product) => item.subCategoryName ?? item.subCategory ?? "--" },
    { key: "purchasePrice", header: "Purchase Price", className: "text-right", render: (item: Product) => <span className="block text-right font-semibold text-white">{formatCurrency(item.purchasePrice)}</span> },
    { key: "price", header: "Selling Price", className: "text-right", render: (item: Product) => <span className="block text-right font-semibold text-white">{formatCurrency(item.sellingPrice)}</span> },
    {
      key: "stock",
      header: "Stock Qty",
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
    { key: "minStockQty", header: "Minimum Stock Qty", className: "text-right", render: (item: Product) => <span className="block text-right font-semibold text-white">{item.minStockQty}</span> },
    { key: "taxPercent", header: "Tax Percent", className: "text-right", render: (item: Product) => <span className="block text-right font-semibold text-white">{item.taxPercent}%</span> },
    { key: "status", header: "Status", render: (item: Product) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> }
  ], []);

  const productActionColumn = useMemo(() => ({
    key: "actions",
    header: "Actions",
    className: "text-right",
    render: (item: Product) => (
      <ActionDropdown
        actions={[
          { label: "Edit", icon: <Pencil size={15} />, to: `/products/${item.id}/edit`, hidden: !can("PRODUCTS", "EDIT") },
          { label: "Show Logs", icon: <History size={15} />, hidden: !can("PRODUCTS", "LOGS"), onClick: () => setLogTarget(item) },
          { label: "Delete", icon: <CommonDeleteIcon />, danger: true, hidden: !can("PRODUCTS", "DELETE"), onClick: () => setDeleteTarget(item) }
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
    { key: "purchasePrice", header: "Purchase Price", type: "amount" as const },
    { key: "price", header: "Selling Price", value: (row: Product) => row.sellingPrice, type: "amount" as const },
    { key: "stock", header: "Stock Qty", value: (row: Product) => row.stockQty, type: "number" as const },
    { key: "minStockQty", header: "Minimum Stock Qty", type: "number" as const },
    { key: "taxPercent", header: "Tax Percent", type: "number" as const },
    { key: "status", header: "Status", value: (row: Product) => row.active ? "Active" : "Inactive" }
  ], visibleColumns), [visibleColumns]);

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header
        title="Products"
        subtitle="Manage pricing, stock depth, tax settings, and product availability from a structured catalog view."
      />
      <GlassCard className="flex flex-1 flex-col p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CommonBreadcrumb items={[{ label: "Products" }]} />
            </div>
            {can("PRODUCTS", "EXPORT") || can("PRODUCTS", "ADD") || can("PRODUCT_DATAPORT", "VIEW") ? (
              <div className="flex flex-wrap gap-2">
                <CommonColumnSelector tableName="PRODUCTS" availableColumns={productColumns.map(({ key, header }) => ({ key, header }))} visibleColumns={visibleColumns} onApply={setVisibleColumns} />
                {can("PRODUCTS", "EXPORT") ? <Button type="button" variant="secondary" disabled={!products.length} onClick={() => exportToExcel("products.xlsx", products, productExportColumns)}>
                  <Download size={16} />
                  Export Excel
                </Button> : null}
                {can("PRODUCT_DATAPORT", "VIEW") ? <Link to="/data-port/products">
                  <Button type="button" variant="secondary">
                    <Upload size={16} />
                    Product DataPort
                  </Button>
                </Link> : null}
                {can("PRODUCTS", "ADD") ? <Link to="/products/new">
                  <Button>Add product</Button>
                </Link> : null}
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px_180px_160px]">
            <Input
              label="Search Product"
              placeholder="Enter Product, SKU, Category, or Sub Category"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => {
                setPage(0);
                setSearch("");
                void loadProducts(0, "");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setPage(0);
                  void loadProducts(0);
                }
              }}
            />
            <Select
              label="Category Filter"
              placeholder={null}
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              options={[
                { label: "All Categories", value: "" },
                ...categories.map((category) => ({ label: category.categoryName, value: String(category.id) }))
              ]}
            />
            <Select
              label="Sub Category Filter"
              placeholder={null}
              value={subCategoryFilter}
              disabled={!categoryFilter}
              onChange={(event) => setSubCategoryFilter(event.target.value)}
              options={[
                { label: "All Sub Categories", value: "" },
                ...subCategories.map((subCategory) => ({ label: subCategory.subCategoryName, value: String(subCategory.id) }))
              ]}
            />
            <Select
              label="Status Filter"
              placeholder={null}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { label: "All", value: "all" },
                { label: "Active Only", value: "active" },
                { label: "Inactive Only", value: "inactive" }
              ]}
            />
            <div className="flex items-end">
              <Button className="w-full" variant="secondary" onClick={() => { setPage(0); void loadProducts(0); }}>
                Search
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <CommonBulkActionToolbar
            selectedCount={bulkSelection.selectedCount}
            canDelete={can("PRODUCTS", "DELETE")}
            onClearSelection={bulkSelection.clearSelection}
            onDeleteSelected={() => setBulkDeleteOpen(true)}
          />
          <Table
            data={products}
            emptyText="No products match the current filters."
            emptyAction={can("PRODUCTS", "ADD") ? <Link to="/products/new"><Button>Add product</Button></Link> : null}
            rowSelection={can("PRODUCTS", "DELETE") ? {
              selectedRowIds: bulkSelection.selectedIds,
              onToggleRow: bulkSelection.toggleRow,
              onToggleAll: (checked) => checked ? bulkSelection.selectAll() : bulkSelection.clearSelection(),
              allSelected: bulkSelection.selectedCount > 0 && bulkSelection.selectedIds.length === products.length,
              someSelected: bulkSelection.selectedCount > 0 && bulkSelection.selectedIds.length < products.length,
              getRowId: (item: Product) => item.id
            } : undefined}
            columns={[...visibleProductColumns, productActionColumn]}
          />
        </div>
        <div className="mt-auto">
          <Pagination
          page={productPage.page}
          size={productPage.size}
          totalRecords={productPage.totalRecords}
          totalPages={productPage.totalPages}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            void loadProducts(nextPage);
          }}
          />
        </div>
      </GlassCard>
      <AuditLogModal open={Boolean(logTarget)} moduleName="Product" entityId={logTarget?.id ?? null} title={logTarget ? `${logTarget.name} Logs` : "Product Logs"} onClose={() => setLogTarget(null)} />
      <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
      <BulkDeleteModal
        open={bulkDeleteOpen}
        loading={deleting}
        selectedCount={bulkSelection.selectedCount}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void handleBulkDelete()}
      />
    </div>
  );
};
