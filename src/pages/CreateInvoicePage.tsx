import { ArrowLeft, Eye, History, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { createCustomer, getCustomerByMobile, getCustomerPurchaseHistory } from "../api/customers";
import { createInvoice } from "../api/invoices";
import { getProducts } from "../api/products";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useApiFormFeedback, useApiMessage } from "../hooks/useApiFeedback";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import { InvoiceCalculationService } from "../services/InvoiceCalculationService";
import { notificationService } from "../services/notificationService";
import type { Customer, CustomerPurchaseHistory, CustomerRequest, InvoiceRequest, Product } from "../types/api";

type InvoiceItemForm = {
  productId: string;
  qty: string;
  rate: string;
  taxPercent: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: string;
};

type FormValues = {
  customerId: string;
  invoiceDate: string;
  invoiceDiscountType: "FIXED" | "PERCENT";
  discountAmount: string;
  paidAmount: string;
  items: InvoiceItemForm[];
};

type RowIssue = {
  message: string;
};

const createEmptyItem = (): InvoiceItemForm => ({
  productId: "",
  qty: "1",
  rate: "0",
  taxPercent: "0",
  discountType: "FIXED",
  discountValue: "0"
});

const numberValue = (value: string | number | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const todayIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customerMobile, setCustomerMobile] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState<CustomerPurchaseHistory | null>(null);
  const { clearMessage, setApiError } = useApiMessage();
  const {
    fieldErrors: customerCreateFieldErrors,
    clearFeedback: clearCustomerCreateFeedback,
    applyApiError: applyCustomerCreateError
  } = useApiFormFeedback();
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    mobile: "",
    email: "",
    address: "",
    gstNo: "",
    active: "true"
  });

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      customerId: "",
      invoiceDate: todayIso(),
      invoiceDiscountType: "FIXED",
      discountAmount: "0",
      paidAmount: "0",
      items: [createEmptyItem()]
    }
  });

  const { fields, append, remove, update } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    void getProducts({ active: true, size: 1000 })
      .then((productData) => {
        setProducts(productData.filter((item) => item.active));
      })
      .catch((err: any) => setApiError(err, "Unable to load products"));
  }, [setApiError]);

  const watchedItems = watch("items");
  const invoiceDiscountType = watch("invoiceDiscountType");
  const invoiceDiscountInput = watch("discountAmount");
  const paidAmountInput = watch("paidAmount");

  const productMap = useMemo(
    () => new Map(products.map((product) => [String(product.id), product])),
    [products]
  );

  const invoiceSummary = useMemo(() => InvoiceCalculationService.calculate({
    invoiceDiscountType,
    invoiceDiscountValue: invoiceDiscountInput,
    paidAmount: paidAmountInput,
    rows: watchedItems.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      rate: item.rate,
      taxPercent: item.taxPercent,
      productDiscountType: item.discountType,
      productDiscountValue: item.discountValue
    }))
  }), [invoiceDiscountInput, invoiceDiscountType, paidAmountInput, watchedItems]);

  const rowIssues = useMemo(() => watchedItems.map((item, index) => {
    const product = productMap.get(item.productId);
    if (!product) {
      return [] as RowIssue[];
    }

    const qty = numberValue(item.qty);
    const rate = numberValue(item.rate);
    const taxPercent = numberValue(item.taxPercent);
    const lineBase = Math.max(0, qty * Math.max(0, rate));
    const discountValue = Math.max(0, numberValue(item.discountValue));
    const issues: RowIssue[] = [];

    if (qty < 1) {
      issues.push({ message: "Quantity must be at least 1." });
    }
    if (qty > product.stockQty) {
      issues.push({ message: `Requested quantity exceeds available stock (${product.stockQty}).` });
    }
    if (rate < 0) {
      issues.push({ message: "Rate cannot be negative." });
    }
    if (taxPercent < 0) {
      issues.push({ message: "Tax cannot be negative." });
    }
    if (item.discountType === "PERCENT" && discountValue > 100) {
      issues.push({ message: "Product discount percent cannot exceed 100%." });
    }
    if (item.discountType === "FIXED" && discountValue > lineBase) {
      issues.push({ message: "Product discount cannot exceed line amount." });
    }
    if ((invoiceSummary.rows[index]?.totalAmount ?? 0) < 0) {
      issues.push({ message: "Line total cannot be negative." });
    }

    return issues;
  }), [invoiceSummary.rows, productMap, watchedItems]);

  const summaryIssues = useMemo(() => {
    const issues: string[] = [];
    const invoiceDiscountValue = Math.max(0, numberValue(invoiceDiscountInput));
    if (invoiceDiscountType === "PERCENT" && invoiceDiscountValue > 100) {
      issues.push("Invoice discount percent cannot exceed 100%.");
    }
    if (invoiceDiscountType === "FIXED" && invoiceDiscountValue > invoiceSummary.afterProductDiscountSubtotal) {
      issues.push("Invoice discount cannot exceed subtotal after product discounts.");
    }
    if (numberValue(paidAmountInput) < 0) {
      issues.push("Paid amount cannot be negative.");
    }
    return issues;
  }, [invoiceDiscountInput, invoiceDiscountType, invoiceSummary.afterProductDiscountSubtotal, paidAmountInput]);

  const hasClientValidationErrors = rowIssues.some((issues) => issues.length > 0) || summaryIssues.length > 0;

  const lookupCustomerByMobile = async () => {
    clearMessage();
    setSelectedCustomer(null);
    setPurchaseHistory(null);
    setValue("customerId", "");

    const mobile = customerMobile.trim();
    if (!mobile) {
      notificationService.showError("Enter mobile number to find customer");
      return;
    }

    try {
      const customer = await getCustomerByMobile(mobile);
      setSelectedCustomer(customer);
      setCustomerDetailsOpen(false);
      setShowNewCustomerForm(false);
      setNewCustomer({
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email ?? "",
        address: customer.address ?? "",
        gstNo: customer.gstNo ?? "",
        active: customer.active ? "true" : "false"
      });

      if (customer.active) {
        setValue("customerId", String(customer.id), { shouldValidate: true });
      } else {
        setApiError({ message: "Customer found, but it is inactive. Activate it before invoicing." }, "Customer found, but it is inactive. Activate it before invoicing.");
      }
    } catch (err: any) {
      setShowNewCustomerForm(can("CUSTOMERS", "ADD"));
      setNewCustomer({
        name: "",
        mobile,
        email: "",
        address: "",
        gstNo: "",
        active: "true"
      });
      setApiError(err, "Unable to find customer");
    }
  };

  const handleCreateCustomer = async () => {
    clearCustomerCreateFeedback();
    setCreatingCustomer(true);

    const payload: CustomerRequest = {
      name: newCustomer.name.trim(),
      mobile: customerMobile.trim() || newCustomer.mobile.trim(),
      email: newCustomer.email.trim() || undefined,
      address: newCustomer.address.trim() || undefined,
      gstNo: newCustomer.gstNo.trim() || undefined,
      active: newCustomer.active === "true"
    };

    try {
      const createdCustomer = await createCustomer(payload);
      setSelectedCustomer(createdCustomer);
      setCustomerDetailsOpen(false);
      setCustomerMobile(createdCustomer.mobile);
      setValue("customerId", String(createdCustomer.id), { shouldValidate: true });
      setShowNewCustomerForm(false);
      clearMessage();
      notificationService.showSuccess(CommonSuccessMessageUtil.created("Customer"));
    } catch (err: any) {
      applyCustomerCreateError(err, "Unable to create customer");
    } finally {
      setCreatingCustomer(false);
    }
  };

  const loadPurchaseHistory = async (page = 0) => {
    if (!selectedCustomer) {
      return;
    }

    setHistoryLoading(true);
    try {
      const history = await getCustomerPurchaseHistory(selectedCustomer.id, { page, size: DEFAULT_PAGE_SIZE });
      setPurchaseHistory(history);
    } catch (err: any) {
      setApiError(err, "Unable to load purchase history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const openPurchaseHistory = async () => {
    setHistoryOpen(true);
    await loadPurchaseHistory(0);
  };

  const clearCustomerSelection = () => {
    clearMessage();
    setCustomerMobile("");
    setSelectedCustomer(null);
    setPurchaseHistory(null);
    setShowNewCustomerForm(false);
    setValue("customerId", "", { shouldValidate: true });
  };

  const syncProductDefaults = (index: number, productId: string) => {
    const product = productMap.get(productId);
    if (!product) {
      setValue(`items.${index}.rate`, "0", { shouldDirty: true, shouldValidate: true });
      setValue(`items.${index}.taxPercent`, "0", { shouldDirty: true, shouldValidate: true });
      return;
    }
    setValue(`items.${index}.rate`, String(product.sellingPrice), { shouldDirty: true, shouldValidate: true });
    setValue(`items.${index}.taxPercent`, String(product.taxPercent), { shouldDirty: true, shouldValidate: true });
    const currentQty = numberValue(watchedItems[index]?.qty);
    if (currentQty <= 0) {
      setValue(`items.${index}.qty`, "1", { shouldDirty: true, shouldValidate: true });
    }
  };

  const clearProductLine = (index: number) => {
    update(index, createEmptyItem());
  };

  const removeProductLine = (index: number) => {
    if (fields.length === 1) {
      clearProductLine(index);
      return;
    }
    remove(index);
  };

  const onSubmit = async (values: FormValues) => {
    clearMessage();

    if (hasClientValidationErrors) {
      setApiError({ message: rowIssues.flat().map((issue) => issue.message)[0] ?? summaryIssues[0] ?? "Please fix invoice issues before saving." }, "Please fix invoice issues before saving.");
      return;
    }

    const payload: InvoiceRequest = {
      customerId: Number(values.customerId),
      invoiceDate: values.invoiceDate,
      discountAmount: Number(invoiceSummary.invoiceDiscount.toFixed(2)),
      items: values.items.map((item) => ({
        productId: Number(item.productId),
        qty: Number(item.qty),
        price: Number(item.rate),
        taxPercent: Number(item.taxPercent),
        discountType: item.discountType,
        discountValue: Number(item.discountValue || 0),
        discountPercent: (() => {
          const lineBase = Number(item.rate || 0) * Number(item.qty || 0);
          const value = Number(item.discountValue || 0);
          if (lineBase <= 0) {
            return 0;
          }
          return item.discountType === "FIXED" ? Math.min(100, (Math.max(0, value) / lineBase) * 100) : Math.max(0, value);
        })()
      }))
    };

    try {
      const invoice = await createInvoice(payload);
      notificationService.showSuccess(CommonSuccessMessageUtil.created("Invoice"));
      navigate(`/invoices/${invoice.id}`);
    } catch (err: any) {
      setApiError(err, "Unable to create invoice");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header title="Create Invoice" subtitle="" />

      <form id="create-invoice-form" className="mx-auto grid w-full max-w-[1660px] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => navigate("/invoices")}>
                <ArrowLeft size={16} />
                Back
              </Button>
              <Button disabled={isSubmitting || hasClientValidationErrors} type="submit">
                {isSubmitting ? "Saving..." : "Save Invoice"}
              </Button>
          </div>

          <GlassCard className="p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-950">Customer Details</h3>
            </div>

            <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(220px,360px)_190px_170px] xl:items-start">
              <div className="relative">
                <Input
                  label="Mobile"
                  requiredMark
                  placeholder="Search mobile"
                  value={customerMobile}
                  onChange={(event) => setCustomerMobile(event.target.value)}
                  onClear={clearCustomerSelection}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void lookupCustomerByMobile();
                    }
                  }}
                />
              </div>
              <div className="pt-7">
                <Button className="w-full whitespace-nowrap" type="button" variant="secondary" onClick={() => void lookupCustomerByMobile()}>
                  <Search size={16} />
                  Find Customer
                </Button>
              </div>
              <div>
                <Input
                  label="Invoice Date"
                  requiredMark
                  type="date"
                  error={errors.invoiceDate?.message}
                  {...register("invoiceDate", { required: "Invoice date is required" })}
                />
              </div>
            </div>

            <input type="hidden" {...register("customerId", { required: "Customer is required" })} />

            {selectedCustomer ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Selected Customer</p>
                    <div className="mt-2 min-w-0">
                      <p className="truncate text-base font-extrabold text-slate-950">{selectedCustomer.name}</p>
                      <p className="mt-1 text-sm font-bold text-slate-600">{selectedCustomer.mobile}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button type="button" variant="ghost" onClick={() => setCustomerDetailsOpen(true)}>
                      <Eye size={16} />
                      View Details
                    </Button>
                    {selectedCustomer.hasPurchaseHistory ? (
                      <Button type="button" variant="ghost" onClick={() => void openPurchaseHistory()}>
                        <History size={16} />
                        Purchase History
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {showNewCustomerForm && !selectedCustomer && can("CUSTOMERS", "ADD") ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-950">Add New Customer</p>
                  <Button type="button" variant="ghost" onClick={() => setShowNewCustomerForm(false)}>Close</Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Input label="Customer Name" requiredMark error={customerCreateFieldErrors.name} value={newCustomer.name} onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))} />
                  <Input label="Mobile Number" requiredMark readOnly className="cursor-not-allowed bg-slate-100 text-slate-500" error={customerCreateFieldErrors.mobile} value={newCustomer.mobile} />
                  <Input label="Email Address" type="email" error={customerCreateFieldErrors.email} value={newCustomer.email} onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))} />
                  <Input label="GST Number" error={customerCreateFieldErrors.gstNo} value={newCustomer.gstNo} onChange={(event) => setNewCustomer((current) => ({ ...current, gstNo: event.target.value }))} />
                  <Input label="Address" className="md:col-span-2 xl:col-span-4" error={customerCreateFieldErrors.address} value={newCustomer.address} onChange={(event) => setNewCustomer((current) => ({ ...current, address: event.target.value }))} />
                </div>
                <div className="mt-3">
                  <Button type="button" disabled={creatingCustomer} onClick={() => void handleCreateCustomer()}>
                    {creatingCustomer ? "Creating..." : "Add Customer"}
                  </Button>
                </div>
              </div>
            ) : null}
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-950">Products</h3>
              <Button type="button" variant="secondary" onClick={() => append(createEmptyItem())}>
                <Plus size={16} />
                Add Product
              </Button>
            </div>

            <div className="hidden grid-cols-[minmax(220px,1fr)_78px_120px_112px_112px_46px] gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
              <div>Product</div>
              <div>Qty</div>
              <div>Rate</div>
              <div>Discount</div>
              <div className="text-right">Total</div>
              <div></div>
            </div>

            <div className="mt-3 space-y-3">
              {fields.map((field, index) => {
                  const item = watchedItems[index] ?? createEmptyItem();
                  const hasProduct = Boolean(item.productId);
                  const lineSummary = invoiceSummary.rows[index];
                  const productRegister = register(`items.${index}.productId`, { required: "Product is required" });
                  const rateRegister = register(`items.${index}.rate`, {
                    required: "Rate is required",
                    validate: (value) => Number(value) >= 0 || "Rate cannot be negative"
                  });
                  const taxRegister = register(`items.${index}.taxPercent`, {
                    required: "Tax is required",
                    validate: (value) => Number(value) >= 0 || "Tax cannot be negative"
                  });

                  return (
                    <div key={field.id} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm shadow-slate-200/30">
                      <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_78px_120px_112px_112px_46px] md:items-center">
                        <div className="md:min-w-0">
                          <label className="sr-only">Product</label>
                          <select
                            {...productRegister}
                            className={`h-[46px] w-full rounded-[var(--radius-control)] border bg-white py-0 pl-3 pr-9 text-sm font-medium text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)] ${errors.items?.[index]?.productId?.message ? "border-rose-400/70" : "border-slate-200"}`}
                            onChange={(event) => {
                              productRegister.onChange(event);
                              syncProductDefaults(index, event.target.value);
                            }}
                          >
                            <option value="">Select Product</option>
                            {products.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                {entry.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 md:sr-only">Qty</label>
                          <input
                            type="number"
                            min={1}
                            className={`h-[46px] w-full rounded-[var(--radius-control)] border bg-white px-2 text-center text-sm font-semibold text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)] ${errors.items?.[index]?.qty?.message ? "border-rose-400/70" : "border-slate-200"}`}
                            {...register(`items.${index}.qty`, {
                              required: "Quantity is required",
                              validate: (value) => Number(value) >= 1 || "Quantity must be at least 1"
                            })}
                            aria-label="Qty"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 md:sr-only">Rate</label>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            aria-label="Rate"
                            readOnly
                            aria-readonly="true"
                            placeholder="Rate"
                            {...rateRegister}
                            className={`h-[46px] w-full cursor-not-allowed rounded-[var(--radius-control)] border bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none transition ${errors.items?.[index]?.rate?.message ? "border-rose-400/70" : "border-slate-200"}`}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 md:sr-only">Discount</label>
                          <input type="hidden" value="FIXED" {...register(`items.${index}.discountType`)} />
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            aria-label="Discount"
                            placeholder="Disc."
                            {...register(`items.${index}.discountValue`, {
                              validate: (value) => Number(value || 0) >= 0 || "Discount cannot be negative"
                            })}
                            className={`h-[46px] w-full rounded-[var(--radius-control)] border bg-white px-2 text-sm font-medium text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)] ${errors.items?.[index]?.discountValue?.message ? "border-rose-400/70" : "border-slate-200"}`}
                          />
                        </div>

                        <div className="flex h-[46px] items-center justify-end rounded-[var(--radius-control)] border border-slate-200 bg-slate-50 px-3">
                          <span className="truncate text-sm font-extrabold text-slate-950">{hasProduct ? formatCurrency(lineSummary?.totalAmount ?? 0) : "--"}</span>
                        </div>

                        <div className="flex h-[46px] items-center justify-center">
                          <Button type="button" variant="danger" className="h-10 w-10 min-w-0 px-0" aria-label="Remove product line" title="Remove" onClick={() => removeProductLine(index)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                      <input type="hidden" {...taxRegister} />
                    </div>
                  );
              })}
            </div>
          </GlassCard>

        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <GlassCard className="p-3 md:p-4">
            <section className="space-y-3">
              <h3 className="text-base font-bold text-slate-950">Invoice Summary</h3>

              <div className="grid gap-2">
                <Select
                  label="Invoice Discount Type"
                  placeholder={null}
                  options={[{ label: "Fixed", value: "FIXED" }, { label: "Percent", value: "PERCENT" }]}
                  {...register("invoiceDiscountType")}
                />
                <Input
                  label="Invoice Discount"
                  type="number"
                  step="0.01"
                  error={summaryIssues.find((issue) => issue.toLowerCase().includes("invoice discount"))}
                  {...register("discountAmount")}
                />
                <Input
                  label="Paid Amount"
                  type="number"
                  step="0.01"
                  error={summaryIssues.find((issue) => issue.toLowerCase().includes("paid amount"))}
                  {...register("paidAmount")}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="space-y-2 text-sm">
                  <SummaryRow label="Items" value={String(fields.length)} />
                  <SummaryRow label="Subtotal" value={formatCurrency(invoiceSummary.subtotal)} />
                  <SummaryRow label="Product Discount" value={`-${formatCurrency(invoiceSummary.productDiscountTotal)}`} tone="danger" />
                  <SummaryRow label="Invoice Discount" value={`-${formatCurrency(invoiceSummary.invoiceDiscount)}`} tone="danger" />
                  <SummaryRow label="Tax" value={formatCurrency(invoiceSummary.taxAmount)} />
                  <div className="border-t border-slate-200 pt-2">
                    <SummaryRow label="Grand Total" value={formatCurrency(invoiceSummary.grandTotal)} strong />
                  </div>
                  <SummaryRow label="Paid Amount" value={formatCurrency(invoiceSummary.paidAmount)} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:color-mix(in_srgb,var(--theme-color)_24%,#d8e0ec)] bg-white px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Balance Due</p>
                <p className="text-xl font-extrabold text-rose-600">{formatCurrency(invoiceSummary.outstandingAmount)}</p>
              </div>
            </section>
          </GlassCard>
        </aside>
      </form>

      <Modal
        open={customerDetailsOpen}
        title={selectedCustomer ? `${selectedCustomer.name} Details` : "Customer Details"}
        onClose={() => setCustomerDetailsOpen(false)}
      >
        {selectedCustomer ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Customer</p>
                <p className="mt-2 font-semibold text-white">{selectedCustomer.name}</p>
                <p className="mt-1 text-sm text-slate-400">{selectedCustomer.mobile}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Contact</p>
                <p className="mt-2 font-semibold text-white">{selectedCustomer.email ?? "--"}</p>
                <p className="mt-1 text-sm text-slate-400">{selectedCustomer.address ?? "--"}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Total Purchase</p>
                <p className="mt-2 text-xl font-bold text-white">{formatCurrency(selectedCustomer.totalPurchaseAmount)}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Total Paid</p>
                <p className="mt-2 text-xl font-bold text-white">{formatCurrency(selectedCustomer.totalPaidAmount)}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Discount Given</p>
                <p className="mt-2 text-xl font-bold text-white">{formatCurrency(selectedCustomer.totalDiscountGiven)}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Outstanding Balance</p>
                <p className="mt-2 text-xl font-bold text-rose-200">{formatCurrency(selectedCustomer.outstandingBalance)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={historyOpen}
        title={purchaseHistory ? `${purchaseHistory.customerName} Purchase History` : "Purchase History"}
        onClose={() => setHistoryOpen(false)}
      >
        {historyLoading ? (
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300/80">Loading purchase history...</div>
        ) : !purchaseHistory || purchaseHistory.invoices.length === 0 ? (
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300/80">No purchase history found for this customer.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Customer Name</p>
                <p className="mt-2 font-semibold text-white">{purchaseHistory.customerName}</p>
                <p className="mt-1 text-sm text-slate-400">{purchaseHistory.mobile}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Address</p>
                <p className="mt-2 font-semibold text-white">{purchaseHistory.address ?? "--"}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Total Purchase</p>
                <p className="mt-2 text-xl font-bold text-white">{formatCurrency(purchaseHistory.summary.totalPurchaseAmount)}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Total Paid</p>
                <p className="mt-2 text-xl font-bold text-white">{formatCurrency(purchaseHistory.summary.totalPaidAmount)}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Total Discount</p>
                <p className="mt-2 text-xl font-bold text-white">{formatCurrency(purchaseHistory.summary.totalDiscountGiven)}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Outstanding Balance</p>
                <p className="mt-2 text-xl font-bold text-rose-200">{formatCurrency(purchaseHistory.summary.outstandingBalance)}</p>
              </div>
            </div>
            <Table
              data={purchaseHistory.invoices}
              columns={[
                { key: "invoice", header: "Invoice Number", render: (item) => <span className="font-semibold text-white">{item.invoiceNo}</span> },
                { key: "date", header: "Invoice Date", render: (item) => formatDate(item.invoiceDate) },
                { key: "total", header: "Total Amount", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.totalAmount)}</span> },
                { key: "discount", header: "Discount", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.discountAmount)}</span> },
                { key: "paid", header: "Paid Amount", className: "text-right", render: (item) => <span className="block text-right">{formatCurrency(item.paidAmount)}</span> },
                { key: "pending", header: "Pending Amount", className: "text-right", render: (item) => <span className="block text-right text-rose-200">{formatCurrency(item.balanceAmount)}</span> },
                { key: "status", header: "Payment Status", render: (item) => <StatusBadge label={item.paymentStatus} /> }
              ]}
            />
            <Pagination
              page={purchaseHistory.page}
              size={purchaseHistory.size}
              totalRecords={purchaseHistory.totalRecords}
              totalPages={purchaseHistory.totalPages}
              disabled={historyLoading}
              onPageChange={(nextPage) => void loadPurchaseHistory(nextPage)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

const SummaryRow = ({
  label,
  value,
  tone,
  strong = false
}: {
  label: string;
  value: string;
  tone?: "danger";
  strong?: boolean;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className={strong ? "font-bold text-slate-950" : "text-slate-500"}>{label}</span>
    <span className={`${strong ? "text-base font-extrabold" : "font-semibold"} ${tone === "danger" ? "text-rose-200" : "text-slate-950"}`}>
      {value}
    </span>
  </div>
);
