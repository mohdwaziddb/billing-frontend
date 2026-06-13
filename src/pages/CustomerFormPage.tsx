import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { createCustomer, getCustomer, getCustomers, updateCustomer } from "../api/customers";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useApiFormFeedback } from "../hooks/useApiFeedback";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { notificationService } from "../services/notificationService";
import type { CustomerRequest } from "../types/api";

type FormValues = {
  name: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNo: string;
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
      city: "",
      state: "",
      pincode: "",
      gstNo: "",
      active: "true"
    }
  });
  const { fieldErrors, setFieldErrors, clearFeedback, applyApiError } = useApiFormFeedback();

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
        city: "",
        state: "",
        pincode: "",
        gstNo: customer.gstNo ?? "",
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
      address: [values.address, values.city, values.state, values.pincode].map((value) => value.trim()).filter(Boolean).join(", ") || undefined,
      gstNo: values.gstNo.trim() || undefined,
      active: values.active === "true"
    };

    try {
      const existingCustomers = await getCustomers({ size: 1000 });
      const currentId = editing ? Number(customerId) : null;
      const mobileExists = existingCustomers.some(
        (customer) => customer.id !== currentId && customer.mobile.trim().toLowerCase() === payload.mobile.toLowerCase()
      );
      const normalizedEmail = payload.email?.toLowerCase();
      const emailExists = Boolean(normalizedEmail) && existingCustomers.some(
        (customer) => customer.id !== currentId && (customer.email ?? "").trim().toLowerCase() === normalizedEmail
      );

      if (mobileExists || emailExists) {
        const nextErrors: Record<string, string> = {};
        if (mobileExists) {
          nextErrors.mobile = "This phone number is already registered.";
        }
        if (emailExists) {
          nextErrors.email = "This email address is already registered.";
        }
        setFieldErrors(nextErrors);
        return;
      }

      if (editing) {
        await updateCustomer(Number(customerId), payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.updated("Customer"));
      } else {
        await createCustomer(payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.created("Customer"));
      }
      navigate("/customers");
    } catch (err: any) {
      applyApiError(err, "Unable to save customer");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header
        title={editing ? "Customers > Edit Customer" : "Customers > Add Customer"}
        subtitle="Create and update customer records with clear validation, balanced spacing, and consistent controls."
      />

      <GlassCard className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col p-4 md:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CommonBreadcrumb items={[{ label: "Customers", to: "/customers" }, { label: editing ? "Edit Customer" : "Add Customer" }]} />
            <h2 className="mt-1 text-xl font-bold text-white">
              {editing ? "Edit Customer" : "Add Customer"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => navigate("/customers")}>
              <ArrowLeft size={16} />
              Back
            </Button>
            <Button disabled={isSubmitting} type="submit" form="customer-form">
              {isSubmitting ? "Saving..." : "Save Customer"}
            </Button>
          </div>
        </div>

        <form id="customer-form" className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-bold uppercase text-slate-500">Customer Details</h3>
            <div className="grid gap-3 md:grid-cols-2">
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
          </section>

          <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-bold uppercase text-slate-500">Address Information</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Address"
                error={fieldErrors.address ?? errors.address?.message}
                {...register("address")}
              />
              <Input label="City" {...register("city")} />
              <Input label="State" {...register("state")} />
              <Input label="Pincode" {...register("pincode")} />
            </div>
          </section>

        </form>
      </GlassCard>
    </div>
  );
};
