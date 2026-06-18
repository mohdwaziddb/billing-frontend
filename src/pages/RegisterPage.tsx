import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Input } from "../components/Input";
import { PasswordInput } from "../components/PasswordInput";
import { useAuth } from "../context/AuthContext";
import { useApiFormFeedback } from "../hooks/useApiFeedback";

const initialForm = {
  companyName: "",
  companyEmail: "",
  companyPhone: "",
  companyAddress: "",
  taxId: "",
  adminFullName: "",
  adminUsername: "",
  adminMobileNumber: "",
  adminEmail: "",
  adminPassword: ""
};

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const { fieldErrors, clearFeedback, clearFieldError, applyApiError } = useApiFormFeedback();
  const canSubmit = Object.values(form).every((value) => value.trim());

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      clearFeedback();
      const firstRoute = await register(form);
      navigate(firstRoute ?? "/no-menu", { replace: true });
    } catch (err: any) {
      applyApiError(err, "Unable to register");
    } finally {
      setLoading(false);
    }
  };

  const fields: Array<[keyof typeof form, string, boolean]> = [
    ["companyName", "Company Name", true],
    ["companyEmail", "Company Email", true],
    ["companyPhone", "Company Phone", true],
    ["companyAddress", "Company Address", true],
    ["taxId", "Tax ID", true],
    ["adminFullName", "Admin Name", true],
    ["adminUsername", "Admin Username", true],
    ["adminMobileNumber", "Admin Mobile Number", true],
    ["adminEmail", "Admin Email", true],
    ["adminPassword", "Admin Password", true]
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-bg)] px-4 py-10">
      <GlassCard className="w-full max-w-5xl p-8 md:p-10">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-[var(--theme-color)]">Wazid Create your workspace</p>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-950">Register your company</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Set up your billing workspace and administrator account with backend validation for security and access.
          </p>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          {fields.map(([key, label, requiredMark]) => {
            const sharedProps = {
              key,
              label,
              requiredMark,
              value: form[key],
              error: fieldErrors[key],
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, [key]: value }));
                clearFieldError(key);
              }
            };

            if (key.toLowerCase().includes("password")) {
              return <PasswordInput {...sharedProps} />;
            }

            return (
              <Input
                {...sharedProps}
                type={
                  key.toLowerCase().includes("email")
                    ? "email"
                    : key.toLowerCase().includes("mobile") || key.toLowerCase().includes("phone")
                      ? "tel"
                      : "text"
                }
              />
            );
          })}
          <div className="md:col-span-2 flex flex-col gap-4 pt-2 md:flex-row md:items-center md:justify-between">
            <Button disabled={loading || !canSubmit} type="submit">
              {loading ? "Creating workspace..." : "Register company"}
            </Button>
            <p className="text-sm text-slate-600">
              Already have access?{" "}
              <Link className="font-semibold text-[var(--theme-color)]" to="/login">
                Back to login
              </Link>
            </p>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};
