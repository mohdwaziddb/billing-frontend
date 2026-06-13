import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCustomers } from "../api/customers";
import { getInvoices } from "../api/invoices";
import { createPayment } from "../api/payments";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useApiMessage } from "../hooks/useApiFeedback";
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

const todayIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export const PaymentEntryPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
      mode: "CASH",
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
      notificationService.showSuccess("Payment Recorded Successfully");
      reset({
        customerId: "",
        invoiceId: "",
        amount: "",
        paymentDate: todayIso(),
        mode: "CASH",
        remarks: ""
      });
    } catch (err: any) {
      setApiError(err, "Unable to record payment");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header
        title="Payments > Add Payment"
        subtitle="Record customer collections and map them to invoices with consistent validation and clean form layout."
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
            <Button disabled={isSubmitting} type="submit" form="payment-form">
              {isSubmitting ? "Saving..." : "Save Payment"}
            </Button>
          </div>
        </div>
        <form id="payment-form" className="grid gap-4 lg:grid-cols-3" onSubmit={handleSubmit(onSubmit)}>
          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-bold uppercase text-slate-500">Customer Information</h3>
            <Select
              label="Customer"
              requiredMark
              placeholder="Select Customer"
              error={errors.customerId?.message}
              options={customers.map((customer) => ({ label: customer.name, value: customer.id }))}
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
              <Input label="Remarks" {...register("remarks")} />
            </div>
          </section>
        </form>
      </GlassCard>
    </div>
  );
};
