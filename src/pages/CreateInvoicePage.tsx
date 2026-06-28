import { ArrowLeft, Eye, History, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type FieldErrors, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { createCustomer, getCustomerByMobile, getCustomerPurchaseHistory } from "../api/customers";
import { createInvoice } from "../api/invoices";
import { getPaymentModes } from "../api/paymentModes";
import { getProducts } from "../api/products";
import { getStates } from "../api/states";
import { getActiveReferralUsers } from "../api/users";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { CommonDeleteIconButton } from "../components/CommonDeleteAction";
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
import type { Customer, CustomerPurchaseHistory, CustomerRequest, InvoiceRequest, PaymentModeMaster, Product, UserProfile } from "../types/api";

type InvoiceItemForm = {
  productId: string;
  qty: string;
  rate: string;
  discountValue: string;
};

type FormValues = {
  customerId: string;
  invoiceDate: string;
  referByUserId: string;
  invoiceDiscountType: "FIXED" | "PERCENT";
  discountAmount: string;
  paidAmount: string;
  paymentMode: string;
  items: InvoiceItemForm[];
};

type RowIssue = {
  message: string;
};

const createEmptyItem = (): InvoiceItemForm => ({
  productId: "",
  qty: "1",
  rate: "0",
  discountValue: "0"
});

const numberValue = (value: string | number | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const MOBILE_VALIDATION_MESSAGE = "Enter a 10-digit mobile number.";

const normalizeMobileNumber = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
};

const isValidMobileNumber = (value: string) => /^\d{10}$/.test(normalizeMobileNumber(value));

const normalizeStateName = (value?: string | null) => value?.trim().toLowerCase() ?? "";
const defaultPaymentModeCode = (modes: PaymentModeMaster[]) => {
  const cashMode = modes.find((mode) => mode.modeCode === "CASH");
  return cashMode?.modeCode ?? modes[0]?.modeCode ?? "";
};

const todayIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const getInvoiceValidationMessage = (errors: FieldErrors<FormValues>) => {
  if (errors.customerId?.message) {
    return "Find and select a customer before saving invoice.";
  }
  if (errors.invoiceDate?.message) {
    return String(errors.invoiceDate.message);
  }

  const itemErrors = errors.items;
  if (Array.isArray(itemErrors)) {
    for (const itemError of itemErrors) {
      const message =
        itemError?.productId?.message ??
        itemError?.qty?.message ??
        itemError?.rate?.message ??
        itemError?.discountValue?.message;
      if (message) {
        return String(message);
      }
    }
  }

  return "Please fill all required invoice fields before saving.";
};

export const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeMaster[]>([]);
  const [referralUsers, setReferralUsers] = useState<UserProfile[]>([]);
  const [states, setStates] = useState<Array<{ id: number; stateName: string; countryName: string }>>([]);
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
    city: "",
    stateId: "",
    state: "",
    country: "India",
    pincode: "",
    gstNo: "",
    gstRegistered: "false",
    active: "true"
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      customerId: "",
      invoiceDate: todayIso(),
      referByUserId: "",
      invoiceDiscountType: "FIXED",
      discountAmount: "0",
      paidAmount: "0",
      paymentMode: "",
      items: [createEmptyItem()]
    }
  });

  const { fields, append, remove, update, replace } = useFieldArray({ control, name: "items" });

  useEffect(() => {
    void Promise.all([getProducts({ active: true, size: 1000 }), getPaymentModes({ active: true, size: 1000 }), getActiveReferralUsers(), getStates()])
      .then(([productData, modeData, referralData, stateData]) => {
        setProducts(productData.filter((item) => item.active));
        setPaymentModes(modeData);
        setReferralUsers(referralData.filter((item) => item.active));
        setStates(stateData);
      })
      .catch((err: any) => setApiError(err, "Unable to load invoice setup data"));
  }, [setApiError]);

  const watchedItems = useWatch({ control, name: "items" }) ?? [];
  const invoiceDateInput = useWatch({ control, name: "invoiceDate" }) ?? "";
  const invoiceDiscountType = useWatch({ control, name: "invoiceDiscountType" }) ?? "FIXED";
  const invoiceDiscountInput = useWatch({ control, name: "discountAmount" }) ?? "0";
  const paidAmountInput = useWatch({ control, name: "paidAmount" }) ?? "0";
  const paymentModeInput = useWatch({ control, name: "paymentMode" }) ?? "";
  const previousInvoiceDiscountTypeRef = useRef<typeof invoiceDiscountType | null>(null);
  const autoFillPaidAmountRef = useRef(true);

  const productMap = useMemo(
    () => new Map(products.map((product) => [String(product.id), product])),
    [products]
  );

  const sameState = useMemo(() => {
    const companyStateId = user?.company?.stateId ?? null;
    const customerStateId = selectedCustomer?.stateId ?? null;
    if (companyStateId && customerStateId) {
      return companyStateId === customerStateId;
    }
    const companyStateName = normalizeStateName(user?.company?.state);
    const customerStateName = normalizeStateName(selectedCustomer?.state);
    return Boolean(companyStateName && customerStateName && companyStateName === customerStateName);
  }, [selectedCustomer?.state, selectedCustomer?.stateId, user?.company?.state, user?.company?.stateId]);

  const invoiceSummary = useMemo(() => InvoiceCalculationService.calculate({
    sameState,
    invoiceDiscountType,
    invoiceDiscountValue: invoiceDiscountInput,
    paidAmount: paidAmountInput,
    rows: watchedItems.map((item) => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        qty: item.qty,
        rate: item.rate,
        taxPercent: product?.taxPercent ?? 0,
        taxType: product?.taxType,
        taxable: product?.taxable ?? true,
        taxName: product?.taxName,
        hsnCode: product?.hsnCode,
        productDiscountType: "FIXED",
        productDiscountValue: item.discountValue
      };
    })
  }), [invoiceDiscountInput, invoiceDiscountType, paidAmountInput, productMap, sameState, watchedItems]);

  useEffect(() => {
    if (previousInvoiceDiscountTypeRef.current === null) {
      previousInvoiceDiscountTypeRef.current = invoiceDiscountType;
      return;
    }

    if (previousInvoiceDiscountTypeRef.current !== invoiceDiscountType) {
      previousInvoiceDiscountTypeRef.current = invoiceDiscountType;
      setValue("discountAmount", "0", { shouldDirty: true, shouldValidate: true });
    }
  }, [invoiceDiscountType, setValue]);

  useEffect(() => {
    if (!autoFillPaidAmountRef.current) {
      return;
    }
    setValue("paidAmount", invoiceSummary.grandTotal.toFixed(2), { shouldDirty: true, shouldValidate: true });
  }, [invoiceSummary.grandTotal, setValue]);

  const rowIssues = useMemo(() => watchedItems.map((item, index) => {
    const product = productMap.get(item.productId);
    if (!product) {
      return [] as RowIssue[];
    }

    const qty = numberValue(item.qty);
    const rate = numberValue(item.rate);
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
    if (discountValue > lineBase) {
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
    if (invoiceDiscountType === "FIXED" && invoiceDiscountValue > invoiceSummary.totalBeforeInvoiceDiscount) {
      issues.push("Invoice discount cannot exceed total amount.");
    }
    if (numberValue(paidAmountInput) < 0) {
      issues.push("Paid amount cannot be negative.");
    }
    if (numberValue(paidAmountInput) === 0) {
      issues.push("Paid amount must be greater than 0.");
    }
    if (numberValue(paidAmountInput) > invoiceSummary.grandTotal) {
      issues.push("Paid amount cannot exceed grand total.");
    }
    if (numberValue(paidAmountInput) > 0 && !paymentModeInput) {
      issues.push("Select payment mode when paid amount is greater than 0.");
    }
    const hasTaxableGstLines = watchedItems.some((item) => {
      const product = productMap.get(item.productId);
      return Boolean(product?.taxable && (product?.taxPercent ?? 0) > 0);
    });
    if (hasTaxableGstLines && !user?.company?.stateId) {
      const companyStateName = normalizeStateName(user?.company?.state);
      if (!companyStateName) {
        issues.push("Select company state in About Company before creating GST invoice.");
      }
    }
    if (hasTaxableGstLines && selectedCustomer && !selectedCustomer.stateId) {
      const customerStateName = normalizeStateName(selectedCustomer.state);
      if (!customerStateName) {
        issues.push("Selected customer is missing state. Update the customer state before creating GST invoice.");
      }
    }
    return issues;
  }, [invoiceDiscountInput, invoiceDiscountType, invoiceSummary.grandTotal, invoiceSummary.totalBeforeInvoiceDiscount, paidAmountInput, paymentModeInput, productMap, selectedCustomer, user?.company?.state, user?.company?.stateId, watchedItems]);

  const hasClientValidationErrors = rowIssues.some((issues) => issues.length > 0) || summaryIssues.length > 0;
  const totalWithoutDiscount = invoiceSummary.grandTotal + invoiceSummary.productDiscountTotal + invoiceSummary.invoiceDiscount;
  const canProceedWithInvoice = Boolean(selectedCustomer?.active);
  const hasRequiredInvoiceFields = Boolean(
    selectedCustomer?.active &&
    invoiceDateInput &&
    watchedItems.length > 0 &&
    watchedItems.every((item) => item.productId && numberValue(item.qty) >= 1 && numberValue(item.rate) >= 0) &&
    invoiceSummary.paidAmount > 0 &&
    paymentModeInput
  );
  const canSaveInvoice = hasRequiredInvoiceFields && !hasClientValidationErrors;
  const customerMobileError = customerMobile.trim() && !isValidMobileNumber(customerMobile) ? MOBILE_VALIDATION_MESSAGE : undefined;
  const canCreateNewCustomer = Boolean(
    newCustomer.name.trim() &&
    isValidMobileNumber(customerMobile.trim() || newCustomer.mobile.trim()) &&
    (newCustomer.gstRegistered !== "true" || newCustomer.gstNo.trim())
  );

  useEffect(() => {
    if (!canProceedWithInvoice) {
      return;
    }
    if (!paymentModeInput && paymentModes.length > 0) {
      const nextModeCode = defaultPaymentModeCode(paymentModes);
      if (nextModeCode) {
        setValue("paymentMode", nextModeCode, { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [canProceedWithInvoice, paymentModeInput, paymentModes, setValue]);

  const resetInvoiceEntry = () => {
    replace([createEmptyItem()]);
    setValue("discountAmount", "0", { shouldDirty: true, shouldValidate: true });
    autoFillPaidAmountRef.current = true;
    setValue("paidAmount", "0", { shouldDirty: true, shouldValidate: true });
    setValue("paymentMode", "", { shouldDirty: true, shouldValidate: true });
  };

  const lookupCustomerByMobile = async () => {
    clearMessage();
    setSelectedCustomer(null);
    setPurchaseHistory(null);
    setValue("customerId", "");
    resetInvoiceEntry();

    const mobile = normalizeMobileNumber(customerMobile.trim());
    if (!mobile) {
      notificationService.showError("Enter customer mobile number to find customer");
      return;
    }
    if (!isValidMobileNumber(mobile)) {
      notificationService.showError(MOBILE_VALIDATION_MESSAGE);
      return;
    }
    setCustomerMobile(mobile);

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
        city: customer.city ?? "",
        stateId: customer.stateId ? String(customer.stateId) : "",
        state: customer.state ?? "",
        country: customer.country ?? "India",
        pincode: customer.pincode ?? "",
        gstNo: customer.gstin ?? customer.gstNo ?? "",
        gstRegistered: customer.gstRegistered ? "true" : "false",
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
        city: "",
        stateId: "",
        state: "",
        country: "India",
        pincode: "",
        gstNo: "",
        gstRegistered: "false",
        active: "true"
      });
      setApiError(err, "Unable to find active customer");
    }
  };

  const handleCreateCustomer = async () => {
    clearCustomerCreateFeedback();
    setCreatingCustomer(true);

    const mobile = normalizeMobileNumber(customerMobile.trim() || newCustomer.mobile.trim());
    if (!isValidMobileNumber(mobile)) {
      notificationService.showError(MOBILE_VALIDATION_MESSAGE);
      return;
    }

    const selectedState = newCustomer.stateId ? states.find((item) => String(item.id) === newCustomer.stateId) : undefined;
    const normalizedGst = newCustomer.gstRegistered === "true" ? newCustomer.gstNo.trim() : "";
    const payload: CustomerRequest = {
      name: newCustomer.name.trim(),
      mobile,
      email: newCustomer.email.trim() || undefined,
      address: newCustomer.address.trim() || undefined,
      gstNo: normalizedGst || undefined,
      gstin: normalizedGst || undefined,
      gstRegistered: newCustomer.gstRegistered === "true",
      city: newCustomer.city.trim() || undefined,
      state: selectedState?.stateName,
      stateId: newCustomer.stateId ? Number(newCustomer.stateId) : undefined,
      country: selectedState?.countryName ?? (newCustomer.country.trim() || undefined),
      pincode: newCustomer.pincode.trim() || undefined,
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
    resetInvoiceEntry();
  };

  const syncProductDefaults = (index: number, productId: string) => {
    const current = watchedItems[index] ?? createEmptyItem();
    const product = productMap.get(productId);
    if (!product) {
      update(index, {
        ...current,
        productId: "",
        rate: "0"
      });
      return;
    }
    const currentQty = numberValue(watchedItems[index]?.qty);
    update(index, {
      ...current,
      productId,
      qty: currentQty > 0 ? current.qty : "1",
      rate: String(product.sellingPrice ?? 0)
    });
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
      referByUserId: values.referByUserId ? Number(values.referByUserId) : null,
      discountAmount: Number(invoiceSummary.invoiceDiscount.toFixed(2)),
      paidAmount: Number(invoiceSummary.paidAmount.toFixed(2)),
      paymentMode: values.paymentMode || undefined,
      items: values.items.map((item) => ({
        productId: Number(item.productId),
        qty: Number(item.qty),
        price: Number(item.rate),
        taxMasterId: productMap.get(item.productId)?.taxMasterId ?? null,
        taxPercent: productMap.get(item.productId)?.taxPercent ?? 0,
        discountType: "FIXED",
        discountValue: Number(item.discountValue || 0),
        discountPercent: (() => {
          const lineBase = Number(item.rate || 0) * Number(item.qty || 0);
          const value = Number(item.discountValue || 0);
          if (lineBase <= 0) {
            return 0;
          }
          return Math.min(100, (Math.max(0, value) / lineBase) * 100);
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

  const onInvalid = (validationErrors: FieldErrors<FormValues>) => {
    notificationService.showError(getInvoiceValidationMessage(validationErrors));
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header title="Create Invoice" subtitle="" />

      <form id="create-invoice-form" className="mx-auto grid w-full max-w-[1660px] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]" onSubmit={handleSubmit(onSubmit, onInvalid)}>
        <div className="space-y-4">
          <GlassCard className="p-4 md:p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CommonBreadcrumb items={[{ label: "Invoices", to: "/invoices" }, { label: "Create Invoice" }]} />
                <h2 className="mt-1 text-xl font-bold text-slate-950">Create Invoice</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => navigate("/invoices")}>
                  <ArrowLeft size={16} />
                  Back
                </Button>
                <Button disabled={isSubmitting || !canSaveInvoice} type="submit">
                  {isSubmitting ? "Saving..." : "Save Invoice"}
                </Button>
              </div>
            </div>

            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-950">Customer Details</h3>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2 xl:max-w-[700px] xl:items-start">
              <div className="relative">
                <Input
                  label="Mobile"
                  requiredMark
                  placeholder="Search mobile"
                  inputMode="numeric"
                  maxLength={14}
                  value={customerMobile}
                  error={customerMobileError}
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
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2 xl:max-w-[700px]">
              <Input
                label="Invoice Date"
                requiredMark
                type="date"
                disabled={!canProceedWithInvoice}
                error={errors.invoiceDate?.message}
                {...register("invoiceDate", { required: "Invoice date is required" })}
              />
              <Select
                label="Refer By"
                disabled={!canProceedWithInvoice}
                placeholder="No Referral"
                options={[
                  { label: "No Referral", value: "" },
                  ...referralUsers.map((entry) => ({
                    label: `${entry.fullName} (${entry.mobileNumber || entry.username})`,
                    value: String(entry.id)
                  }))
                ]}
                {...register("referByUserId")}
              />
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
                  <Input label="Mobile Number" requiredMark readOnly className="cursor-not-allowed bg-slate-100 text-slate-500" error={customerCreateFieldErrors.mobile ?? (!isValidMobileNumber(newCustomer.mobile) ? MOBILE_VALIDATION_MESSAGE : undefined)} value={newCustomer.mobile} />
                  <Input label="Email Address" type="email" error={customerCreateFieldErrors.email} value={newCustomer.email} onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))} />
                  <Select
                    label="GST Registered"
                    placeholder={null}
                    options={[
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" }
                    ]}
                    value={newCustomer.gstRegistered}
                    onChange={(event) => setNewCustomer((current) => ({
                      ...current,
                      gstRegistered: event.target.value,
                      gstNo: event.target.value === "true" ? current.gstNo : ""
                    }))}
                  />
                  <Input label="GST Number" disabled={newCustomer.gstRegistered !== "true"} error={customerCreateFieldErrors.gstNo} value={newCustomer.gstNo} onChange={(event) => setNewCustomer((current) => ({ ...current, gstNo: event.target.value }))} />
                  <Input label="City" value={newCustomer.city} onChange={(event) => setNewCustomer((current) => ({ ...current, city: event.target.value }))} />
                  <Select
                    label="State"
                    placeholder={states.length ? "Select State" : "Loading States"}
                    options={[{ label: "Select State", value: "" }, ...states.map((state) => ({ label: state.stateName, value: String(state.id) }))]}
                    value={newCustomer.stateId}
                    onChange={(event) => {
                      const selected = states.find((item) => String(item.id) === event.target.value);
                      setNewCustomer((current) => ({
                        ...current,
                        stateId: event.target.value,
                        state: selected?.stateName ?? "",
                        country: selected?.countryName ?? current.country
                      }));
                    }}
                  />
                  <Input label="Country" value={newCustomer.country} onChange={(event) => setNewCustomer((current) => ({ ...current, country: event.target.value }))} />
                  <Input label="Pincode" value={newCustomer.pincode} onChange={(event) => setNewCustomer((current) => ({ ...current, pincode: event.target.value }))} />
                  <Input label="Address" className="md:col-span-2 xl:col-span-4" error={customerCreateFieldErrors.address} value={newCustomer.address} onChange={(event) => setNewCustomer((current) => ({ ...current, address: event.target.value }))} />
                </div>
                <div className="mt-3">
                  <Button type="button" disabled={creatingCustomer || !canCreateNewCustomer} onClick={() => void handleCreateCustomer()}>
                    {creatingCustomer ? "Creating..." : "Add Customer"}
                  </Button>
                </div>
              </div>
            ) : null}
          </GlassCard>

          <GlassCard className={`p-4 md:p-5 ${canProceedWithInvoice ? "" : "opacity-75"}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Products</h3>
                {!canProceedWithInvoice ? (
                  <p className="mt-1 text-sm font-medium text-slate-500">Find or add a customer first to continue invoice entry.</p>
                ) : null}
              </div>
              <Button type="button" variant="secondary" disabled={!canProceedWithInvoice} onClick={() => append(createEmptyItem())}>
                <Plus size={16} />
                Add Product
              </Button>
            </div>

            <div className="hidden grid-cols-[minmax(220px,1fr)_78px_116px_96px_112px_46px] gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 md:grid">
              <div>Product</div>
              <div>Qty</div>
              <div>Rate</div>
              <div>Discount</div>
              <div>Total</div>
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

                  return (
                    <div key={field.id} className="rounded-xl border border-slate-200 bg-white p-2.5">
                      <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_78px_116px_96px_112px_46px] md:items-center">
                        <div className="md:min-w-0">
                          <label className="sr-only">Product</label>
                          <select
                            {...productRegister}
                            disabled={!canProceedWithInvoice}
                            className={`h-[46px] w-full rounded-[var(--radius-control)] border bg-white py-0 pl-3 pr-12 text-sm font-medium text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)] ${errors.items?.[index]?.productId?.message ? "border-rose-400/70" : "border-slate-200"}`}
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
                            disabled={!canProceedWithInvoice}
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
                            disabled={!canProceedWithInvoice}
                            aria-label="Rate"
                            placeholder="Rate"
                            {...rateRegister}
                            className={`h-[46px] w-full rounded-[var(--radius-control)] border bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)] ${errors.items?.[index]?.rate?.message ? "border-rose-400/70" : "border-slate-200"}`}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 md:sr-only">Discount</label>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            disabled={!canProceedWithInvoice}
                            aria-label="Discount"
                            placeholder="Discount"
                            {...register(`items.${index}.discountValue`, {
                              validate: (value) => Number(value || 0) >= 0 || "Discount cannot be negative"
                            })}
                            className={`h-[46px] w-full rounded-[var(--radius-control)] border bg-white px-2 text-sm font-medium text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)] ${errors.items?.[index]?.discountValue?.message ? "border-rose-400/70" : "border-slate-200"}`}
                          />
                        </div>

                        <div className="flex h-[46px] items-center justify-start rounded-[var(--radius-control)] border border-slate-200 bg-slate-50 px-3">
                          <span className="truncate text-sm font-extrabold text-slate-950">{hasProduct ? formatCurrency(lineSummary?.totalAmount ?? 0) : "--"}</span>
                        </div>

                        <div className="flex h-[46px] items-center justify-center">
                          <CommonDeleteIconButton disabled={!canProceedWithInvoice} label="Remove product line" onClick={() => removeProductLine(index)} />
                        </div>
                      </div>
                    </div>
                  );
              })}
            </div>
          </GlassCard>

        </div>
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <GlassCard className={`p-3 md:p-4 ${canProceedWithInvoice ? "" : "opacity-75"}`}>
            <section className="space-y-3">
              <h3 className="text-base font-bold text-slate-950">Invoice Summary</h3>

              <div className="grid gap-2">
                <Select
                  label="Invoice Discount Type"
                  placeholder={null}
                  options={[{ label: "Fixed", value: "FIXED" }, { label: "Percent", value: "PERCENT" }]}
                  disabled={!canProceedWithInvoice}
                  {...register("invoiceDiscountType")}
                />
                <Input
                  label="Invoice Discount"
                  type="number"
                  step="0.01"
                  disabled={!canProceedWithInvoice}
                  error={summaryIssues.find((issue) => issue.toLowerCase().includes("invoice discount"))}
                  {...register("discountAmount")}
                />
                <Input
                  label="Paid Amount"
                  requiredMark
                  type="number"
                  step="0.01"
                  disabled={!canProceedWithInvoice}
                  error={summaryIssues.find((issue) => issue.toLowerCase().includes("paid amount"))}
                  {...register("paidAmount", {
                    onChange: () => {
                      autoFillPaidAmountRef.current = false;
                    }
                  })}
                />
                <Select
                  label="Payment Mode"
                  requiredMark
                  disabled={!canProceedWithInvoice || invoiceSummary.paidAmount <= 0}
                  placeholder="No Mode Selected"
                  error={summaryIssues.find((issue) => issue.toLowerCase().includes("payment mode"))}
                  options={[{ label: "No Mode Selected", value: "" }, ...paymentModes.map((mode) => ({ label: mode.modeName, value: mode.modeCode }))]}
                  {...register("paymentMode")}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="space-y-2 text-sm">
                  <SummaryRow label="Items" value={String(fields.length)} />
                  <SummaryRow label="Subtotal" value={formatCurrency(invoiceSummary.subtotal)} />
                  <SummaryRow label="Total Without Discount" value={formatCurrency(totalWithoutDiscount)} />
                  <SummaryRow label="Product Discount" value={`-${formatCurrency(invoiceSummary.productDiscountTotal)}`} tone="danger" />
                  <SummaryRow label="Invoice Discount" value={`-${formatCurrency(invoiceSummary.invoiceDiscount)}`} tone="danger" />
                  <SummaryRow label="Taxable Amount" value={formatCurrency(invoiceSummary.taxableAmount)} />
                  {invoiceSummary.cgstTotal > 0 ? <SummaryRow label="CGST" value={formatCurrency(invoiceSummary.cgstTotal)} /> : null}
                  {invoiceSummary.sgstTotal > 0 ? <SummaryRow label="SGST" value={formatCurrency(invoiceSummary.sgstTotal)} /> : null}
                  {invoiceSummary.igstTotal > 0 ? <SummaryRow label="IGST" value={formatCurrency(invoiceSummary.igstTotal)} /> : null}
                  <SummaryRow label="Total Tax" value={formatCurrency(invoiceSummary.taxAmount)} />
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
                <p className="mt-1 text-sm text-slate-400">{selectedCustomer.state ?? "--"}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Contact</p>
                <p className="mt-2 font-semibold text-white">{selectedCustomer.email ?? "--"}</p>
                <p className="mt-1 text-sm text-slate-400">{selectedCustomer.address ?? "--"}</p>
                <p className="mt-1 text-sm text-slate-400">GSTIN: {selectedCustomer.gstin ?? selectedCustomer.gstNo ?? "--"}</p>
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
