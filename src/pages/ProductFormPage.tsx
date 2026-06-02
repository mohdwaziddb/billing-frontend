import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { createProduct, getProduct, updateProduct } from "../api/products";
import { Button } from "../components/Button";
import { Header } from "../components/Header";
import { GlassCard } from "../components/GlassCard";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useApiMessage } from "../hooks/useApiFeedback";
import type { ProductRequest } from "../types/api";

type FormValues = {
  name: string;
  category: string;
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
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: {
      name: "",
      category: "",
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
    if (!productId) {
      return;
    }
    void getProduct(Number(productId)).then((product) => {
      reset({
        name: product.name,
        category: product.category ?? "",
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

  const onSubmit = async (values: FormValues) => {
    clearMessage();
    const payload: ProductRequest = {
      name: values.name,
      category: values.category || undefined,
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
      } else {
        await createProduct(payload);
      }
      navigate("/products");
    } catch (err: any) {
      setApiError(err, "Unable to save product");
    }
  };

  return (
    <div className="space-y-4">
      <Header title={editing ? "Edit product" : "Add product"} subtitle="Configure sellable inventory data while leaving all invoice math and stock mutations to the backend services." />
      <GlassCard className="p-6">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Name" requiredMark error={errors.name?.message} {...register("name", { required: "Name is required" })} />
          <Input label="SKU" requiredMark error={errors.sku?.message} {...register("sku", { required: "SKU is required" })} />
          <Input label="Category" {...register("category")} />
          <Input label="Brand" {...register("brand")} />
          <Input label="HSN Code" {...register("hsnCode")} />
          <Input label="Purchase Price" requiredMark type="number" step="0.01" error={errors.purchasePrice?.message} {...register("purchasePrice", { required: "Purchase price is required" })} />
          <Input label="Selling Price" requiredMark type="number" step="0.01" error={errors.sellingPrice?.message} {...register("sellingPrice", { required: "Selling price is required" })} />
          <Input label="Stock Qty" type="number" error={errors.stockQty?.message} {...register("stockQty")} />
          <Input label="Minimum Stock Qty" type="number" error={errors.minStockQty?.message} {...register("minStockQty")} />
          <Input label="Tax Percent" requiredMark type="number" step="0.01" error={errors.taxPercent?.message} {...register("taxPercent", { required: "Tax percent is required" })} />
          <Select label="Active" placeholder="Select Active Status" options={[{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} {...register("active")} />
          {serverError ? <p className="md:col-span-2 text-sm text-rose-300">{serverError}</p> : null}
          <div className="md:col-span-2 flex gap-3">
            <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Saving..." : editing ? "Update product" : "Create product"}</Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/products")}>Cancel</Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};
