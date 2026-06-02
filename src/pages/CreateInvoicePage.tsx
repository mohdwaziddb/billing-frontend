import { Search, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { createCustomer, getCustomerByMobile } from "../api/customers";
import { createInvoice, getInvoices } from "../api/invoices";
import { getProducts } from "../api/products";
import { Button } from "../components/Button";
import { Header } from "../components/Header";
import { GlassCard } from "../components/GlassCard";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Select } from "../components/Select";
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import { useApiFormFeedback } from "../hooks/useApiFeedback";
import { useApiMessage } from "../hooks/useApiFeedback";
import type { Customer, CustomerRequest, Invoice, InvoiceRequest, Product } from "../types/api";

type FormValues = {
  customerId: string;
  invoiceDate: string;
  discountAmount: string;
  items: Array<{
    productId: string;
    qty: string;
    discountPercent: string;
  }>;
};

export const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [customerMobile, setCustomerMobile] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState<Invoice[]>([]);
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
    openingBalance: "",
    creditLimit: "",
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
      discountAmount: "",
      items: [{ productId: "", qty: "", discountPercent: "" }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    void getProducts().then((productData) => {
      setProducts(productData.filter((item) => item.active));
    });
  }, []);

  const watchItems = watch("items");
  const previewSubtotal = useMemo(() => {
    return watchItems.reduce((sum, item) => {
      const product = products.find((entry) => String(entry.id) === item.productId);
      if (!product) {
        return sum;
      }
      return sum + product.sellingPrice * Number(item.qty || 0);
    }, 0);
  }, [products, watchItems]);

  const lookupCustomerByMobile = async () => {
    clearMessage();
    setSelectedCustomer(null);
    setValue("customerId", "");

    const mobile = customerMobile.trim();
    if (!mobile) {
      setApiError({ message: "Enter mobile number to find customer" }, "Enter mobile number to find customer");
      return;
    }

    try {
      const customer = await getCustomerByMobile(mobile);
      setSelectedCustomer(customer);
      setShowNewCustomerForm(false);
      setNewCustomer({
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email ?? "",
        address: customer.address ?? "",
        gstNo: customer.gstNo ?? "",
        openingBalance: String(customer.openingBalance ?? ""),
        creditLimit: String(customer.creditLimit ?? ""),
        active: customer.active ? "true" : "false"
      });

      if (customer.active) {
        setValue("customerId", String(customer.id), { shouldValidate: true });
      } else {
        setApiError({ message: "Customer found, but it is inactive. Activate it before invoicing." }, "Customer found, but it is inactive. Activate it before invoicing.");
      }
    } catch (err: any) {
      setShowNewCustomerForm(true);
      setNewCustomer({
        name: "",
        mobile,
        email: "",
        address: "",
        gstNo: "",
        openingBalance: "",
        creditLimit: "",
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
      mobile: newCustomer.mobile.trim(),
      email: newCustomer.email.trim() || undefined,
      address: newCustomer.address.trim() || undefined,
      gstNo: newCustomer.gstNo.trim() || undefined,
      openingBalance: Number(newCustomer.openingBalance || 0),
      creditLimit: Number(newCustomer.creditLimit || 0),
      active: newCustomer.active === "true"
    };

    try {
      const createdCustomer = await createCustomer(payload);
      setSelectedCustomer(createdCustomer);
      setCustomerMobile(createdCustomer.mobile);
      setValue("customerId", String(createdCustomer.id), { shouldValidate: true });
      setShowNewCustomerForm(false);
      clearMessage();
    } catch (err: any) {
      applyCustomerCreateError(err, "Unable to create customer");
    } finally {
      setCreatingCustomer(false);
    }
  };

  const openPurchaseHistory = async () => {
    if (!selectedCustomer) {
      return;
    }

    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const invoices = await getInvoices({ customerId: selectedCustomer.id });
      setPurchaseHistory(invoices);
    } catch (err: any) {
      setApiError(err, "Unable to load purchase history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    clearMessage();
    const payload: InvoiceRequest = {
      customerId: Number(values.customerId),
      invoiceDate: values.invoiceDate,
      discountAmount: Number(values.discountAmount || 0),
      items: values.items.map((item) => ({
        productId: Number(item.productId),
        qty: Number(item.qty),
        discountPercent: Number(item.discountPercent || 0)
      }))
    };

    try {
      const invoice = await createInvoice(payload);
      navigate(`/invoices/${invoice.id}`);
    } catch (err: any) {
      setApiError(err, "Unable to create invoice");
    }
  };

  return (
    <div className="space-y-4">
      <Header title="Create invoice" subtitle="Find customers by mobile number, inspect purchase history, and submit invoice data while the backend remains the final authority for totals, tax, balance, and stock reduction." />
      <div className="grid gap-4 xl:grid-cols-[1fr_0.38fr]">
        <GlassCard className="p-6">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
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
              <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/70">Selected customer</p>
                    <h3 className="mt-2 text-xl font-bold text-white">{selectedCustomer.name}</h3>
                    <p className="mt-1 text-sm text-slate-300/80">{selectedCustomer.mobile}</p>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => void openPurchaseHistory()}>
                    <ShoppingBag size={16} />
                    Purchase History
                  </Button>
                </div>
              </div>
            ) : null}

            {showNewCustomerForm && !selectedCustomer ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">New customer</p>
                    <h3 className="mt-2 text-lg font-bold text-white">Add Customer for This Invoice</h3>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => setShowNewCustomerForm(false)}>
                    Close
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Customer Name"
                    requiredMark
                    error={customerCreateFieldErrors.name}
                    value={newCustomer.name}
                    onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))}
                  />
                  <Input
                    label="Mobile Number"
                    requiredMark
                    error={customerCreateFieldErrors.mobile}
                    value={newCustomer.mobile}
                    onChange={(event) => setNewCustomer((current) => ({ ...current, mobile: event.target.value }))}
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    error={customerCreateFieldErrors.email}
                    value={newCustomer.email}
                    onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))}
                  />
                  <Input
                    label="GST Number"
                    error={customerCreateFieldErrors.gstNo}
                    value={newCustomer.gstNo}
                    onChange={(event) => setNewCustomer((current) => ({ ...current, gstNo: event.target.value }))}
                  />
                  <Input
                    label="Address"
                    className="md:col-span-2"
                    error={customerCreateFieldErrors.address}
                    value={newCustomer.address}
                    onChange={(event) => setNewCustomer((current) => ({ ...current, address: event.target.value }))}
                  />
                  <Input
                    label="Opening Balance"
                    type="number"
                    step="0.01"
                    error={customerCreateFieldErrors.openingBalance}
                    value={newCustomer.openingBalance}
                    onChange={(event) => setNewCustomer((current) => ({ ...current, openingBalance: event.target.value }))}
                  />
                  <Input
                    label="Credit Limit"
                    type="number"
                    step="0.01"
                    error={customerCreateFieldErrors.creditLimit}
                    value={newCustomer.creditLimit}
                    onChange={(event) => setNewCustomer((current) => ({ ...current, creditLimit: event.target.value }))}
                  />
                </div>

                {customerCreateError ? <p className="mt-4 text-sm text-rose-300">{customerCreateError}</p> : null}

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" disabled={creatingCustomer} onClick={() => void handleCreateCustomer()}>
                    {creatingCustomer ? "Creating..." : "Add Customer"}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Invoice date" requiredMark type="date" error={errors.invoiceDate?.message} {...register("invoiceDate", { required: "Invoice date is required" })} />
              <Input label="Invoice-level discount" type="number" step="0.01" error={errors.discountAmount?.message} {...register("discountAmount")} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Invoice items</h2>
                <Button type="button" variant="secondary" onClick={() => append({ productId: "", qty: "", discountPercent: "" })}>
                  Add item
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <Select
                      label="Product"
                      requiredMark
                      placeholder="Select Product"
                      error={errors.items?.[index]?.productId?.message}
                      options={products.map((product) => ({ label: `${product.name} (${product.stockQty} left)`, value: product.id }))}
                      {...register(`items.${index}.productId`, { required: "Product is required" })}
                    />
                    <Input label="Qty" requiredMark type="number" error={errors.items?.[index]?.qty?.message} {...register(`items.${index}.qty`, { required: "Qty is required" })} />
                    <Input label="Item discount %" type="number" step="0.01" error={errors.items?.[index]?.discountPercent?.message} {...register(`items.${index}.discountPercent`)} />
                    <div className="flex items-end">
                      <Button type="button" variant="danger" className="w-full" onClick={() => remove(index)} disabled={fields.length === 1}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {serverError ? <p className="text-sm text-rose-300">{serverError}</p> : null}
            <Button disabled={isSubmitting} type="submit">{isSubmitting ? "Submitting..." : "Create invoice"}</Button>
          </form>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Preview only</p>
          <h2 className="mt-2 text-2xl font-bold text-white">UI estimate</h2>
          <p className="mt-3 text-sm text-slate-300/70">
            This card is only for rough display. Final subtotal, tax, stock impact, balance, and payment status always come from the backend.
          </p>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-slate-400">Approximate line subtotal</p>
              <p className="mt-2 text-2xl font-bold text-white">{formatCurrency(previewSubtotal)}</p>
            </div>
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
              Backend will validate customer status, stock, tax, discounts, total, and balance after submission.
            </div>
          </div>
        </GlassCard>
      </div>

      <Modal
        open={historyOpen}
        title={selectedCustomer ? `${selectedCustomer.name} Purchase History` : "Purchase History"}
        onClose={() => setHistoryOpen(false)}
      >
        {historyLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300/80">
            Loading purchase history...
          </div>
        ) : purchaseHistory.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300/80">
            No purchase history found for this customer.
          </div>
        ) : (
          <div className="max-h-[460px] space-y-3 overflow-auto pr-1 scrollbar-thin">
            {purchaseHistory.map((invoice) => (
              <div key={invoice.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-white">{invoice.invoiceNo}</p>
                    <p className="text-sm text-slate-400">{formatDate(invoice.invoiceDate)}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="font-semibold text-cyan-100">{formatCurrency(invoice.totalAmount)}</p>
                    <p className="text-xs text-slate-400">{invoice.paymentStatus}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
