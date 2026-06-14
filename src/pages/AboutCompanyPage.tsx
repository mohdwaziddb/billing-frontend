import { Building2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteCompanyLogo, getCompanySettings, updateCompanySettings, uploadCompanyLogo, type CompanySettingsRequest } from "../api/company";
import { Button } from "../components/Button";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { env } from "../config/env";
import { notificationService } from "../services/notificationService";

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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const { clearMessage, setApiError } = useApiMessage();
  const [deletingLogo, setDeletingLogo] = useState(false);
  const [confirmRemoveLogo, setConfirmRemoveLogo] = useState(false);
  const canSaveProfile = Boolean(form.name.trim() && form.taxId.trim() && form.phone.trim() && form.email.trim());

  const setField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const loadCompany = async () => {
    setLoading(true);
    try {
      const company = await getCompanySettings();
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
    } catch (err: any) {
      setApiError(err, "Unable to load company profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCompany();
  }, [canEdit]);

  const saveProfile = async () => {
    clearMessage();
    setSuccess("");
    setSaving(true);
    try {
      const updated = await updateCompanySettings({
        ...form,
        address: form.addressLine1 || form.address
      });
      setLogoUrl(updated.logoUrl ?? null);
      await refreshProfile();
      const message = CommonSuccessMessageUtil.updated("Company Profile");
      setSuccess(message);
      notificationService.showSuccess(message);
    } catch (err: any) {
      setApiError(err, "Unable to update company profile");
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = async () => {
    clearMessage();
    setSuccess("");
    setDeletingLogo(true);
    try {
      const updated = await deleteCompanyLogo();
      setLogoUrl(updated.logoUrl ?? null);
      await refreshProfile();
      notificationService.showSuccess(CommonSuccessMessageUtil.updated("Company Logo"));
    } catch (err: any) {
      setApiError(err, "Unable to remove company logo");
    } finally {
      setDeletingLogo(false);
      setConfirmRemoveLogo(false);
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
      notificationService.showSuccess(CommonSuccessMessageUtil.updated("Company Logo"));
    } catch (err: any) {
      setApiError(err, "Unable to upload company logo");
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title="About Company" subtitle="Manage company identity, contact details, branding, and invoice communication settings." />

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
                  <p className="mt-1 text-sm text-slate-400">Company profile settings</p>
                </div>
              </div>
              {canEdit ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] border border-white/10 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/12">
                    <Upload size={16} />
                    Upload logo
                    <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadLogo(event.target.files?.[0])} />
                  </label>
                  {logoUrl ? (
                    <Button type="button" variant="danger" disabled={deletingLogo} onClick={() => setConfirmRemoveLogo(true)}>
                      Remove logo
                    </Button>
                  ) : null}
                </div>
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

            <div className="flex flex-wrap gap-3">
              {canEdit ? <Button disabled={saving || !canSaveProfile} onClick={() => void saveProfile()}>{saving ? "Saving..." : "Save company profile"}</Button> : null}
              {!canEdit ? <p className="text-sm text-slate-400">You have view-only access to company profile details.</p> : null}
            </div>
          </div>
        )}
      </GlassCard>

      <CommonDeleteModal
        open={confirmRemoveLogo}
        loading={deletingLogo}
        onCancel={() => setConfirmRemoveLogo(false)}
        onConfirm={() => void removeLogo()}
      />
    </div>
  );
};
