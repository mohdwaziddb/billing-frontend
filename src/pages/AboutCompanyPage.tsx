import clsx from "clsx";
import { Building2, ChevronDown, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getCompanyOwners, getCompanySettings, updateCompanyOwners, updateCompanySettings, uploadCompanyLogo, type CompanySettingsRequest } from "../api/company";
import { getCompanyUsers } from "../api/users";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { env } from "../config/env";
import type { UserProfile } from "../types/api";

type FormState = CompanySettingsRequest;

const emptyForm: FormState = {
  name: "",
  legalName: "",
  email: "",
  phone: "",
  alternatePhone: "",
  address: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  taxId: "",
  panNumber: "",
  cinNumber: "",
  websiteUrl: "",
};

const apiOrigin = env.apiBaseUrl.replace(/\/api\/?$/, "");
const logoSrc = (url?: string | null) => {
  if (!url) {
    return null;
  }
  return url.startsWith("http") ? url : `${apiOrigin}${url}`;
};

export const AboutCompanyPage = () => {
  const { can, refreshProfile } = useAuth();
  const canEdit = can("ABOUT_COMPANY", "EDIT");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [ownerIds, setOwnerIds] = useState<number[]>([]);
  const [ownersOpen, setOwnersOpen] = useState(false);
  const ownersRef = useRef<HTMLDivElement | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const { message: error, clearMessage, setApiError } = useApiMessage();

  const setField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const loadCompany = async () => {
    setLoading(true);
    try {
      const company = await getCompanySettings();
      const [ownerData, userData] = await Promise.all([
        getCompanyOwners().catch(() => []),
        canEdit ? getCompanyUsers({ size: 1000 }).catch(() => []) : Promise.resolve([])
      ]);
      setForm({
        name: company.name ?? "",
        legalName: company.legalName ?? "",
        email: company.email ?? "",
        phone: company.phone ?? "",
        alternatePhone: company.alternatePhone ?? "",
        address: company.address ?? "",
        addressLine1: company.addressLine1 ?? company.address ?? "",
        addressLine2: company.addressLine2 ?? "",
        city: company.city ?? "",
        state: company.state ?? "",
        country: company.country ?? "",
        pincode: company.pincode ?? "",
        taxId: company.taxId ?? "",
        panNumber: company.panNumber ?? "",
        cinNumber: company.cinNumber ?? "",
        websiteUrl: company.websiteUrl ?? "",
      });
      setLogoUrl(company.logoUrl ?? null);
      setOwnerIds(ownerData.map((owner) => owner.userId));
      setUsers(canEdit ? userData : ownerData.map((owner) => ({
        id: owner.userId,
        fullName: owner.fullName,
        mobileNumber: owner.mobileNumber,
        email: owner.email,
        role: owner.role,
        active: owner.active,
        company: null
      })));
    } catch (err: any) {
      setApiError(err, "Unable to load company profile");
    } finally {
      setLoading(false);
    }
  };

  const toggleOwner = (userId: number) => {
    setOwnerIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
  };

  useEffect(() => {
    void loadCompany();
  }, [canEdit]);

  useEffect(() => {
    if (!ownersOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!ownersRef.current?.contains(event.target as Node)) {
        setOwnersOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [ownersOpen]);

  const saveProfile = async () => {
    clearMessage();
    setSuccess("");
    setSaving(true);
    try {
      const updated = await updateCompanySettings({
        ...form,
        address: form.addressLine1 || form.address
      });
      if (canEdit && ownerIds.length) {
        await updateCompanyOwners(ownerIds);
      }
      setLogoUrl(updated.logoUrl ?? null);
      await refreshProfile();
      setSuccess("Company profile updated successfully.");
    } catch (err: any) {
      setApiError(err, "Unable to update company profile");
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file?: File) => {
    if (!file) {
      return;
    }
    clearMessage();
    setSuccess("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setApiError({ message: "Only JPG, PNG, and WEBP logos are allowed" }, "Only JPG, PNG, and WEBP logos are allowed");
      return;
    }
    try {
      const updated = await uploadCompanyLogo(file);
      setLogoUrl(updated.logoUrl ?? null);
      await refreshProfile();
      setSuccess("Company logo uploaded successfully.");
    } catch (err: any) {
      setApiError(err, "Unable to upload company logo");
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title="About Company" subtitle="Manage company identity, contact details, branding, and invoice communication settings." />

      {error ? <div className="glass rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
      {success ? <div className="glass rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-200">{success}</div> : null}

      <GlassCard className="p-6 md:p-7">
        {loading ? (
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 text-sm text-slate-300">Loading company profile...</div>
        ) : (
          <div className="space-y-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
                  {logoSrc(logoUrl) ? <img className="h-full w-full object-contain" src={logoSrc(logoUrl) ?? ""} alt="Company logo" /> : <Building2 className="text-sky-100" size={30} />}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Branding</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">{form.name || "Company Profile"}</h2>
                  <p className="mt-1 text-sm text-slate-400">Company profile and ownership settings</p>
                </div>
              </div>
              {canEdit ? (
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] border border-white/10 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/12">
                  <Upload size={16} />
                  Upload logo
                  <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadLogo(event.target.files?.[0])} />
                </label>
              ) : null}
            </div>

            <section className="grid gap-4 md:grid-cols-2">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400 md:col-span-2">Basic details</p>
              <Input disabled={!canEdit} requiredMark label="Company Name" value={form.name} onChange={(event) => setField("name", event.target.value)} />
              <Input disabled={!canEdit} label="Legal Company Name" value={form.legalName} onChange={(event) => setField("legalName", event.target.value)} />
              <Input disabled={!canEdit} requiredMark label="GST Number" value={form.taxId} onChange={(event) => setField("taxId", event.target.value)} />
              <Input disabled={!canEdit} label="PAN Number" value={form.panNumber} onChange={(event) => setField("panNumber", event.target.value)} />
              <Input disabled={!canEdit} label="CIN Number" value={form.cinNumber} onChange={(event) => setField("cinNumber", event.target.value)} />
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400 md:col-span-2">Contact details</p>
              <Input disabled={!canEdit} requiredMark label="Mobile Number" value={form.phone} onChange={(event) => setField("phone", event.target.value)} />
              <Input disabled={!canEdit} label="Alternate Mobile" value={form.alternatePhone} onChange={(event) => setField("alternatePhone", event.target.value)} />
              <Input disabled={!canEdit} requiredMark type="email" label="Email Address" value={form.email} onChange={(event) => setField("email", event.target.value)} />
              <Input disabled={!canEdit} label="Website URL" value={form.websiteUrl} onChange={(event) => setField("websiteUrl", event.target.value)} />
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400 md:col-span-2">Address</p>
              <Input disabled={!canEdit} label="Address Line 1" value={form.addressLine1} onChange={(event) => setField("addressLine1", event.target.value)} />
              <Input disabled={!canEdit} label="Address Line 2" value={form.addressLine2} onChange={(event) => setField("addressLine2", event.target.value)} />
              <Input disabled={!canEdit} label="City" value={form.city} onChange={(event) => setField("city", event.target.value)} />
              <Input disabled={!canEdit} label="State" value={form.state} onChange={(event) => setField("state", event.target.value)} />
              <Input disabled={!canEdit} label="Country" value={form.country} onChange={(event) => setField("country", event.target.value)} />
              <Input disabled={!canEdit} label="Pincode" value={form.pincode} onChange={(event) => setField("pincode", event.target.value)} />
            </section>

            <section className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Company owners</p>
                <p className="mt-2 text-sm text-slate-400">Select one or more active users who can manage company profile, theme, users, and setup settings.</p>
              </div>
              <div ref={ownersRef} className="relative max-w-2xl">
                <button
                  type="button"
                  disabled={!canEdit}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[var(--radius-control)] border border-white/10 bg-[var(--panel-strong)] px-4 py-3 text-left text-sm font-semibold text-slate-100 transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={() => setOwnersOpen((current) => !current)}
                >
                  <span className="min-w-0 truncate">
                    {ownerIds.length
                      ? users.filter((user) => ownerIds.includes(user.id)).map((user) => user.fullName).join(", ")
                      : "Select company owners"}
                  </span>
                  <ChevronDown className={ownersOpen ? "shrink-0 rotate-180 transition" : "shrink-0 transition"} size={18} />
                </button>

                {ownersOpen ? (
                  <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-[20px] border border-white/10 bg-slate-950/95 p-2 shadow-[0_24px_70px_rgba(2,6,23,0.55)] backdrop-blur-xl">
                    {users.map((user) => {
                      const checked = ownerIds.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          className={clsx(
                            "flex w-full items-start gap-3 rounded-[16px] px-3 py-3 text-left transition hover:bg-white/8",
                            checked ? "bg-[color-mix(in_srgb,var(--theme-color)_16%,transparent)]" : ""
                          )}
                          onClick={() => toggleOwner(user.id)}
                        >
                          <span className={clsx("mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border", checked ? "border-[var(--theme-border)] bg-[var(--theme-color)]" : "border-white/20")}>
                            {checked ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 font-semibold text-white">
                              {user.fullName}
                              {checked ? <ShieldCheck className="text-[var(--theme-light)]" size={15} /> : null}
                            </span>
                            <span className="mt-1 block truncate text-xs text-slate-400">{user.email}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              {canEdit && ownerIds.length === 0 ? <p className="text-sm text-rose-300">At least one owner is required.</p> : null}
            </section>

            <div className="flex flex-wrap gap-3">
              {canEdit ? <Button disabled={saving || ownerIds.length === 0} onClick={() => void saveProfile()}>{saving ? "Saving..." : "Save company profile"}</Button> : null}
              {!canEdit ? <p className="text-sm text-slate-400">You have view-only access to company profile details.</p> : null}
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};
