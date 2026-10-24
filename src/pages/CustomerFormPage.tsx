import { useEffect, useRef, useState } from "react";
import { type FieldErrors, useForm, Controller } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { createCustomer, getCustomer, updateCustomer } from "../api/customers";
import { getStates } from "../api/states";
import { FormActionBar } from "../components/FormActionBar";
import { FormSection } from "../components/FormSection";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useApiFormFeedback } from "../hooks/useApiFeedback";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import {
  EMAIL_VALIDATION_MESSAGE,
  GSTIN_VALIDATION_MESSAGE,
  isValidEmail,
  isValidGstin,
  isValidMobileNumber,
  isValidPincode,
  MOBILE_VALIDATION_MESSAGE,
  normalizeGstin,
  normalizeMobileNumber,
  PINCODE_VALIDATION_MESSAGE
} from "../lib/customerValidation";
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
    // Field chhodte hi error dikhe (pehle sirf Save button disable rehta tha, wajah nahi dikhti thi).
    mode: "onTouched",
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
  const gstRegistered = watch("gstRegistered") === "true";
  const stateSelected = Boolean(watch("stateId"));
  const isIndia = (watch("country") || "India").trim().toLowerCase() === "india";

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
    const normalizedGst = values.gstRegistered === "true" ? normalizeGstin(values.gstNo) : "";
    const payload: CustomerRequest = {
      name: values.name.trim(),
      // "+91 98765-43210" -> "9876543210": duplicate check (DB unique key) bhi isi par chale.
      mobile: normalizeMobileNumber(values.mobile),
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

    // Duplicate mobile/email backend (aur DB unique key) check karta hai. Pehle yahan
    // har save par 1000 customers fetch hote the — 1000 ke baad wala duplicate chhoot jata tha.
    try {
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
      // Backend duplicate message ko sahi field ke neeche bhi dikhao (applyApiError ke baad, warna wo reset kar deta).
      const message: string = err?.response?.data?.message ?? "";
      if (/phone number is already registered/i.test(message)) {
        setFieldErrors({ mobile: message });
      } else if (/email address is already registered/i.test(message)) {
        setFieldErrors({ email: message });
      }
    }
  };

  const onInvalid = (validationErrors: FieldErrors<FormValues>) => {
    notificationService.showError(firstFormErrorMessage(validationErrors, "Please fill customer name and mobile number before saving."));
  };

  return (
    <div className="space-y-4 pb-6 md:space-y-5">
      <Header
        title={editing ? "Edit Customer" : "Add Customer"}
        subtitle={
          editing
            ? "Update contact, GST and address details for this customer."
            : "Add a customer to create invoices, collect payments and track outstanding."
        }
      />

      <div className="space-y-4">
        <FormActionBar
          items={[{ label: "Customers", to: "/customers" }, { label: editing ? "Edit Customer" : "Add Customer" }]}
          backTo="/customers"
          formId="customer-form"
          saveLabel="Save Customer"
          saving={isSubmitting}
        />

        <form
          id="customer-form"
          className="grid items-start gap-4 lg:grid-cols-2"
          noValidate
          onSubmit={handleSubmit(onSubmit, onInvalid)}
        >
          <FormSection title="Customer Details">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Customer Name"
                requiredMark
                autoComplete="off"
                error={fieldErrors.name ?? errors.name?.message}
                {...register("name", {
                  validate: (value) => Boolean(value.trim()) || "Customer name is required."
                })}
              />
              <Input
                label="Mobile Number"
                requiredMark
                type="tel"
                inputMode="tel"
                maxLength={16}
                placeholder="10-digit mobile number"
                autoComplete="off"
                error={fieldErrors.mobile ?? errors.mobile?.message}
                {...register("mobile", {
                  validate: (value) =>
                    !value.trim() ? "Mobile number is required." : isValidMobileNumber(value) || MOBILE_VALIDATION_MESSAGE
                })}
              />
              <Input
                label="Email Address"
                type="email"
                autoComplete="off"
                error={fieldErrors.email ?? errors.email?.message}
                {...register("email", {
                  validate: (value) => !value.trim() || isValidEmail(value) || EMAIL_VALIDATION_MESSAGE
                })}
              />
              <Controller
                name="active"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Status"
                    placeholder={null}
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
              {/* GST Registered pehle, phir GSTIN: pehle disabled GSTIN field toggle se upar aata tha. */}
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
              <Input
                label="GSTIN"
                requiredMark={gstRegistered}
                disabled={!gstRegistered}
                maxLength={15}
                autoComplete="off"
                className="uppercase placeholder:normal-case"
                placeholder={gstRegistered ? "15-character GSTIN" : "Select GST Registered: Yes"}
                error={fieldErrors.gstNo ?? fieldErrors.gstin ?? errors.gstNo?.message}
                {...register("gstNo", {
                  setValueAs: (value: string) => normalizeGstin(value ?? ""),
                  validate: (value, all) => {
                    if (all.gstRegistered !== "true") {
                      return true;
                    }
                    if (!value.trim()) {
                      return "GSTIN is required when GST Registered is Yes.";
                    }
                    return isValidGstin(value) || GSTIN_VALIDATION_MESSAGE;
                  }
                })}
              />
            </div>
          </FormSection>

          <FormSection title="Address Information">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Input
                  label="Address"
                  placeholder="House / shop no., street, area"
                  error={fieldErrors.address ?? errors.address?.message}
                  {...register("address")}
                />
              </div>
              <Input label="City" error={fieldErrors.city} {...register("city")} />
              <Input
                label="Pincode"
                inputMode="numeric"
                maxLength={isIndia ? 6 : 10}
                autoComplete="off"
                error={fieldErrors.pincode ?? errors.pincode?.message}
                {...register("pincode", {
                  validate: (value) => !value.trim() || !isIndia || isValidPincode(value) || PINCODE_VALIDATION_MESSAGE
                })}
              />
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
                      setValue("state", selected?.stateName ?? "", { shouldDirty: true });
                      setValue("country", selected?.countryName ?? getValues("country"), { shouldDirty: true });
                    }}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
              <input type="hidden" {...register("state")} />
              {/* State chuna ho to country usi se save hoti hai — field edit karne ka bhram na ho. */}
              <Input
                label="Country"
                readOnly={stateSelected}
                className={stateSelected ? "bg-slate-50 text-slate-500" : undefined}
                hint={stateSelected ? "Taken from the selected state." : undefined}
                {...register("country")}
              />
            </div>
          </FormSection>
        </form>
      </div>
    </div>
  );
};
