import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProduct } from "../api/products";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Table } from "../components/Table";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import type { Product } from "../types/api";

export const ProductDetailPage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { setApiError } = useApiMessage();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!productId) {
      return;
    }
    void getProduct(Number(productId)).then(setProduct).catch((err: any) => setApiError(err, "Unable to load product details"));
  }, [productId, setApiError]);

  return (
    <div className="space-y-4 pb-6">
      <Header title="Product Details" subtitle="Master data, current stock snapshot, and full batch history for this product." />
      <GlassCard className="space-y-4 p-6 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CommonBreadcrumb items={[{ label: "Products", to: "/products" }, { label: product?.name ?? "Details" }]} />
            <h2 className="mt-1 text-2xl font-bold text-white">{product?.name ?? "Loading..."}</h2>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate("/products")}>
              <ArrowLeft size={16} />
              Back
            </Button>
            {product ? <Link to={`/products/${product.id}/edit`}><Button type="button">Edit Product</Button></Link> : null}
          </div>
        </div>

        {product ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard label="SKU" value={product.sku} />
              <InfoCard label="Current Stock" value={String(product.stockQty)} />
              <InfoCard label="Inventory Value" value={formatCurrency(product.inventoryValue)} />
              <InfoCard label="Default Selling Price" value={formatCurrency(product.sellingPrice)} />
              <InfoCard label="Category" value={product.categoryName ?? product.category ?? "--"} />
              <InfoCard label="Sub Category" value={product.subCategoryName ?? product.subCategory ?? "--"} />
              <InfoCard label="Tax" value={product.taxable ? (product.taxName ?? `${product.taxPercent}%`) : "Non Taxable"} />
              <InfoCard label="Minimum Stock" value={String(product.minStockQty)} />
            </div>

            <GlassCard className="p-4">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">Batch History</h3>
                <p className="mt-1 text-sm text-slate-400">Every purchase or opening balance creates an independent batch. Sales consume these in FIFO order.</p>
              </div>
              <Table
                data={product.batches ?? []}
                emptyText="No inventory batches available for this product."
                columns={[
                  { key: "batchNo", header: "Batch Number", render: (item) => item.batchNo },
                  { key: "date", header: "Purchase Date", render: (item) => formatDate(item.batchDate) },
                  { key: "purchaseQty", header: "Purchase Qty", className: "text-right", render: (item) => <span className="block text-right">{item.purchaseQty}</span> },
                  { key: "remainingQty", header: "Remaining Qty", className: "text-right", render: (item) => <span className="block text-right">{item.remainingQty}</span> },
                  { key: "purchaseRate", header: "Purchase Rate", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.purchaseRate)}</span> },
                  { key: "sellingRate", header: "Selling Rate", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.sellingRate)}</span> },
                  { key: "stockValue", header: "Stock Value", className: "text-right", render: (item) => <span className="block text-right font-semibold">{formatCurrency(item.stockValue)}</span> },
                  { key: "status", header: "Batch Status", render: (item) => item.batchStatus.replace(/_/g, " ") }
                ]}
              />
            </GlassCard>
          </>
        ) : null}
      </GlassCard>
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-2 text-base font-semibold text-white">{value}</p>
  </div>
);
