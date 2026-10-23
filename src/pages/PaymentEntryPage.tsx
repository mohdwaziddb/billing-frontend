import { useEffect, useMemo, useRef, useState } from "react";
import { type FieldErrors, useForm, Controller } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { getCustomers } from "../api/customers";
import { getInvoices } from "../api/invoices";
import { getPaymentModes } from "../api/paymentModes";
import { createPayment } from "../api/payments";
import { FormActionBar } from "../components/FormActionBar";
import { FormSection } from "../components/FormSection";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatCurrency } from "../lib/currency";
import { firstFormErrorMessage } from "../lib/formValidation";
import { CollectOnlineModal } from "../modules/payments/components/CollectOnlineModal";
import { usePaymentGatewayConfig } from "../modules/payments/hooks/usePaymentGatewayConfig";
import { findPaymentMode, isOnlineModeMaster, paymentModeOptions, referenceLabelForMode } from "../modules/payments/paymentModeOptions";
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
    void Promise.all([getCustomers({ active: true, size: 1000 }), getInvoices({ size: 1000 }), getPaymentModes({ active: true, size: 1000 })]).then(([customerData, invoiceData, modeData]) => {
      setCustomers(customerData.filter((customer) => customer.active));
      setInvoices(invoiceData);
      setPaymentModes(modeData);
      const initialMode = defaultModeCode(modeData);
      if (initialMode && !getValues("mode")) {
        setValue("mode", initialMode, { shouldValidate: true });
      }
    }).catch((err: any) => setApiError(err, "Unable to load customers, invoices or payment modes"));
  }, [setValue, getValues, setApiError]);

  const selectedCustomerId = watch("customerId");
  const selectedInvoiceId = watch("invoiceId");
  const watchedAmount = watch("amount");
  const watchedPaymentDate = watch("paymentDate");
  const watchedMode = watch("mode");
  const invoiceOptions = useMemo(() => {
    const customerInvoices = invoices.filter((invoice) => String(invoice.customerId) === selectedCustomerId && Number(invoice.balanceAmount) > 0);
    return customerInvoices.map((invoice) => ({
      label: `${invoice.invoiceNo} | ${invoice.paymentStatus} | Due ${formatCurrency(invoice.balanceAmount)}`,
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
    if (!invoiceId || invoices.length === 0) {
      return;
    }
    // Run once per invoice: re-runs from invoices refetch must not clobber typing.
    if (prefilledInvoiceId.current === invoiceId) {
      return;
    }

    const invoice = invoices.find((item) => String(item.id) === invoiceId);
    if (!invoice) {
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
  }, [invoices, searchParams, setValue, getValues]);

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
      resetForm();
    } catch (err: any) {
      setApiError(err, "Unable to record payment");
    }
  };

  const onInvalid = (validationErrors: FieldErrors<FormValues>) => {
    notificationService.showError(firstFormErrorMessage(validationErrors, "Please fill all required payment fields before saving."));
  };

  return (
    <div className="space-y-4 pb-6 md:space-y-5">
      <Header
        title="Add Payment"
        subtitle={lockedInvoice ? `Recording payment for ${lockedInvoice.invoiceNo} | Outstanding ${formatCurrency(lockedInvoice.balanceAmount)}` : "Record customer collections and map them to invoices with consistent validation and clean form layout."}
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

        <form id="payment-form" className="grid gap-4 lg:grid-cols-3" onSubmit={handleSubmit(onSubmit, onInvalid)}>
          <FormSection title="Customer Information">
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
                  placeholder="Select Customer"
                  error={errors.customerId?.message}
                  options={customers.map((customer) => ({ label: customer.name, value: customer.id }))}
                  disabled={Boolean(lockedInvoice)}
                  name={field.name}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
          </FormSection>

          <FormSection title="Invoice Information">
            <Controller
              name="invoiceId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Invoice"
                  placeholder="Select Invoice"
                  hint="Optional if you are recording an unapplied customer payment."
                  options={invoiceOptions}
                  disabled={Boolean(lockedInvoice)}
                  name={field.name}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                  ref={field.ref}
                />
              )}
            />
          </FormSection>

          <FormSection title="Payment Information">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Input
                label="Amount"
                requiredMark
                type="number"
                step="0.01"
                error={errors.amount?.message}
                {...register("amount", {
                  required: "Amount is required",
                  validate: (value) => {
                    const amount = Number(value);
                    if (amount <= 0) return "Payment amount must be greater than 0";
                    const invoice = invoices.find((item) => String(item.id) === selectedInvoiceId);
                    return !invoice || amount <= Number(invoice.balanceAmount) || "Payment amount cannot exceed outstanding amount";
                  }
                })}
              />
              <Controller
                name="paymentDate"
                control={control}
                rules={{ required: "Payment date is required" }}
                render={({ field }) => (
                  <Input
                    label="Payment date"
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
              <Controller
                name="mode"
                control={control}
                rules={{ required: "Payment mode is required" }}
                render={({ field }) => (
                  <Select
                    label="Mode"
                    requiredMark
                    placeholder="Select Mode"
                    error={errors.mode?.message}
                    options={paymentModeOptions(paymentModes, onlineEnabled, gatewayConfig?.gatewayName)}
                    name={field.name}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
              {selectedMode?.requiresReference ? (
                <Input label={referenceLabelForMode(watchedMode)} placeholder="Optional" maxLength={120} {...register("referenceNo")} />
              ) : null}
              <Input label="Notes" {...register("remarks")} />
            </div>
            {onlineSelected ? (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 fs-12 text-emerald-800">
                {lockedInvoice || selectedInvoice
                  ? `Collect Online opens ${gatewayConfig?.gatewayName ?? "the payment gateway"} (Pay Now or payment link). The payment is recorded automatically once it succeeds.`
                  : "Select an invoice to collect an online payment."}
              </p>
            ) : null}
          </FormSection>
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
              resetForm();
              // Balance badal gaya: dropdown ke dues taaze karo.
              void getInvoices({ size: 1000 }).then(setInvoices).catch(() => undefined);
            }
          }}
        />
      ) : null}
    </div>
  );
};
