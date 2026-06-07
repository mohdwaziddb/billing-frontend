import { useEffect, useState } from "react";
import { Download, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { deleteProduct, getProductsPage } from "../api/products";
import { ActionDropdown } from "../components/ActionDropdown";
import { Button } from "../components/Button";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { notificationService } from "../services/notificationService";
import type { PageResponse, Product } from "../types/api";

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
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { can } = useAuth();
  const { message: error, clearMessage, setApiError } = useApiMessage();

  const loadProducts = async (nextPage = page) => {
    const active = statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
    const response = await getProductsPage({ search: search.trim() || undefined, active, page: nextPage, size: DEFAULT_PAGE_SIZE });
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

  useEffect(() => {
    setPage(0);
    void loadProducts(0);
  }, [statusFilter]);

  return (
    <div className="space-y-4 pb-6">
      <Header
        title="Products"
        subtitle="Manage pricing, stock depth, tax settings, and product availability from a structured catalog view."
      />
      <GlassCard className="p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Inventory</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Products</h2>
            </div>
            {can("PRODUCTS", "EXPORT") || can("PRODUCTS", "ADD") ? (
              <div className="flex flex-wrap gap-2">
                {can("PRODUCTS", "EXPORT") ? <Button type="button" variant="secondary" disabled={!products.length} onClick={() => exportToExcel("products.xlsx", products, [
                  { key: "name", header: "Product Name" },
                  { key: "sku", header: "SKU" },
                  { key: "brand", header: "Brand" },
                  { key: "categoryName", header: "Category" },
                  { key: "purchasePrice", header: "Purchase Price", type: "amount" },
                  { key: "sellingPrice", header: "Selling Price", type: "amount" },
                  { key: "stockQty", header: "Stock Qty", type: "number" },
                  { key: "minStockQty", header: "Minimum Stock Qty", type: "number" },
                  { key: "taxPercent", header: "Tax Percent", type: "number" },
                  { key: "active", header: "Status", value: (row) => row.active ? "Active" : "Inactive" }
                ])}>
                  <Download size={16} />
                  Export Excel
                </Button> : null}
                {can("PRODUCTS", "ADD") ? <Link to="/products/new">
                  <Button>Add product</Button>
                </Link> : null}
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_160px]">
            <Input
              label="Search Product"
              placeholder="Enter Product Name or SKU"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setPage(0);
                  void loadProducts(0);
                }
              }}
            />
            <Select
              label="Status Filter"
              placeholder={null}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { label: "All Products", value: "all" },
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
        {error ? (
          <div className="mb-4 rounded-[24px] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
        <Table
          data={products}
          emptyText="No products match the current filters."
          columns={[
            {
              key: "product",
              header: "Product",
              render: (item) => (
                <div className="min-w-[180px]">
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.sku}</p>
                </div>
              )
            },
            { key: "brand", header: "Brand / Category", render: (item) => `${item.brand ?? "--"} / ${item.categoryName ?? item.category ?? "--"}` },
            {
              key: "price",
              header: "Selling Price",
              className: "text-right",
              render: (item) => (
                <span className="block text-right font-semibold text-white">
                  {formatCurrency(item.sellingPrice)}
                </span>
              )
            },
            {
              key: "stock",
              header: "Stock",
              className: "text-right",
              render: (item) => (
                <span
                  className={`block text-right font-semibold ${
                    item.stockQty <= item.minStockQty ? "text-amber-200" : "text-white"
                  }`}
                >
                  {item.stockQty}
                </span>
              )
            },
            { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
            {
              key: "actions",
              header: "Actions",
              className: "text-right",
              render: (item) => (
                <ActionDropdown
                  actions={[
                    {
                      label: "Edit",
                      icon: <Pencil size={15} />,
                      to: `/products/${item.id}/edit`,
                      hidden: !can("PRODUCTS", "EDIT")
                    },
                    {
                      label: "Delete",
                      icon: <Trash2 size={15} />,
                      danger: true,
                      hidden: !can("PRODUCTS", "DELETE"),
                      onClick: () => setDeleteTarget(item)
                    }
                  ]}
                />
              )
            }
          ]}
        />
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
      </GlassCard>
      <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} />
    </div>
  );
};
