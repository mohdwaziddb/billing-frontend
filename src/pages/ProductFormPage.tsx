import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { getProductCategories } from "../api/productCategories";
import { createProduct, getProduct, updateProduct } from "../api/products";
import { Button } from "../components/Button";
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
      taxPercent: "",
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
      sku: values.sku,
      hsnCode: values.hsnCode || undefined,
      purchasePrice: Number(values.purchasePrice),
      sellingPrice: Number(values.sellingPrice),
      stockQty: Number(values.stockQty || 0),
      minStockQty: Number(values.minStockQty || 0),
      taxPercent: Number(values.taxPercent),
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
    <div className="space-y-4 pb-6">
      <Header
        title={editing ? "Edit product" : "Add product"}
        subtitle="Maintain product pricing, tax, and stock configuration in a clean structured form."
      />
      <GlassCard className="mx-auto max-w-5xl p-6 md:p-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Product form</p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {editing ? "Update product details" : "Create new product"}
          </h2>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Name" requiredMark error={errors.name?.message} {...register("name", { required: "Name is required" })} />
          <Input label="SKU" requiredMark error={errors.sku?.message} {...register("sku", { required: "SKU is required" })} />
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
          <Input label="Brand" {...register("brand")} />
          <Input label="HSN Code" {...register("hsnCode")} />
          <Input label="Purchase Price" requiredMark type="number" step="0.01" error={errors.purchasePrice?.message} {...register("purchasePrice", { required: "Purchase price is required" })} />
          <Input label="Selling Price" requiredMark type="number" step="0.01" error={errors.sellingPrice?.message} {...register("sellingPrice", { required: "Selling price is required" })} />
          <Input label="Stock Qty" type="number" hint="Current sellable quantity on hand." error={errors.stockQty?.message} {...register("stockQty")} />
          <Input label="Minimum Stock Qty" type="number" hint="Threshold used for low-stock alerts." error={errors.minStockQty?.message} {...register("minStockQty")} />
          <Input label="Tax Percent" requiredMark type="number" step="0.01" error={errors.taxPercent?.message} {...register("taxPercent", { required: "Tax percent is required" })} />
          <Select label="Active" placeholder="Select Active Status" options={[{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} {...register("active")} />
          {serverError ? <div className="md:col-span-2 rounded-[24px] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{serverError}</div> : null}
          <div className="md:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row">
            <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Saving..." : editing ? "Update product" : "Create product"}</Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/products")}>Cancel</Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};
