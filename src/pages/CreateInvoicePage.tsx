import { ArrowLeft, Eye, Search, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { createCustomer, getCustomerByMobile, getCustomerPurchaseHistory } from "../api/customers";
import { createInvoice } from "../api/invoices";
import { getProducts } from "../api/products";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
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

type FormValues = {
  customerId: string;
  invoiceDate: string;
  invoiceDiscountType: "FIXED" | "PERCENT";
  discountAmount: string;
  paidAmount: string;
  items: Array<{
    productId: string;
    qty: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: string;
  }>;
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
  const { message: serverError, clearMessage, setApiError } = useApiMessage();
  const {
    message: customerCreateError,
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
      invoiceDate: new Date().toISOString().slice(0, 10),
      invoiceDiscountType: "FIXED",
      discountAmount: "0",
      paidAmount: "0",
      items: [{ productId: "", qty: "1", discountType: "FIXED", discountValue: "0" }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    void getProducts({ active: true, size: 1000 }).then((productData) => {
      setProducts(productData.filter((item) => item.active));
    });
  }, []);

  const watchItems = watch("items");
  const invoiceDiscountType = watch("invoiceDiscountType");
  const invoiceDiscountInput = watch("discountAmount");
  const paidAmountInput = watch("paidAmount");
  const invoiceSummary = useMemo(() => {
    return InvoiceCalculationService.calculate({
      invoiceDiscountType,
      invoiceDiscountValue: invoiceDiscountInput,
      paidAmount: paidAmountInput,
      rows: watchItems.map((item) => {
      const product = products.find((entry) => String(entry.id) === item.productId);
      return {
          productId: item.productId,
          qty: item.qty,
          rate: product?.sellingPrice ?? 0,
          taxPercent: product?.taxPercent ?? 0,
          productDiscountType: item.discountType,
          productDiscountValue: item.discountValue
      };
      })
    });
  }, [invoiceDiscountInput, invoiceDiscountType, paidAmountInput, products, watchItems]);

  const lookupCustomerByMobile = async () => {
    clearMessage();
    setSelectedCustomer(null);
    setPurchaseHistory(null);
    setValue("customerId", "");

    const mobile = customerMobile.trim();
    if (!mobile) {
      setApiError({ message: "Enter mobile number to find customer" }, "Enter mobile number to find customer");
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

  const onSubmit = async (values: FormValues) => {
    clearMessage();
    const payload: InvoiceRequest = {
      customerId: Number(values.customerId),
      invoiceDate: values.invoiceDate,
      discountAmount: Number(invoiceSummary.invoiceDiscount.toFixed(2)),
      items: values.items.map((item) => ({
        productId: Number(item.productId),
        qty: Number(item.qty),
        discountType: item.discountType,
        discountValue: Number(item.discountValue || 0),
        discountPercent: (() => {
          const product = products.find((entry) => String(entry.id) === item.productId);
          const lineBase = Number(product?.sellingPrice ?? 0) * Number(item.qty || 0);
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
      <Header
        title="Create Invoice"
        subtitle="Search customers by mobile, review purchase history, and submit invoice items through a focused billing workflow."
      />
      <div className="mx-auto w-full max-w-[1400px] flex-1">
        <div className="mb-4 flex flex-col gap-3 rounded-[22px] border border-slate-200 bg-white/92 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CommonBreadcrumb items={[{ label: "Invoices", to: "/invoices" }, { label: "Create Invoice" }]} />
            <h2 className="mt-1 text-2xl font-bold text-slate-950">Professional Billing Screen</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate("/invoices")}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <Button disabled={isSubmitting} type="submit" form="create-invoice-form">
              {isSubmitting ? "Submitting..." : "Save Invoice"}
            </Button>
          </div>
        </div>
        <form id="create-invoice-form" className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <GlassCard className="p-5">
              <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase text-slate-500">Customer Information</h3>
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
              <Input
                label="Customer Mobile Number"
                requiredMark
                placeholder="Enter Customer Mobile Number"
                error={errors.customerId?.message}
                value={customerMobile}
                onChange={(event) => setCustomerMobile(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void lookupCustomerByMobile();
                  }
                }}
              />
              <div className="flex items-end">
                <Button className="w-full" type="button" variant="secondary" onClick={() => void lookupCustomerByMobile()}>
                  <Search size={16} />
                  Find Customer
                </Button>
              </div>
            </div>

            <input type="hidden" {...register("customerId", { required: "Customer is required" })} />

            {selectedCustomer ? (
              <div className="rounded-[26px] border border-sky-300/20 bg-sky-400/10 p-4 md:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-sky-100/70">Selected customer</p>
                    <h3 className="mt-2 text-xl font-bold text-white">{selectedCustomer.name}</h3>
                    <p className="mt-1 text-sm text-slate-300/80">{selectedCustomer.mobile}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" className="min-h-10 px-3" onClick={() => setCustomerDetailsOpen(true)}>
                      <Eye size={16} />
                      View Details
                    </Button>
                    {selectedCustomer.hasPurchaseHistory ? (
                      <Button type="button" variant="ghost" className="min-h-10 px-3" onClick={() => void openPurchaseHistory()}>
                        <ShoppingBag size={16} />
                        History
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
              </section>
            </GlassCard>

            {showNewCustomerForm && !selectedCustomer && can("CUSTOMERS", "ADD") ? (
              <GlassCard className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">New customer</p>
                    <h3 className="mt-2 text-lg font-bold text-white">Add customer for this invoice</h3>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => setShowNewCustomerForm(false)}>
                    Close
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input label="Customer Name" requiredMark error={customerCreateFieldErrors.name} value={newCustomer.name} onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))} />
                  <Input
                    label="Mobile Number"
                    requiredMark
                    readOnly
                    aria-readonly="true"
                    className="cursor-not-allowed bg-slate-900/70 text-slate-300"
                    error={customerCreateFieldErrors.mobile}
                    value={newCustomer.mobile}
                  />
                  <Input label="Email Address" type="email" error={customerCreateFieldErrors.email} value={newCustomer.email} onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))} />
                  <Input label="GST Number" error={customerCreateFieldErrors.gstNo} value={newCustomer.gstNo} onChange={(event) => setNewCustomer((current) => ({ ...current, gstNo: event.target.value }))} />
                  <Input label="Address" className="md:col-span-2" error={customerCreateFieldErrors.address} value={newCustomer.address} onChange={(event) => setNewCustomer((current) => ({ ...current, address: event.target.value }))} />
                </div>

                {customerCreateError ? <div className="mt-4 rounded-[24px] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{customerCreateError}</div> : null}

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" disabled={creatingCustomer} onClick={() => void handleCreateCustomer()}>
                    {creatingCustomer ? "Creating..." : "Add Customer"}
                  </Button>
                </div>
              </GlassCard>
            ) : null}

            <GlassCard className="p-5">
              <section className="space-y-4">
              <h3 className="text-sm font-bold uppercase text-slate-500">Invoice Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Invoice date" requiredMark type="date" error={errors.invoiceDate?.message} {...register("invoiceDate", { required: "Invoice date is required" })} />
              </div>
              </section>
            </GlassCard>

            <GlassCard className="p-5">
              <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-bold uppercase text-slate-500">Invoice Items</h3>
                <Button type="button" variant="secondary" onClick={() => append({ productId: "", qty: "1", discountType: "FIXED", discountValue: "0" })}>
                  Add item
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_110px_120px_120px_140px_140px_110px]">
                    <Select
                      label="Product"
                      requiredMark
                      placeholder="Select Product"
                      error={errors.items?.[index]?.productId?.message}
                      options={products.map((product) => ({ label: `${product.name} (${product.stockQty} left)`, value: product.id }))}
                      {...register(`items.${index}.productId`, { required: "Product is required" })}
                    />
                    <Input label="Qty" requiredMark type="number" error={errors.items?.[index]?.qty?.message} {...register(`items.${index}.qty`, { required: "Qty is required" })} />
                    <Input label="Rate" value={formatCurrency(invoiceSummary.rows[index]?.rate ?? 0)} readOnly className="bg-slate-100 text-slate-600" />
                    <Input label="Tax" value={`${invoiceSummary.rows[index]?.taxPercent ?? 0}%`} readOnly className="bg-slate-100 text-slate-600" />
                    <Select
                      label="Discount Type"
                      placeholder={null}
                      options={[{ label: "Percent", value: "PERCENT" }, { label: "Fixed", value: "FIXED" }]}
                      {...register(`items.${index}.discountType`)}
                    />
                    <Input label="Product Discount" type="number" step="0.01" error={errors.items?.[index]?.discountValue?.message} {...register(`items.${index}.discountValue`)} />
                    <Input label="Line Total" value={formatCurrency(invoiceSummary.rows[index]?.totalAmount ?? 0)} readOnly className="bg-slate-100 text-slate-600" />
                    <div className="flex items-end">
                      <Button type="button" variant="danger" className="w-full" onClick={() => remove(index)} disabled={fields.length === 1}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
            </GlassCard>

            {serverError ? <div className="rounded-[24px] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{serverError}</div> : null}
          </div>
          <aside className="xl:sticky xl:top-24 xl:self-start">
            <GlassCard className="p-5">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase text-slate-500">Invoice Summary</h3>
                <div className="grid gap-3">
                  <Select
                    label="Invoice Discount Type"
                    placeholder={null}
                    options={[{ label: "Fixed", value: "FIXED" }, { label: "Percent", value: "PERCENT" }]}
                    {...register("invoiceDiscountType")}
                  />
                  <Input label="Invoice Discount" type="number" step="0.01" error={errors.discountAmount?.message} {...register("discountAmount")} />
                  <Input label="Paid Amount" type="number" step="0.01" error={errors.paidAmount?.message} {...register("paidAmount")} />
                </div>
                <div className="space-y-2 rounded-2xl bg-white/5 p-4 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-slate-400">Subtotal</span><span className="font-semibold text-white">{formatCurrency(invoiceSummary.subtotal)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-400">Product Discounts</span><span className="font-semibold amount-danger">-{formatCurrency(invoiceSummary.productDiscountTotal)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-400">After Product Discounts</span><span className="font-semibold text-white">{formatCurrency(invoiceSummary.afterProductDiscountSubtotal)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-400">Invoice Discount</span><span className="font-semibold amount-danger">-{formatCurrency(invoiceSummary.invoiceDiscount)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-400">Tax</span><span className="font-semibold text-white">{formatCurrency(invoiceSummary.taxAmount)}</span></div>
                  <div className="flex justify-between gap-3 border-t border-white/10 pt-3 text-base"><span className="font-bold text-white">Grand Total</span><span className="font-extrabold text-white">{formatCurrency(invoiceSummary.grandTotal)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-400">Paid Amount</span><span className="font-semibold text-white">{formatCurrency(invoiceSummary.paidAmount)}</span></div>
                  <div className="flex justify-between gap-3 text-base"><span className="font-bold text-white">Outstanding Amount</span><span className="font-extrabold amount-danger">{formatCurrency(invoiceSummary.outstandingAmount)}</span></div>
                </div>
              </div>
            </GlassCard>
          </aside>
        </form>
      </div>

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

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Current Balance</p>
                <p className="mt-2 font-semibold text-white">{formatCurrency(selectedCustomer.currentBalance)}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Status</p>
                <div className="mt-2">
                  <StatusBadge label={selectedCustomer.active ? "ACTIVE" : "INACTIVE"} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">GST Number</p>
                <p className="mt-2 font-semibold text-white">{selectedCustomer.gstNo ?? "--"}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Last Purchase</p>
                <p className="mt-2 font-semibold text-white">{formatDate(selectedCustomer.lastPurchaseDate)}</p>
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
