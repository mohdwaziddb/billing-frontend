import { useEffect, useRef, useState } from "react";
import { type FieldErrors, useForm, Controller } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { createCustomer, getCustomer, getCustomers, updateCustomer } from "../api/customers";
import { getStates } from "../api/states";
import { FormActionBar } from "../components/FormActionBar";
import { FormSection } from "../components/FormSection";
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
    getValues,
    control,
    formState,
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

  // Live snapshot of dirty state: a slow edit-fetch must never wipe what the
  // user already typed. Merged below (server value only for pristine fields).
  const formStateRef = useRef(formState);
  formStateRef.current = formState;

  useEffect(() => {
    if (!customerId) {
      return;
    }

    let cancelled = false;
    void getCustomer(Number(customerId)).then((customer) => {
      if (cancelled) {
        return;
      }
      const server: FormValues = {
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
      };
      const dirty = formStateRef.current.dirtyFields ?? {};
      const current = getValues();
      const merged = Object.fromEntries(
        (Object.keys(server) as Array<keyof FormValues>).map((key) => [
          key,
          dirty[key] ? current[key] : server[key]
        ])
      ) as FormValues;
      reset(merged);
    });
    return () => {
      cancelled = true;
    };
  }, [customerId, reset, getValues]);

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
    <div className="space-y-4 pb-6 md:space-y-5">
      <Header
        title={editing ? "Edit Customer" : "Add Customer"}
        subtitle="Create and update customer records with clear validation, balanced spacing, and consistent controls."
      />

      <div className="space-y-4">
        <FormActionBar
          items={[{ label: "Customers", to: "/customers" }, { label: editing ? "Edit Customer" : "Add Customer" }]}
          backTo="/customers"
          formId="customer-form"
          saveLabel="Save Customer"
          saving={isSubmitting}
          saveDisabled={!canSaveCustomer}
        />

        <form id="customer-form" className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit(onSubmit, onInvalid)}>
          <FormSection title="Customer Details">
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
              {/* Controlled: shown option always equals submitted value. */}
              <Controller
                name="gstRegistered"
                control={control}
                render={({ field }) => (
                  <Select
                    label="GST Registered"
                    placeholder={null}
                    options={[
                      { label: "No", value: "false" },
                      { label: "Yes", value: "true" }
                    ]}
                    name={field.name}
                    value={field.value}
                    onChange={(event) => {
                      const next = event.target.value;
                      field.onChange(next);
                      if (next !== "true") {
                        setValue("gstNo", "", { shouldDirty: true, shouldValidate: true });
                      }
                    }}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Status"
                    placeholder="Select Status"
                    error={fieldErrors.active}
                    options={[
                      { label: "Active", value: "true" },
                      { label: "Inactive", value: "false" }
                    ]}
                    name={field.name}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
            </div>
          </FormSection>

          <FormSection title="Address Information">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Address"
                error={fieldErrors.address ?? errors.address?.message}
                {...register("address")}
              />
              <Input label="City" {...register("city")} />
              <Controller
                name="stateId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="State"
                    placeholder={states.length ? "Select State" : "Loading States"}
                    options={[{ label: "Select State", value: "" }, ...states.map((state) => ({ label: state.stateName, value: String(state.id) }))]}
                    name={field.name}
                    value={field.value}
                    onChange={(event) => {
                      const next = event.target.value;
                      field.onChange(next);
                      const selected = states.find((item) => String(item.id) === next);
                      setValue("stateId", next, { shouldDirty: true });
                      setValue("state", selected?.stateName ?? "", { shouldDirty: true });
                      setValue("country", selected?.countryName ?? watch().country, { shouldDirty: true });
                    }}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
              <input type="hidden" {...register("state")} />
              <Input label="Country" {...register("country")} />
              <Input label="Pincode" {...register("pincode")} />
            </div>
          </FormSection>
        </form>
      </div>
    </div>
  );
};
