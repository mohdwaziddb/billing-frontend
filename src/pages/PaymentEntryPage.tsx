import { useEffect, useMemo, useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCustomers } from "../api/customers";
import { getInvoices } from "../api/invoices";
import { getPaymentModes } from "../api/paymentModes";
import { createPayment } from "../api/payments";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatCurrency } from "../lib/currency";
import { firstFormErrorMessage } from "../lib/formValidation";
import { notificationService } from "../services/notificationService";
import type { Customer, Invoice, PaymentMode, PaymentModeMaster, PaymentRequest } from "../types/api";

type FormValues = {
  customerId: string;
  invoiceId: string;
  amount: string;
  paymentDate: string;
  mode: PaymentMode;
  remarks: string;
};

const todayIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export const PaymentEntryPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeMaster[]>([]);
  const [lockedInvoice, setLockedInvoice] = useState<Invoice | null>(null);
  const { clearMessage, setApiError } = useApiMessage();
  const {
    register,
    watch,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      customerId: "",
      invoiceId: "",
      amount: "",
      paymentDate: todayIso(),
      mode: "",
      remarks: ""
    }
  });

  useEffect(() => {
    void Promise.all([getCustomers({ active: true, size: 1000 }), getInvoices({ size: 1000 }), getPaymentModes({ active: true, size: 1000 })]).then(([customerData, invoiceData, modeData]) => {
      setCustomers(customerData.filter((customer) => customer.active));
      setInvoices(invoiceData);
      setPaymentModes(modeData);
      if (modeData[0]) {
        setValue("mode", modeData[0].modeCode, { shouldValidate: true });
      }
    });
  }, [setValue]);

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
  const paymentAmount = Number(watchedAmount);
  const canSavePayment = Boolean(
    (lockedInvoice || selectedCustomerId) &&
    watchedAmount !== "" &&
    Number.isFinite(paymentAmount) &&
    paymentAmount > 0 &&
    (!selectedInvoice || paymentAmount <= Number(selectedInvoice.balanceAmount)) &&
    watchedPaymentDate &&
    watchedMode
  );

  useEffect(() => {
    const invoiceId = searchParams.get("invoiceId");
    if (!invoiceId || invoices.length === 0) {
      return;
    }

    const invoice = invoices.find((item) => String(item.id) === invoiceId);
    if (!invoice) {
      return;
    }

    setValue("customerId", String(invoice.customerId), { shouldValidate: true });
    setValue("invoiceId", String(invoice.id), { shouldValidate: true });
    setValue("amount", String(invoice.balanceAmount), { shouldValidate: true });
    setLockedInvoice(invoice);
  }, [invoices, searchParams, setValue]);

  useEffect(() => {
    if (!selectedInvoiceId) {
      return;
    }

    const invoice = invoices.find((item) => String(item.id) === selectedInvoiceId);
    if (!invoice) {
      return;
    }

    setValue("customerId", String(invoice.customerId), { shouldValidate: true });
    setValue("amount", String(invoice.balanceAmount), { shouldValidate: true });
  }, [invoices, selectedInvoiceId, setValue]);

  const onSubmit = async (values: FormValues) => {
    clearMessage();

    const payload: PaymentRequest = {
      customerId: lockedInvoice ? Number(lockedInvoice.customerId) : Number(values.customerId),
      invoiceId: lockedInvoice ? Number(lockedInvoice.id) : values.invoiceId ? Number(values.invoiceId) : undefined,
      amount: Number(values.amount),
      paymentDate: values.paymentDate,
      mode: values.mode,
      remarks: values.remarks || undefined
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
      reset({
        customerId: "",
        invoiceId: "",
        amount: "",
        paymentDate: todayIso(),
        mode: paymentModes[0]?.modeCode ?? "",
        remarks: ""
      });
      setLockedInvoice(null);
    } catch (err: any) {
      setApiError(err, "Unable to record payment");
    }
  };

  const onInvalid = (validationErrors: FieldErrors<FormValues>) => {
    notificationService.showError(firstFormErrorMessage(validationErrors, "Please fill all required payment fields before saving."));
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header
        title="Payments > Add Payment"
        subtitle={lockedInvoice ? `Recording payment for ${lockedInvoice.invoiceNo} | Outstanding ${formatCurrency(lockedInvoice.balanceAmount)}` : "Record customer collections and map them to invoices with consistent validation and clean form layout."}
      />
      <GlassCard className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CommonBreadcrumb items={[{ label: "Payments", to: "/payments" }, { label: "Add Payment" }]} />
            <h2 className="mt-1 text-xl font-bold text-white">Add Payment</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate("/payments")}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <Button disabled={isSubmitting || !canSavePayment} type="submit" form="payment-form">
              {isSubmitting ? "Saving..." : "Save Payment"}
            </Button>
          </div>
        </div>
        <form id="payment-form" className="grid gap-4 lg:grid-cols-3" onSubmit={handleSubmit(onSubmit, onInvalid)}>
          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-bold uppercase text-slate-500">Customer Information</h3>
            <Select
              label="Customer"
              requiredMark
              placeholder="Select Customer"
              error={errors.customerId?.message}
              options={customers.map((customer) => ({ label: customer.name, value: customer.id }))}
              disabled={Boolean(lockedInvoice)}
              {...register("customerId", { required: "Customer is required" })}
            />
          </section>

          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-bold uppercase text-slate-500">Invoice Information</h3>
            <Select
              label="Invoice"
              placeholder="Select Invoice"
              hint="Optional if you are recording an unapplied customer payment."
              options={invoiceOptions}
              disabled={Boolean(lockedInvoice)}
              {...register("invoiceId")}
            />
          </section>

          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-bold uppercase text-slate-500">Payment Information</h3>
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
              <Input
                label="Payment date"
                requiredMark
                type="date"
                error={errors.paymentDate?.message}
                {...register("paymentDate", { required: "Payment date is required" })}
              />
              <Select
                label="Mode"
                requiredMark
                placeholder="Select Mode"
                error={errors.mode?.message}
                options={paymentModes.map((mode) => ({ label: mode.modeName, value: mode.modeCode }))}
                {...register("mode", { required: "Payment mode is required" })}
              />
              <Input label="Notes" {...register("remarks")} />
            </div>
          </section>
        </form>
      </GlassCard>
    </div>
  );
};
