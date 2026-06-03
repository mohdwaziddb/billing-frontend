import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Input } from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { useApiFormFeedback } from "../hooks/useApiFeedback";

const initialForm = {
  companyName: "",
  companyEmail: "",
  companyPhone: "",
  companyAddress: "",
  taxId: "",
  adminFullName: "",
  adminEmail: "",
  adminPassword: ""
};

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const { message: error, fieldErrors, clearFeedback, clearFieldError, applyApiError } = useApiFormFeedback();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      clearFeedback();
      await register(form);
      navigate("/dashboard", { replace: true });
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
    ["adminEmail", "Admin Email", true],
    ["adminPassword", "Admin Password", true]
  ];

  return (
    <div className="noise flex min-h-screen items-center justify-center px-4 py-10">
      <GlassCard className="w-full max-w-5xl p-8 md:p-10">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-200/70">Create your workspace</p>
          <h1 className="mt-4 text-4xl font-extrabold text-white">Register your company</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300/70">
            Set up your billing workspace and administrator account with backend validation for security and access.
          </p>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
          {fields.map(([key, label, requiredMark]) => (
            <Input
              key={key}
              label={label}
              requiredMark={requiredMark}
              type={
                key.toLowerCase().includes("password")
                  ? "password"
                  : key.toLowerCase().includes("email")
                    ? "email"
                    : "text"
              }
              value={form[key]}
              error={fieldErrors[key]}
              onChange={(event) => {
                const value = event.target.value;
                setForm((current) => ({ ...current, [key]: value }));
                clearFieldError(key);
              }}
            />
          ))}
          {error ? <div className="md:col-span-2 rounded-[24px] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
          <div className="md:col-span-2 flex flex-col gap-4 pt-2 md:flex-row md:items-center md:justify-between">
            <Button disabled={loading} type="submit">
              {loading ? "Creating workspace..." : "Register company"}
            </Button>
            <p className="text-sm text-slate-300/75">
              Already have access?{" "}
              <Link className="font-semibold text-sky-200" to="/login">
                Back to login
              </Link>
            </p>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};
