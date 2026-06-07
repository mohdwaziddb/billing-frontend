import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { getCustomers } from "../api/customers";
import { getInvoices } from "../api/invoices";
import { createPayment } from "../api/payments";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useApiMessage } from "../hooks/useApiFeedback";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { formatCurrency } from "../lib/currency";
import { notificationService } from "../services/notificationService";
import type { Customer, Invoice, PaymentMode, PaymentRequest } from "../types/api";

type FormValues = {
  customerId: string;
  invoiceId: string;
  amount: string;
  paymentDate: string;
  mode: PaymentMode;
  remarks: string;
};

export const PaymentEntryPage = () => {
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const { message: serverError, clearMessage, setApiError } = useApiMessage();
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
      paymentDate: new Date().toISOString().slice(0, 10),
      mode: "UPI",
      remarks: ""
    }
  });

  useEffect(() => {
    void Promise.all([getCustomers({ active: true, size: 1000 }), getInvoices({ size: 1000 })]).then(([customerData, invoiceData]) => {
      setCustomers(customerData.filter((customer) => customer.active));
      setInvoices(invoiceData);
    });
  }, []);

  const selectedCustomerId = watch("customerId");
  const selectedInvoiceId = watch("invoiceId");
  const invoiceOptions = useMemo(() => {
    const customerInvoices = invoices.filter((invoice) => String(invoice.customerId) === selectedCustomerId && Number(invoice.balanceAmount) > 0);
    return customerInvoices.map((invoice) => ({
      label: `${invoice.invoiceNo} | ${invoice.paymentStatus} | Due ${formatCurrency(invoice.balanceAmount)}`,
      value: invoice.id
    }));
  }, [invoices, selectedCustomerId]);

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
    setSuccessMessage("");

    const payload: PaymentRequest = {
      customerId: Number(values.customerId),
      invoiceId: values.invoiceId ? Number(values.invoiceId) : undefined,
      amount: Number(values.amount),
      paymentDate: values.paymentDate,
      mode: values.mode,
      remarks: values.remarks || undefined
    };

    if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
      setApiError({ message: "Payment amount must be greater than 0" }, "Payment amount must be greater than 0");
      return;
    }

    try {
      await createPayment(payload);
      const message = CommonSuccessMessageUtil.created("Payment");
      setSuccessMessage(message);
      notificationService.showSuccess("Payment Recorded Successfully");
      reset({
        customerId: "",
        invoiceId: "",
        amount: "",
        paymentDate: new Date().toISOString().slice(0, 10),
        mode: "UPI",
        remarks: ""
      });
    } catch (err: any) {
      setApiError(err, "Unable to record payment");
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <Header
        title="Payment entry"
        subtitle="Record customer collections and map them to invoices with consistent validation and clean form layout."
      />
      <GlassCard className="mx-auto max-w-4xl p-6 md:p-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Payment form</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Record a payment</h2>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <Select
            label="Customer"
            requiredMark
            placeholder="Select Customer"
            error={errors.customerId?.message}
            options={customers.map((customer) => ({ label: customer.name, value: customer.id }))}
            {...register("customerId", { required: "Customer is required" })}
          />
          <Select
            label="Invoice"
            placeholder="Select Invoice"
            hint="Optional if you are recording an unapplied customer payment."
            options={invoiceOptions}
            {...register("invoiceId")}
          />
          <Input
            label="Amount"
            requiredMark
            type="number"
            step="0.01"
            error={errors.amount?.message}
            {...register("amount", {
              required: "Amount is required",
              validate: (value) => Number(value) > 0 || "Payment amount must be greater than 0"
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
            placeholder="Select Mode"
            options={[
              { label: "UPI", value: "UPI" },
              { label: "Cash", value: "CASH" },
              { label: "Card", value: "CARD" },
              { label: "Bank Transfer", value: "BANK_TRANSFER" },
              { label: "Cheque", value: "CHEQUE" },
              { label: "Wallet", value: "WALLET" },
              { label: "Other", value: "OTHER" }
            ]}
            {...register("mode")}
          />
          <Input label="Remarks" className="md:col-span-2" {...register("remarks")} />
          {serverError ? <div className="md:col-span-2 rounded-[24px] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{serverError}</div> : null}
          {successMessage ? <div className="md:col-span-2 rounded-[24px] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-200">{successMessage}</div> : null}
          <div className="md:col-span-2">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : "Add payment"}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};
