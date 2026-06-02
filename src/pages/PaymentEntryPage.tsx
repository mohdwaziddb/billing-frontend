import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { getCustomers } from "../api/customers";
import { getInvoices } from "../api/invoices";
import { createPayment } from "../api/payments";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useApiMessage } from "../hooks/useApiFeedback";
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const { message: serverError, clearMessage, setApiError } = useApiMessage();
  const {
    register,
    watch,
    handleSubmit,
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
    void Promise.all([getCustomers(), getInvoices()]).then(([customerData, invoiceData]) => {
      setCustomers(customerData.filter((customer) => customer.active));
      setInvoices(invoiceData);
    });
  }, []);

  const selectedCustomerId = watch("customerId");
  const invoiceOptions = useMemo(() => {
    const customerInvoices = invoices.filter((invoice) => String(invoice.customerId) === selectedCustomerId);
    return customerInvoices.map((invoice) => ({
      label: `${invoice.invoiceNo} | ${invoice.paymentStatus}`,
      value: invoice.id
    }));
  }, [invoices, selectedCustomerId]);

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

    try {
      await createPayment(payload);
      setSuccessMessage("Payment recorded successfully.");
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
    <div className="space-y-4">
      <Header
        title="Payment entry"
        subtitle="Record collections against customers and invoices while the backend validates balances and updates payment status."
      />
      <GlassCard className="max-w-3xl p-6">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <Select
            label="Customer"
            requiredMark
            placeholder="Select Customer"
            error={errors.customerId?.message}
            options={customers.map((customer) => ({ label: customer.name, value: customer.id }))}
            {...register("customerId", { required: "Customer is required" })}
          />
          <Select label="Invoice" placeholder="Select Invoice" options={invoiceOptions} {...register("invoiceId")} />
          <Input
            label="Amount"
            requiredMark
            type="number"
            step="0.01"
            error={errors.amount?.message}
            {...register("amount", { required: "Amount is required" })}
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
          {serverError ? <p className="md:col-span-2 text-sm text-rose-300">{serverError}</p> : null}
          {successMessage ? <p className="md:col-span-2 text-sm text-emerald-300">{successMessage}</p> : null}
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
