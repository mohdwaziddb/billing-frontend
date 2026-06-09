import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getProductCategories } from "../api/productCategories";
import { createProduct, getProduct, updateProduct } from "../api/products";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useApiMessage } from "../hooks/useApiFeedback";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import type { ProductCategory, ProductRequest } from "../types/api";
import { notificationService } from "../services/notificationService";

type FormValues = {
  name: string;
  categoryId: string;
  brand: string;
  sku: string;
  hsnCode: string;
  purchasePrice: string;
  sellingPrice: string;
  stockQty: string;
  minStockQty: string;
  taxPercent: string;
  description: string;
  active: string;
};

export const ProductFormPage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const editing = Boolean(productId);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      categoryId: "",
      brand: "",
      sku: "",
      hsnCode: "",
      purchasePrice: "",
      sellingPrice: "",
      stockQty: "",
      minStockQty: "",
      taxPercent: "0",
      description: "",
      active: "true"
    }
  });
  const { message: serverError, clearMessage, setApiError } = useApiMessage();

  useEffect(() => {
    void getProductCategories({ active: true, size: 1000 }).then((categoryData) => {
      setCategories(categoryData.filter((category) => category.active));
    });
  }, []);

  useEffect(() => {
    if (!productId) {
      return;
    }
    void getProduct(Number(productId)).then((product) => {
      reset({
        name: product.name,
        categoryId: product.categoryId ? String(product.categoryId) : "",
        brand: product.brand ?? "",
        sku: product.sku,
        hsnCode: product.hsnCode ?? "",
        purchasePrice: String(product.purchasePrice),
        sellingPrice: String(product.sellingPrice),
        stockQty: String(product.stockQty),
        minStockQty: String(product.minStockQty),
        taxPercent: String(product.taxPercent),
        description: product.hsnCode ?? "",
        active: product.active ? "true" : "false"
      });
    });
  }, [productId, reset]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ label: category.categoryName, value: String(category.id) })),
    [categories]
  );

  const onSubmit = async (values: FormValues) => {
    clearMessage();
    const payload: ProductRequest = {
      name: values.name,
      categoryId: Number(values.categoryId),
      brand: values.brand || undefined,
      sku: values.sku || `${values.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "SKU"}-${Date.now()}`,
      hsnCode: values.description || values.hsnCode || undefined,
      purchasePrice: Number(values.purchasePrice || values.sellingPrice),
      sellingPrice: Number(values.sellingPrice),
      stockQty: Number(values.stockQty || 0),
      minStockQty: Number(values.minStockQty || 0),
      taxPercent: Number(values.taxPercent || 0),
      active: values.active === "true"
    };

    try {
      if (editing) {
        await updateProduct(Number(productId), payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.updated("Product"));
      } else {
        await createProduct(payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.created("Product"));
      }
      navigate("/products");
    } catch (err: any) {
      setApiError(err, "Unable to save product");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header
        title={editing ? "Products > Edit Product" : "Products > Add Product"}
        subtitle="Maintain product pricing, tax, and stock configuration in a clean structured form."
      />
      <GlassCard className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CommonBreadcrumb items={[{ label: "Products", to: "/products" }, { label: editing ? "Edit Product" : "Add Product" }]} />
            <h2 className="mt-1 text-xl font-bold text-white">
              {editing ? "Edit Product" : "Add Product"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate("/products")}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <Button disabled={isSubmitting} type="submit" form="product-form">{isSubmitting ? "Saving..." : "Save Product"}</Button>
          </div>
        </div>
        <form id="product-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-bold uppercase text-slate-500">Product Details</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Product Name" requiredMark error={errors.name?.message} {...register("name", { required: "Product name is required" })} />
              <Select
                label="Product Category"
                requiredMark
                placeholder={categoryOptions.length ? "Select Product Category" : "No product categories found"}
                error={errors.categoryId?.message}
                hint="Only active product categories are available."
                disabled={!categoryOptions.length}
                options={categoryOptions}
                {...register("categoryId", { required: "Product category is required" })}
              />
              <Input label="Price" requiredMark type="number" step="0.01" error={errors.sellingPrice?.message} {...register("sellingPrice", { required: "Price is required" })} />
              <Input label="Stock Quantity" type="number" error={errors.stockQty?.message} {...register("stockQty")} />
              <Input label="Description" className="md:col-span-2" {...register("description")} />
            </div>
            <input type="hidden" {...register("sku")} />
            <input type="hidden" {...register("brand")} />
            <input type="hidden" {...register("hsnCode")} />
            <input type="hidden" {...register("purchasePrice")} />
            <input type="hidden" {...register("minStockQty")} />
            <input type="hidden" {...register("taxPercent")} />
            <input type="hidden" {...register("active")} />
          </section>
          {serverError ? <div className="md:col-span-2 rounded-[24px] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{serverError}</div> : null}
        </form>
      </GlassCard>
    </div>
  );
};
