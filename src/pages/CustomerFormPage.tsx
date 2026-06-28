import { useEffect, useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { createCustomer, getCustomer, getCustomers, updateCustomer } from "../api/customers";
import { getStates } from "../api/states";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useApiFormFeedback } from "../hooks/useApiFeedback";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { firstFormErrorMessage } from "../lib/formValidation";
import { notificationService } from "../services/notificationService";
import type { CustomerRequest } from "../types/api";

type FormValues = {
  name: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  stateId: string;
  state: string;
  country: string;
  pincode: string;
  gstNo: string;
  gstRegistered: string;
  active: string;
};

export const CustomerFormPage = () => {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const editing = Boolean(customerId);
  const [states, setStates] = useState<Array<{ id: number; stateName: string; countryName: string }>>([]);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
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
    }
  });
  const { fieldErrors, setFieldErrors, clearFeedback, applyApiError } = useApiFormFeedback();
  const watchedValues = watch();
  const canSaveCustomer = Boolean(
    watchedValues.name.trim() &&
    watchedValues.mobile.trim() &&
    (watchedValues.gstRegistered !== "true" || watchedValues.gstNo.trim())
  );

  useEffect(() => {
    void getStates()
      .then((rows) => setStates(rows))
      .catch((err: any) => {
        notificationService.showError("Unable to load states list", err);
      });
  }, []);

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
        city: customer.city ?? "",
        stateId: customer.stateId ? String(customer.stateId) : "",
        state: customer.state ?? "",
        country: customer.country ?? "India",
        pincode: customer.pincode ?? "",
        gstNo: customer.gstin ?? customer.gstNo ?? "",
        gstRegistered: customer.gstRegistered ? "true" : "false",
        active: customer.active ? "true" : "false"
      });
    });
  }, [customerId, reset]);

  const onSubmit = async (values: FormValues) => {
    clearFeedback();

    const selectedState = values.stateId ? states.find((item) => String(item.id) === values.stateId) : undefined;
    const normalizedGst = values.gstRegistered === "true" ? values.gstNo.trim() : "";
    const payload: CustomerRequest = {
      name: values.name.trim(),
      mobile: values.mobile.trim(),
      email: values.email.trim() || undefined,
      address: values.address.trim() || undefined,
      gstNo: normalizedGst || undefined,
      gstin: normalizedGst || undefined,
      gstRegistered: values.gstRegistered === "true",
      city: values.city.trim() || undefined,
      state: selectedState?.stateName,
      stateId: values.stateId ? Number(values.stateId) : undefined,
      country: selectedState?.countryName ?? (values.country.trim() || undefined),
      pincode: values.pincode.trim() || undefined,
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

  const onInvalid = (validationErrors: FieldErrors<FormValues>) => {
    notificationService.showError(firstFormErrorMessage(validationErrors, "Please fill customer name and mobile number before saving."));
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
            <Button disabled={isSubmitting || !canSaveCustomer} type="submit" form="customer-form">
              {isSubmitting ? "Saving..." : "Save Customer"}
            </Button>
          </div>
        </div>

        <form id="customer-form" className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit(onSubmit, onInvalid)}>
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
                disabled={watchedValues.gstRegistered !== "true"}
                error={fieldErrors.gstNo ?? errors.gstNo?.message}
                {...register("gstNo")}
              />
              <Select
                label="GST Registered"
                placeholder={null}
                options={[
                  { label: "No", value: "false" },
                  { label: "Yes", value: "true" }
                ]}
                {...register("gstRegistered", {
                  onChange: (event) => {
                    if (event.target.value !== "true") {
                      setValue("gstNo", "", { shouldDirty: true, shouldValidate: true });
                    }
                  }
                })}
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
              <Select
                label="State"
                placeholder={states.length ? "Select State" : "Loading States"}
                options={[{ label: "Select State", value: "" }, ...states.map((state) => ({ label: state.stateName, value: String(state.id) }))]}
                {...register("stateId", {
                  onChange: (event) => {
                    const selected = states.find((item) => String(item.id) === event.target.value);
                    reset({
                      ...watch(),
                      stateId: event.target.value,
                      state: selected?.stateName ?? "",
                      country: selected?.countryName ?? watch().country
                    });
                  }
                })}
              />
              <input type="hidden" {...register("state")} />
              <Input label="Country" {...register("country")} />
              <Input label="Pincode" {...register("pincode")} />
            </div>
          </section>

        </form>
      </GlassCard>
    </div>
  );
};
