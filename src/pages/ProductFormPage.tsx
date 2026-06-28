import { useEffect, useMemo, useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getProductCategories } from "../api/productCategories";
import { getProductSubCategories } from "../api/productSubCategories";
import { createProduct, getProduct, updateProduct } from "../api/products";
import { getTaxMasters } from "../api/taxMaster";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useApiMessage } from "../hooks/useApiFeedback";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { firstFormErrorMessage } from "../lib/formValidation";
import { notificationService } from "../services/notificationService";
import type { ProductCategory, ProductRequest, ProductSubCategory, TaxMaster } from "../types/api";

type FormValues = {
  name: string;
  categoryId: string;
  subCategoryId: string;
  brand: string;
  sku: string;
  hsnCode: string;
  minStockQty: string;
  taxable: string;
  taxMasterId: string;
  active: string;
};

const defaultValues: FormValues = {
  name: "",
  categoryId: "",
  subCategoryId: "",
  brand: "",
  sku: "",
  hsnCode: "",
  minStockQty: "0",
  taxable: "true",
  taxMasterId: "",
  active: "true"
};

export const ProductFormPage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const editing = Boolean(productId);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subCategories, setSubCategories] = useState<ProductSubCategory[]>([]);
  const [taxMasters, setTaxMasters] = useState<TaxMaster[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState<ProductSubCategory | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues
  });
  const { clearMessage, setApiError } = useApiMessage();

  useEffect(() => {
    void Promise.all([getProductCategories({ active: true, size: 1000 }), getTaxMasters({ active: true })])
      .then(([categoryData, taxData]) => {
        setCategories(categoryData.filter((category) => category.active));
        setTaxMasters(taxData.filter((tax) => tax.active));
      })
      .catch((err: any) => setApiError(err, "Unable to load product categories"));
  }, [setApiError]);

  useEffect(() => {
    if (!productId) {
      return;
    }
    void getProduct(Number(productId))
      .then((product) => {
        setSelectedSubCategory(product.subCategoryId
          ? {
              id: product.subCategoryId,
              categoryId: product.categoryId ?? 0,
              categoryName: product.categoryName ?? product.category ?? "",
              subCategoryName: product.subCategoryName ?? product.subCategory ?? "",
              description: null,
              active: true,
              createdAt: "",
              updatedAt: "",
              createdBy: null,
              updatedBy: null
            }
          : null);
        reset({
          name: product.name,
          categoryId: product.categoryId ? String(product.categoryId) : "",
          subCategoryId: product.subCategoryId ? String(product.subCategoryId) : "",
          brand: product.brand ?? "",
          sku: product.sku,
          hsnCode: product.hsnCode ?? "",
          minStockQty: String(product.minStockQty),
          taxable: product.taxable ? "true" : "false",
          taxMasterId: product.taxMasterId ? String(product.taxMasterId) : "",
          active: product.active ? "true" : "false"
        });
      })
      .catch((err: any) => setApiError(err, "Unable to load product details"));
  }, [productId, reset, setApiError]);

  const watchedValues = watch();
  const watchedCategoryId = watch("categoryId");
  const watchedSubCategoryId = watch("subCategoryId");
  const watchedTaxable = watch("taxable");

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ label: category.categoryName, value: String(category.id) })),
    [categories]
  );
  const subCategoryOptions = useMemo(
    () => subCategories.map((subCategory) => ({ label: subCategory.subCategoryName, value: String(subCategory.id) })),
    [subCategories]
  );
  const taxOptions = useMemo(
    () => taxMasters.map((tax) => ({ label: `${tax.taxName} (${tax.rate}%)`, value: String(tax.id) })),
    [taxMasters]
  );

  useEffect(() => {
    if (!watchedCategoryId) {
      setSubCategories([]);
      setValue("subCategoryId", "");
      return;
    }
    void getProductSubCategories({ active: true, categoryId: Number(watchedCategoryId), size: 1000 })
      .then((subCategoryData) => {
        const activeSubCategories = subCategoryData.filter((subCategory) => subCategory.active);
        const shouldPreserveSelected =
          selectedSubCategory
          && String(selectedSubCategory.categoryId) === String(watchedCategoryId)
          && !activeSubCategories.some((subCategory) => subCategory.id === selectedSubCategory.id);
        setSubCategories(shouldPreserveSelected ? [...activeSubCategories, selectedSubCategory] : activeSubCategories);
      })
      .catch((err: any) => setApiError(err, "Unable to load product sub categories"));
  }, [selectedSubCategory, setApiError, setValue, watchedCategoryId]);

  const canSaveProduct = Boolean(
    watchedValues.name.trim() &&
    watchedValues.categoryId &&
    watchedValues.subCategoryId &&
    watchedValues.sku.trim() &&
    (watchedTaxable === "false" || Boolean(watchedValues.taxMasterId))
  );

  const onSubmit = async (values: FormValues) => {
    clearMessage();
    const payload: ProductRequest = {
      name: values.name.trim(),
      categoryId: Number(values.categoryId),
      subCategoryId: Number(values.subCategoryId),
      brand: values.brand.trim() || undefined,
      sku: values.sku.trim(),
      hsnCode: values.hsnCode.trim() || undefined,
      minStockQty: Number(values.minStockQty || 0),
      taxable: values.taxable === "true",
      taxMasterId: values.taxable === "true" && values.taxMasterId ? Number(values.taxMasterId) : null,
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

  const onInvalid = (validationErrors: FieldErrors<FormValues>) => {
    notificationService.showError(firstFormErrorMessage(validationErrors, "Please fill all required product fields before saving."));
  };

  const categoryRegister = register("categoryId", { required: "Product category is required" });
  const subCategoryRegister = register("subCategoryId", { required: "Product sub category is required" });

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header
        title={editing ? "Products > Edit Product" : "Products > Add Product"}
        subtitle="Maintain product master data, tax setup, and minimum stock rules. Inventory quantity and rates now come only from purchase batches."
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
            <Button disabled={isSubmitting || !canSaveProduct} type="submit" form="product-form">
              {isSubmitting ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </div>

        <form id="product-form" className="grid flex-1 auto-rows-fr gap-4 lg:grid-cols-2" onSubmit={handleSubmit(onSubmit, onInvalid)}>
          <section className="h-full space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-bold uppercase text-slate-500">Product Details</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Product Name"
                requiredMark
                error={errors.name?.message}
                {...register("name", { required: "Product name is required" })}
              />
              <Select
                label="Product Category"
                requiredMark
                placeholder={categoryOptions.length ? "Select Product Category" : "No active categories found"}
                error={errors.categoryId?.message}
                hint="Only active product categories are available."
                disabled={!categoryOptions.length}
                options={categoryOptions}
                value={watchedCategoryId}
                {...categoryRegister}
                onChange={(event) => {
                  categoryRegister.onChange(event);
                  setSelectedSubCategory(null);
                  setValue("subCategoryId", "");
                }}
              />
              <Select
                label="Product Sub Category"
                requiredMark
                placeholder={subCategoryOptions.length ? "Select Product Sub Category" : "No active sub categories found"}
                error={errors.subCategoryId?.message}
                hint="Sub categories load from the selected category."
                disabled={!watchedCategoryId || !subCategoryOptions.length}
                options={subCategoryOptions}
                value={watchedSubCategoryId}
                {...subCategoryRegister}
                onChange={(event) => {
                  subCategoryRegister.onChange(event);
                }}
              />
              <Input
                label="SKU"
                requiredMark
                error={errors.sku?.message}
                hint="Keep this unique for each product."
                {...register("sku", { required: "SKU is required" })}
              />
              <Input
                label="Brand"
                error={errors.brand?.message}
                {...register("brand")}
              />
              <Input
                label="HSN Code"
                error={errors.hsnCode?.message}
                {...register("hsnCode")}
              />
              <Select
                label="Taxable"
                placeholder={null}
                options={[
                  { label: "Yes", value: "true" },
                  { label: "No", value: "false" }
                ]}
                {...register("taxable")}
              />
              <Select
                label="Status"
                placeholder={null}
                error={errors.active?.message}
                options={[
                  { label: "Active", value: "true" },
                  { label: "Inactive", value: "false" }
                ]}
                {...register("active")}
              />
            </div>
          </section>

          <section className="h-full space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-bold uppercase text-slate-500">Inventory Policy</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Minimum Stock Qty"
                type="number"
                error={errors.minStockQty?.message}
                {...register("minStockQty", {
                  validate: (value) => value === "" || Number(value) >= 0 || "Minimum stock must be 0 or more"
                })}
              />
              <Select
                label="Tax Master"
                requiredMark={watchedTaxable === "true"}
                placeholder={taxOptions.length ? "Select Tax Master" : "No active taxes found"}
                error={errors.taxMasterId?.message}
                hint={watchedTaxable === "true" ? "GST breakup will be decided automatically during invoice creation." : "Non-taxable products do not require a tax master."}
                disabled={watchedTaxable !== "true"}
                options={taxOptions}
                {...register("taxMasterId", {
                  validate: (value) => watchedTaxable !== "true" || Boolean(value) || "Tax master is required for taxable products"
                })}
              />
              <div className="md:col-span-2 rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                Purchase rate, selling rate, and stock quantity are now derived from inventory batches. Use `Purchases` whenever inventory is replenished.
              </div>
            </div>
          </section>

        </form>
      </GlassCard>
    </div>
  );
};
