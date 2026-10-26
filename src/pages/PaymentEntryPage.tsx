import { Banknote, Smartphone } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type FieldErrors, useForm, Controller } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCustomers } from "../api/customers";
import { getInvoice, getInvoices } from "../api/invoices";
import { getPaymentModes } from "../api/paymentModes";
import { createPayment } from "../api/payments";
import { FormActionBar } from "../components/FormActionBar";
import { FormSection } from "../components/FormSection";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import { firstFormErrorMessage } from "../lib/formValidation";
import { CollectOnlineModal } from "../modules/payments/components/CollectOnlineModal";
import { usePaymentGatewayConfig } from "../modules/payments/hooks/usePaymentGatewayConfig";
import { findPaymentMode, isOnlineModeMaster, paymentModeLabel, referenceLabelForMode, visiblePaymentModes } from "../modules/payments/paymentModeOptions";
import { notificationService } from "../services/notificationService";
import type { Customer, Invoice, PaymentMode, PaymentModeMaster, PaymentRequest } from "../types/api";

type FormValues = {
  customerId: string;
  invoiceId: string;
  amount: string;
  paymentDate: string;
  mode: PaymentMode;
  remarks: string;
  referenceNo: string;
};

// Default kabhi Online nahi (wo invoice + gateway flow hai).
const defaultModeCode = (modes: PaymentModeMaster[]) =>
  modes.find((mode) => mode.modeCode === "CASH")?.modeCode ?? modes.find((mode) => !isOnlineModeMaster(mode))?.modeCode ?? "";

const todayIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export const PaymentEntryPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Invoice page se aaye (?invoiceId=): save ke baad wahi invoice dikhao (updated history ke saath).
  const returnInvoiceId = searchParams.get("invoiceId");
  const [customers, setCustomers] = useState<Customer[]>([]);
  // Sirf selected customer ke outstanding invoices (pehle page load par company ke 1000 invoices
  // — paid bhi — aate the; 1000 se purane unpaid invoice dropdown me dikhte hi nahi the).
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeMaster[]>([]);
  const [lockedInvoice, setLockedInvoice] = useState<Invoice | null>(null);
  const [onlineCollectInvoice, setOnlineCollectInvoice] = useState<{ invoice: Invoice; amount: number } | null>(null);
  const onlinePaidRef = useRef(false);
  const { config: gatewayConfig, onlineEnabled } = usePaymentGatewayConfig();
  const { clearMessage, setApiError } = useApiMessage();
  const {
    register,
    watch,
    handleSubmit,
    setValue,
    getValues,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      customerId: "",
      invoiceId: "",
      amount: "",
      paymentDate: todayIso(),
      mode: "",
      remarks: "",
      referenceNo: ""
    }
  });

  // Guards so async data never overwrites what the user typed:
  // - lastAutoAmount: only replace amount while it still holds our auto value
  // - lastInvoiceId: ignore effect re-runs from invoices refetch identity
  // - prefilledInvoiceId: ?invoiceId prefill runs once per invoice
  const lastAutoAmount = useRef<string | null>(null);
  const lastInvoiceId = useRef<string>("");
  const prefilledInvoiceId = useRef<string | null>(null);

  useEffect(() => {
    void Promise.all([getCustomers({ active: true, size: 1000 }), getPaymentModes({ active: true, size: 1000 })]).then(([customerData, modeData]) => {
      setCustomers(customerData.filter((customer) => customer.active));
      setPaymentModes(modeData);
      const initialMode = defaultModeCode(modeData);
      if (initialMode && !getValues("mode")) {
        setValue("mode", initialMode, { shouldValidate: true });
      }
    }).catch((err: any) => setApiError(err, "Unable to load customers or payment modes"));
  }, [setValue, getValues, setApiError]);

  const selectedCustomerId = watch("customerId");
  // Locked (?invoiceId=) invoice hamesha list me rahe, chahe uska balance 0 ho.
  const invoices = useMemo(
    () => (lockedInvoice && !customerInvoices.some((invoice) => invoice.id === lockedInvoice.id) ? [lockedInvoice, ...customerInvoices] : customerInvoices),
    [customerInvoices, lockedInvoice]
  );

  // Customer badla: usi ke unpaid invoices laao. Request id: purane customer ka der se aaya jawab ignore.
  const invoiceRequestId = useRef(0);
  useEffect(() => {
    const requestId = ++invoiceRequestId.current;
    if (!selectedCustomerId) {
      setCustomerInvoices([]);
      return;
    }
    void getInvoices({ customerId: Number(selectedCustomerId), outstandingFilter: "OUTSTANDING", size: 1000 })
      .then((invoiceData) => {
        if (requestId === invoiceRequestId.current) {
          setCustomerInvoices(invoiceData);
        }
      })
      .catch((err: any) => {
        if (requestId === invoiceRequestId.current) {
          setApiError(err, "Unable to load invoices");
        }
      });
  }, [selectedCustomerId, setApiError]);
  const selectedInvoiceId = watch("invoiceId");
  const watchedAmount = watch("amount");
  const watchedPaymentDate = watch("paymentDate");
  const watchedMode = watch("mode");
  const invoiceOptions = useMemo(() => {
    const unpaidInvoices = invoices.filter((invoice) => String(invoice.customerId) === selectedCustomerId && Number(invoice.balanceAmount) > 0);
    return unpaidInvoices.map((invoice) => ({
      // Status right side summary me dikhta hai; label chhota taaki kate nahi.
      label: `${invoice.invoiceNo} · Due ${formatCurrency(invoice.balanceAmount)}`,
      value: invoice.id
    }));
  }, [invoices, selectedCustomerId]);
  const selectedInvoice = invoices.find((item) => String(item.id) === selectedInvoiceId);
  const selectedMode = findPaymentMode(paymentModes, watchedMode);
  const onlineSelected = isOnlineModeMaster(selectedMode);
  const paymentAmount = Number(watchedAmount);
  const canSavePayment = Boolean(
    (lockedInvoice || selectedCustomerId) &&
    watchedAmount !== "" &&
    Number.isFinite(paymentAmount) &&
    paymentAmount > 0 &&
    (!selectedInvoice || paymentAmount <= Number(selectedInvoice.balanceAmount)) &&
    watchedPaymentDate &&
    watchedMode &&
    // Online payment hamesha kisi invoice par (gateway order invoice se banta hai).
    (!onlineSelected || Boolean(lockedInvoice || selectedInvoice))
  );

  useEffect(() => {
    const invoiceId = searchParams.get("invoiceId");
    // Run once per invoice: re-runs must not clobber typing.
    if (!invoiceId || prefilledInvoiceId.current === invoiceId) {
      return;
    }
    // Invoice page se aaye: sirf wahi ek invoice laao (pehle 1000 invoices me dhoondte the).
    void getInvoice(Number(invoiceId))
      .then((invoice) => {
        if (!invoice || invoice.deleted || prefilledInvoiceId.current === invoiceId) {
          return;
        }
        prefilledInvoiceId.current = invoiceId;
        setValue("customerId", String(invoice.customerId), { shouldValidate: true });
        setValue("invoiceId", String(invoice.id), { shouldValidate: true });
        if (!getValues("amount")) {
          const balance = String(invoice.balanceAmount);
          setValue("amount", balance, { shouldValidate: true });
          lastAutoAmount.current = balance;
        }
        lastInvoiceId.current = String(invoice.id);
        setLockedInvoice(invoice);
      })
      .catch((err: any) => setApiError(err, "Unable to load invoice"));
  }, [searchParams, setValue, getValues, setApiError]);

  useEffect(() => {
    if (!selectedInvoiceId) {
      return;
    }
    // Same invoice id (e.g. invoices list refetched) -> do nothing, keep typing.
    if (selectedInvoiceId === lastInvoiceId.current) {
      return;
    }
    lastInvoiceId.current = selectedInvoiceId;

    const invoice = invoices.find((item) => String(item.id) === selectedInvoiceId);
    if (!invoice) {
      return;
    }

    setValue("customerId", String(invoice.customerId), { shouldValidate: true });
    // Never overwrite a manually typed amount — only fill empty/auto values.
    const currentAmount = getValues("amount");
    if (!currentAmount || currentAmount === lastAutoAmount.current) {
      const balance = String(invoice.balanceAmount);
      setValue("amount", balance, { shouldValidate: true });
      lastAutoAmount.current = balance;
    }
  }, [invoices, selectedInvoiceId, setValue, getValues]);

  const resetForm = () => {
    reset({
      customerId: "",
      invoiceId: "",
      amount: "",
      paymentDate: todayIso(),
      mode: defaultModeCode(paymentModes),
      remarks: "",
      referenceNo: ""
    });
    setLockedInvoice(null);
    lastAutoAmount.current = null;
    lastInvoiceId.current = "";
    prefilledInvoiceId.current = null;
  };

  // Balance badal gaya: invoice se aaye to wapas invoice par, warna form saaf + dues taaze.
  const afterPaymentSaved = () => {
    if (returnInvoiceId) {
      navigate(`/invoices/${returnInvoiceId}`);
      return;
    }
    // Form reset se customer khali -> invoices khud saaf; agla customer chunte hi taaze dues aate hain.
    resetForm();
    void getCustomers({ active: true, size: 1000 })
      .then((customerData) => setCustomers(customerData.filter((customer) => customer.active)))
      .catch(() => undefined);
  };

  const onSubmit = async (values: FormValues) => {
    clearMessage();

    if (onlineSelected) {
      const invoice = lockedInvoice ?? invoices.find((item) => String(item.id) === values.invoiceId);
      if (!invoice) {
        setApiError({ message: "Select an invoice to collect online payment" }, "Select an invoice to collect online payment");
        return;
      }
      onlinePaidRef.current = false;
      setOnlineCollectInvoice({ invoice, amount: Number(values.amount) });
      return;
    }

    const payload: PaymentRequest = {
      customerId: lockedInvoice ? Number(lockedInvoice.customerId) : Number(values.customerId),
      invoiceId: lockedInvoice ? Number(lockedInvoice.id) : values.invoiceId ? Number(values.invoiceId) : undefined,
      amount: Number(values.amount),
      paymentDate: values.paymentDate,
      mode: values.mode,
      remarks: values.remarks || undefined,
      referenceNo: selectedMode?.requiresReference && values.referenceNo.trim() ? values.referenceNo.trim() : undefined
    };

    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      setApiError({ message: "Payment amount must be greater than 0" }, "Payment amount must be greater than 0");
      return;
    }
    const invoice = invoices.find((item) => String(item.id) === values.invoiceId);
    if (invoice && payload.amount > Number(invoice.balanceAmount)) {
      setApiError({ message: "Payment amount cannot exceed outstanding amount" }, "Payment amount cannot exceed outstanding amount");
      return;
    }

    try {
      await createPayment(payload);
      notificationService.showSuccess("Payment Recorded Successfully");
      afterPaymentSaved();
    } catch (err: any) {
      setApiError(err, "Unable to record payment");
    }
  };

  // Right side summary: locked / selected invoice ke numbers live (amount type karte hi update).
  const summaryInvoice = lockedInvoice ?? selectedInvoice ?? null;
  const selectedCustomer = customers.find((customer) => String(customer.id) === (lockedInvoice ? String(lockedInvoice.customerId) : selectedCustomerId));
  const customerDue = invoices
    .filter((invoice) => String(invoice.customerId) === selectedCustomerId)
    .reduce((sum, invoice) => sum + Math.max(0, Number(invoice.balanceAmount)), 0);
  const invoiceTotal = Number(summaryInvoice?.totalAmount ?? 0);
  const invoiceBalance = Number(summaryInvoice?.balanceAmount ?? 0);
  const validAmount = Number.isFinite(paymentAmount) && paymentAmount > 0 ? Math.min(paymentAmount, invoiceBalance || paymentAmount) : 0;
  const remainingAfter = Math.max(0, Math.round((invoiceBalance - validAmount) * 100) / 100);
  const paidPercent = invoiceTotal > 0 ? Math.min(100, (Number(summaryInvoice?.paidAmount ?? 0) / invoiceTotal) * 100) : 0;
  const thisPaymentPercent = invoiceTotal > 0 ? Math.min(100 - paidPercent, (validAmount / invoiceTotal) * 100) : 0;
  // Mode pills: active modes (Online sirf gateway on ho to).
  const modeChoices = visiblePaymentModes(paymentModes, onlineEnabled);

  const onInvalid = (validationErrors: FieldErrors<FormValues>) => {
    notificationService.showError(firstFormErrorMessage(validationErrors, "Please fill all required payment fields before saving."));
  };

  return (
    <div className="space-y-4 pb-6 md:space-y-5">
      <Header
        title="Add Payment"
        subtitle={lockedInvoice ? `Recording payment for ${lockedInvoice.invoiceNo}` : "Record a customer payment against an invoice or as an advance."}
      />

      <div className="space-y-4">
        <FormActionBar
          items={[{ label: "Payments", to: "/payments" }, { label: "Add Payment" }]}
          backTo="/payments"
          formId="payment-form"
          saveLabel={onlineSelected ? "Collect Online" : "Save Payment"}
          saving={isSubmitting}
          saveDisabled={!canSavePayment}
        />

        <form id="payment-form" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start" onSubmit={handleSubmit(onSubmit, onInvalid)}>
          <FormSection title="Payment Details" contentClassName="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Controlled: shown option always equals submitted value (async
                  options + setValue autofill used to desync the display). */}
              <Controller
                name="customerId"
                control={control}
                rules={{ required: "Customer is required" }}
                render={({ field }) => (
                  <Select
                    label="Customer"
                    requiredMark
                    searchable
                    placeholder="Select Customer"
                    error={errors.customerId?.message}
                    options={customers.map((customer) => ({ label: customer.mobile ? `${customer.name} · ${customer.mobile}` : customer.name, value: customer.id }))}
                    disabled={Boolean(lockedInvoice)}
                    name={field.name}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
              <Controller
                name="invoiceId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Invoice"
                    placeholder={selectedCustomerId ? (invoiceOptions.length ? "Select Invoice" : "No unpaid invoices") : "Select a customer first"}
                    hint={lockedInvoice ? undefined : "Optional — leave empty to apply to the oldest unpaid invoices."}
                    options={invoiceOptions}
                    disabled={Boolean(lockedInvoice) || !selectedCustomerId}
                    name={field.name}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Input
                  label="Amount"
                  requiredMark
                  type="number"
                  step="0.01"
                  min={0}
                  inputMode="decimal"
                  error={errors.amount?.message}
                  {...register("amount", {
                    required: "Amount is required",
                    validate: (value) => {
                      const amount = Number(value);
                      if (!Number.isFinite(amount) || amount <= 0) return "Payment amount must be greater than 0";
                      const invoice = invoices.find((item) => String(item.id) === selectedInvoiceId);
                      return !invoice || amount <= Number(invoice.balanceAmount) || "Payment amount cannot exceed outstanding amount";
                    }
                  })}
                />
                {summaryInvoice && Number(summaryInvoice.balanceAmount) > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      { label: "Full due", value: Number(summaryInvoice.balanceAmount) },
                      { label: "Half", value: Math.round(Number(summaryInvoice.balanceAmount) * 50) / 100 }
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 fs-12 font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        onClick={() => {
                          const next = chip.value.toFixed(2);
                          setValue("amount", next, { shouldValidate: true, shouldDirty: true });
                          lastAutoAmount.current = null;
                        }}
                      >
                        {chip.label} · {formatCurrency(chip.value)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <Controller
                name="paymentDate"
                control={control}
                rules={{ required: "Payment date is required" }}
                render={({ field }) => (
                  <Input
                    label="Payment Date"
                    requiredMark
                    type="date"
                    error={errors.paymentDate?.message}
                    name={field.name}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
            </div>

            <Controller
              name="mode"
              control={control}
              rules={{ required: "Payment mode is required" }}
              render={({ field }) => (
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    Payment Mode <span className="text-rose-500">*</span>
                  </p>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Payment mode">
                    {modeChoices.map((mode) => {
                      const selected = field.value === mode.modeCode;
                      return (
                        <button
                          key={mode.modeCode}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className={`inline-flex min-w-[120px] items-center justify-center gap-2 rounded-[var(--radius-control)] border px-4 py-2.5 text-sm font-semibold transition ${
                            selected
                              ? "border-[var(--theme-color)] bg-[color-mix(in_srgb,var(--theme-color)_10%,white)] text-slate-950 ring-2 ring-[color:color-mix(in_srgb,var(--theme-color)_22%,transparent)]"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                          onClick={() => field.onChange(mode.modeCode)}
                        >
                          {isOnlineModeMaster(mode) ? <Smartphone size={16} /> : <Banknote size={16} />}
                          {paymentModeLabel(mode, gatewayConfig?.gatewayName)}
                        </button>
                      );
                    })}
                  </div>
                  {errors.mode?.message ? <p className="mt-1.5 fs-12 font-medium text-rose-600">{errors.mode.message}</p> : null}
                </div>
              )}
            />

            {onlineSelected ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 fs-12 text-emerald-800">
                {lockedInvoice || selectedInvoice
                  ? `Collect Online opens ${gatewayConfig?.gatewayName ?? "the payment gateway"} — Pay Now (UPI, card, netbanking) or send a payment link. The payment is recorded automatically once it succeeds.`
                  : "Select an invoice to collect an online payment."}
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {selectedMode?.requiresReference ? (
                <Input label={referenceLabelForMode(watchedMode)} placeholder="Optional" maxLength={120} {...register("referenceNo")} />
              ) : null}
              <div className={selectedMode?.requiresReference ? "" : "md:col-span-2"}>
                <Input label="Notes" placeholder="Optional" maxLength={255} disabled={onlineSelected} {...register("remarks")} />
              </div>
            </div>
          </FormSection>

          <aside className="lg:sticky lg:top-24">
            <FormSection title={summaryInvoice ? "Invoice Summary" : "Customer Summary"} contentClassName="space-y-4">
              {summaryInvoice ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate fs-16 font-bold text-slate-950">{summaryInvoice.invoiceNo}</p>
                      <p className="mt-0.5 fs-12 text-slate-500">{summaryInvoice.customerName} · {formatDate(summaryInvoice.invoiceDate)}</p>
                    </div>
                    <StatusBadge label={summaryInvoice.paymentStatus} />
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Invoice total</dt><dd className="font-semibold tabular-nums text-slate-900">{formatCurrency(summaryInvoice.totalAmount)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Already paid</dt><dd className="font-semibold tabular-nums text-slate-900">{formatCurrency(summaryInvoice.paidAmount)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Balance due</dt><dd className="font-bold tabular-nums text-rose-600">{formatCurrency(summaryInvoice.balanceAmount)}</dd></div>
                  </dl>
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                      <div className="flex h-full">
                        <div className="h-full bg-emerald-500" style={{ width: `${paidPercent}%` }} />
                        <div className="h-full bg-emerald-300" style={{ width: `${thisPaymentPercent}%` }} />
                      </div>
                    </div>
                    <p className="mt-1.5 fs-11 text-slate-500">{(paidPercent + thisPaymentPercent).toFixed(0)}% paid after this payment</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex justify-between gap-3 text-sm"><span className="text-slate-500">This payment</span><span className="font-semibold tabular-nums text-slate-900">{formatCurrency(validAmount)}</span></div>
                    <div className="mt-1.5 flex justify-between gap-3 text-sm">
                      <span className="font-semibold text-slate-700">Remaining after</span>
                      <span className={`font-bold tabular-nums ${remainingAfter === 0 ? "text-emerald-600" : "text-slate-950"}`}>{remainingAfter === 0 ? "Fully paid" : formatCurrency(remainingAfter)}</span>
                    </div>
                  </div>
                </>
              ) : selectedCustomer ? (
                <>
                  <div>
                    <p className="truncate fs-16 font-bold text-slate-950">{selectedCustomer.name}</p>
                    <p className="mt-0.5 fs-12 text-slate-500">{selectedCustomer.mobile}</p>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Unpaid invoices</dt><dd className="font-semibold tabular-nums text-slate-900">{invoiceOptions.length}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Total due</dt><dd className="font-bold tabular-nums text-rose-600">{formatCurrency(customerDue)}</dd></div>
                  </dl>
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 fs-12 text-slate-600">
                    No invoice selected: the amount is applied to this customer's oldest unpaid invoices first; anything extra stays as advance.
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-500">Select a customer to see their dues.</p>
              )}
            </FormSection>
          </aside>
        </form>
      </div>

      {onlineCollectInvoice ? (
        <CollectOnlineModal
          open
          invoiceId={onlineCollectInvoice.invoice.id}
          invoiceNo={onlineCollectInvoice.invoice.invoiceNo}
          customerName={onlineCollectInvoice.invoice.customerName}
          customerMobile={onlineCollectInvoice.invoice.customerMobile}
          balanceAmount={Number(onlineCollectInvoice.invoice.balanceAmount)}
          defaultAmount={onlineCollectInvoice.amount}
          onPaid={() => {
            onlinePaidRef.current = true;
          }}
          onClose={() => {
            setOnlineCollectInvoice(null);
            if (onlinePaidRef.current) {
              afterPaymentSaved();
            }
          }}
        />
      ) : null}
    </div>
  );
};
