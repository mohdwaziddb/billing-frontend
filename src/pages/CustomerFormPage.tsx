import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { createCustomer, getCustomer, updateCustomer } from "../api/customers";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useApiFormFeedback } from "../hooks/useApiFeedback";
import type { CustomerRequest } from "../types/api";

type FormValues = {
  name: string;
  mobile: string;
  email: string;
  address: string;
  gstNo: string;
  openingBalance: string;
  creditLimit: string;
  active: string;
};

export const CustomerFormPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const editing = Boolean(customerId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      address: "",
      gstNo: "",
      openingBalance: "",
      creditLimit: "",
      active: "true"
    }
  });
  const { message: serverError, fieldErrors, clearFeedback, applyApiError } = useApiFormFeedback();

  useEffect(() => {
    if (!customerId) {
      return;
    }

    void getCustomer(Number(customerId)).then((customer) => {
      reset({
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email ?? "",
        address: customer.address ?? "",
        gstNo: customer.gstNo ?? "",
        openingBalance: String(customer.openingBalance),
        creditLimit: String(customer.creditLimit),
        active: customer.active ? "true" : "false"
      });
    });
  }, [customerId, reset]);

  const onSubmit = async (values: FormValues) => {
    clearFeedback();

    const payload: CustomerRequest = {
      name: values.name.trim(),
      mobile: values.mobile.trim(),
      email: values.email.trim() || undefined,
      address: values.address.trim() || undefined,
      gstNo: values.gstNo.trim() || undefined,
      openingBalance: Number(values.openingBalance || 0),
      creditLimit: Number(values.creditLimit || 0),
      active: values.active === "true"
    };

    try {
      if (editing) {
        await updateCustomer(Number(customerId), payload);
      } else {
        await createCustomer(payload);
      }
      navigate("/customers");
    } catch (err: any) {
      applyApiError(err, "Unable to save customer");
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <Header
        title={editing ? "Edit customer" : "Add customer"}
        subtitle="Create and update customer records with clear validation, balanced spacing, and consistent controls."
      />

      <GlassCard className="mx-auto max-w-5xl p-6 md:p-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Customer form</p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {editing ? "Update customer details" : "Create new customer"}
          </h2>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Customer Name"
              requiredMark
              error={fieldErrors.name ?? errors.name?.message}
              {...register("name", { required: "Name is required" })}
            />
            <Input
              label="Mobile Number"
              requiredMark
              error={fieldErrors.mobile ?? errors.mobile?.message}
              {...register("mobile", { required: "Mobile is required" })}
            />
            <Input
              label="Email Address"
              type="email"
              error={fieldErrors.email ?? errors.email?.message}
              {...register("email")}
            />
            <Input
              label="GST Number"
              error={fieldErrors.gstNo ?? errors.gstNo?.message}
              {...register("gstNo")}
            />
          </div>

          <div className="grid gap-4">
            <Input
              label="Address"
              hint="Store the billing or communication address for this customer."
              error={fieldErrors.address ?? errors.address?.message}
              {...register("address")}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Opening Balance"
              type="number"
              step="0.01"
              error={fieldErrors.openingBalance ?? errors.openingBalance?.message}
              {...register("openingBalance")}
            />
            <Input
              label="Credit Limit"
              type="number"
              step="0.01"
              error={fieldErrors.creditLimit ?? errors.creditLimit?.message}
              {...register("creditLimit")}
            />
            <Select
              label="Status"
              placeholder="Select Status"
              error={fieldErrors.active}
              options={[
                { label: "Active", value: "true" },
                { label: "Inactive", value: "false" }
              ]}
              {...register("active")}
            />
          </div>

          {serverError ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
              {serverError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Saving..." : editing ? "Update Customer" : "Create Customer"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/customers")}>
              Cancel
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};
