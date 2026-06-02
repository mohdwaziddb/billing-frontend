import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { deleteProduct, getProducts } from "../api/products";
import { Button } from "../components/Button";
import { Header } from "../components/Header";
import { GlassCard } from "../components/GlassCard";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { formatCurrency } from "../lib/currency";
import { useApiMessage } from "../hooks/useApiFeedback";
import type { Product } from "../types/api";

export const ProductListPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const { message: error, clearMessage, setApiError } = useApiMessage();

  const loadProducts = async () => {
    const active =
      statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
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
    <div className="space-y-4">
      <Header title="Product catalog" subtitle="Manage pricing, tax percentages, stock depth, and low-stock risk in a polished inventory workspace." />
      <GlassCard className="p-6">
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
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_140px]">
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
        {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}
        <Table
          data={products}
          columns={[
            { key: "product", header: "Product", render: (item) => <div><p className="font-semibold text-white">{item.name}</p><p className="text-xs text-slate-400">{item.sku}</p></div> },
            { key: "brand", header: "Brand / Category", render: (item) => `${item.brand ?? "--"} / ${item.category ?? "--"}` },
            { key: "price", header: "Selling Price", render: (item) => formatCurrency(item.sellingPrice) },
            { key: "stock", header: "Stock", render: (item) => <span className={item.stockQty <= item.minStockQty ? "text-amber-200" : "text-white"}>{item.stockQty}</span> },
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
