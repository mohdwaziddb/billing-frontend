import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteProduct, getProducts } from "../api/products";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatCurrency } from "../lib/currency";
import type { Product } from "../types/api";

export const ProductListPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const { message: error, clearMessage, setApiError } = useApiMessage();

  const loadProducts = async () => {
    const active = statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
    setProducts(await getProducts({ search: search.trim() || undefined, active }));
  };

  const handleDelete = async (productId: number) => {
    try {
      clearMessage();
      await deleteProduct(productId);
      await loadProducts();
    } catch (err: any) {
      setApiError(err, "Unable to delete product");
    }
  };

  useEffect(() => {
    void loadProducts();
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
            <Link to="/products/new">
              <Button>Add product</Button>
            </Link>
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
                  void loadProducts();
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
              <Button className="w-full" variant="secondary" onClick={() => void loadProducts()}>
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
            { key: "brand", header: "Brand / Category", render: (item) => `${item.brand ?? "--"} / ${item.category ?? "--"}` },
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
              render: (item) => (
                <div className="flex flex-wrap gap-2">
                  <Link to={`/products/${item.id}/edit`}>
                    <Button variant="secondary">Edit</Button>
                  </Link>
                  <Button variant="danger" onClick={() => void handleDelete(item.id)}>
                    Delete
                  </Button>
                </div>
              )
            }
          ]}
        />
      </GlassCard>
    </div>
  );
};
