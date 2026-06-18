import { Building2, CheckCircle2, LoaderCircle, Settings, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  activatePlatformAdminCompany,
  createPlatformAdminCompany,
  deactivatePlatformAdminCompany,
  getPlatformAdminCompanies,
  getPlatformAdminCompanyDetails,
  getPlatformAdminDashboard,
  getPlatformAdminSettings,
  updatePlatformAdminSettings,
  type CreatePlatformAdminCompanyPayload
} from "../api/platformAdmin";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { PasswordInput } from "../components/PasswordInput";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useApiMessage } from "../hooks/useApiFeedback";
import { formatDateTime } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { PageResponse, PlatformAdminCompany, PlatformAdminCompanyDetails, PlatformAdminDashboardSummary, PlatformAdminSettings as PlatformAdminSettingsType } from "../types/api";

type Mode = "dashboard" | "companies" | "details" | "settings";

type SummaryCardFilter = "all" | "active" | "inactive";

type SummaryModalState = {
  filter: SummaryCardFilter;
  title: string;
};

type CompanyStatusActionState = {
  company: PlatformAdminCompany;
  loading: boolean;
} | null;

const emptyCompanyPage: PageResponse<PlatformAdminCompany> = { records: [], page: 0, size: DEFAULT_PAGE_SIZE, totalRecords: 0, totalPages: 0 };

const companyFormInitial: CreatePlatformAdminCompanyPayload = {
  companyName: "",
  address: "",
  gstNumber: "",
  mobile: "",
  email: "",
  ownerName: "",
  ownerUsername: "",
  ownerEmail: "",
  ownerMobile: "",
  ownerPassword: ""
};

const settingsFormInitial = {
  platformName: "",
  platformTagline: "",
  username: "",
  password: ""
};

export const PlatformAdminPage = ({ mode }: { mode: Mode }) => {
  const [dashboard, setDashboard] = useState<PlatformAdminDashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [companies, setCompanies] = useState<PageResponse<PlatformAdminCompany>>(emptyCompanyPage);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [companyActive, setCompanyActive] = useState<"" | "true" | "false">("");
  const [companyPage, setCompanyPage] = useState(0);
  const [detailsCompanyId, setDetailsCompanyId] = useState<number | "">("");
  const [details, setDetails] = useState<PlatformAdminCompanyDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [previewDetails, setPreviewDetails] = useState<PlatformAdminCompanyDetails | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [summaryModal, setSummaryModal] = useState<SummaryModalState | null>(null);
  const [summaryCompanies, setSummaryCompanies] = useState<PageResponse<PlatformAdminCompany>>(emptyCompanyPage);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summarySearch, setSummarySearch] = useState("");
  const [companyFormOpen, setCompanyFormOpen] = useState(false);
  const [companyFormSaving, setCompanyFormSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformAdminSettingsType | null>(null);
  const [settingsForm, setSettingsForm] = useState(settingsFormInitial);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [statusAction, setStatusAction] = useState<CompanyStatusActionState>(null);
  const { setApiError } = useApiMessage();

  const companyOptions = useMemo(() => [
    { label: "Select company", value: "" },
    ...companies.records.map((company) => ({ label: company.name, value: String(company.id) }))
  ], [companies.records]);

  const loadDashboard = async () => {
    setDashboardLoading(true);
    try {
      setDashboard(await getPlatformAdminDashboard());
    } finally {
      setDashboardLoading(false);
    }
  };

  const loadCompanies = async (page = companyPage) => {
    setCompaniesLoading(true);
    try {
      const response = await getPlatformAdminCompanies({
        page,
        size: DEFAULT_PAGE_SIZE,
        search: companySearch.trim() || undefined,
        active: companyActive === "" ? undefined : companyActive === "true"
      });
      setCompanies(response);
      setCompanyPage(response.page);
    } finally {
      setCompaniesLoading(false);
    }
  };

  const loadSummaryCompanies = async (filter: SummaryCardFilter, page = 0) => {
    setSummaryLoading(true);
    try {
      const active = filter === "all" ? undefined : filter === "active";
      const response = await getPlatformAdminCompanies({
        page,
        size: DEFAULT_PAGE_SIZE,
        active,
        search: summarySearch.trim() || undefined
      });
      setSummaryCompanies(response);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadDetails = async (companyId: number) => {
    setDetailsLoading(true);
    try {
      setDetails(await getPlatformAdminCompanyDetails(companyId));
    } finally {
      setDetailsLoading(false);
    }
  };

  const loadPreviewDetails = async (companyId: number) => {
    setPreviewLoading(true);
    try {
      setPreviewDetails(await getPlatformAdminCompanyDetails(companyId));
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadSettings = async () => {
    const response = await getPlatformAdminSettings();
    setSettings(response);
    setSettingsForm({
      platformName: response.platformName ?? "",
      platformTagline: response.platformTagline ?? "",
      username: response.username ?? "",
      password: ""
    });
  };

  const refreshCountsAndLists = async (nextCompanyPage = companyPage) => {
    await Promise.all([
      loadDashboard(),
      mode === "companies" || mode === "details" ? loadCompanies(nextCompanyPage) : Promise.resolve(),
      summaryModal ? loadSummaryCompanies(summaryModal.filter, summaryCompanies.page) : Promise.resolve()
    ]);
  };

  useEffect(() => {
    void loadDashboard().catch((err) => setApiError(err, "Unable to load platform admin data"));
  }, [mode]);

  useEffect(() => {
    if (mode === "companies" || mode === "details") {
      void loadCompanies(0).catch((err) => setApiError(err, "Unable to load companies"));
    }
  }, [companySearch, companyActive, mode]);

  useEffect(() => {
    if (mode === "details" && detailsCompanyId) {
      void loadDetails(detailsCompanyId).catch((err) => setApiError(err, "Unable to load company details"));
    }
  }, [detailsCompanyId, mode]);

  useEffect(() => {
    if (mode === "settings") {
      void loadSettings().catch((err) => setApiError(err, "Unable to load platform settings"));
    }
  }, [mode]);

  useEffect(() => {
    if (summaryModal) {
      void loadSummaryCompanies(summaryModal.filter, 0).catch((err) => setApiError(err, "Unable to load companies"));
    }
  }, [summaryModal, summarySearch]);

  const openSummaryModal = (filter: SummaryCardFilter, title: string) => {
    setSummaryCompanies(emptyCompanyPage);
    setSummarySearch("");
    setSummaryModal({ filter, title });
  };

  const saveCompany = async (payload: CreatePlatformAdminCompanyPayload) => {
    try {
      setCompanyFormSaving(true);
      await createPlatformAdminCompany(trimCompanyPayload(payload));
      setCompanyFormOpen(false);
      notificationService.showSuccess("Company created successfully");
      void refreshCountsAndLists(0).catch((err) => setApiError(err, "Unable to refresh platform admin data"));
    } catch (err) {
      setApiError(err, "Unable to create company");
    } finally {
      setCompanyFormSaving(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSettingsSaving(true);
      const updated = await updatePlatformAdminSettings({
        platformName: settingsForm.platformName.trim(),
        platformTagline: settingsForm.platformTagline.trim(),
        username: settingsForm.username.trim(),
        password: settingsForm.password.trim() || undefined
      });
      setSettings(updated);
      setSettingsForm((current) => ({ ...current, password: "" }));
      notificationService.showSuccess("Platform settings updated successfully");
    } catch (err) {
      setApiError(err, "Unable to update platform settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  const confirmToggleCompany = (company: PlatformAdminCompany) => {
    if (!company.active) {
      void toggleCompany(company);
      return;
    }
    setStatusAction({ company, loading: false });
  };

  const toggleCompany = async (company: PlatformAdminCompany) => {
    const isDeactivate = company.active;
    if (isDeactivate) {
      setStatusAction({ company, loading: true });
    }
    try {
      if (isDeactivate) {
        await deactivatePlatformAdminCompany(company.id);
        notificationService.showSuccess("Company deactivated successfully");
      } else {
        await activatePlatformAdminCompany(company.id);
        notificationService.showSuccess("Company activated successfully");
      }
      setStatusAction(null);
      void refreshCountsAndLists(companyPage).catch((err) => setApiError(err, "Unable to refresh platform admin data"));
    } catch (err) {
      if (isDeactivate) {
        setStatusAction({ company, loading: false });
      }
      setApiError(err, "Unable to update company status");
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title={pageMeta[mode].title} subtitle={pageMeta[mode].subtitle} />
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
        <div className="grid gap-5 bg-[linear-gradient(135deg,#0f172a,#155e75)] px-6 py-6 text-white md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">Platform Administration</p>
            <h2 className="mt-2 text-2xl font-extrabold">Separate platform-owner control layer</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/76">
              This session is isolated from company users and is powered only by credentials stored in platform settings.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-right shadow-inner">
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-100">Platform Mode</p>
            <p className="mt-1 text-lg font-extrabold">PLATFORM ADMIN</p>
          </div>
        </div>
      </div>

      {mode === "dashboard" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total Companies"
            value={dashboard?.totalCompanies ?? 0}
            icon={Building2}
            loading={dashboardLoading}
            onClick={() => openSummaryModal("all", "All Companies")}
          />
          <MetricCard
            label="Active Companies"
            value={dashboard?.activeCompanies ?? 0}
            icon={CheckCircle2}
            loading={dashboardLoading}
            onClick={() => openSummaryModal("active", "Active Companies")}
          />
          <MetricCard
            label="Inactive Companies"
            value={dashboard?.inactiveCompanies ?? 0}
            icon={XCircle}
            loading={dashboardLoading}
            onClick={() => openSummaryModal("inactive", "Inactive Companies")}
          />
        </div>
      ) : null}

      {mode === "companies" ? (
        <GlassCard className="p-6 md:p-7">
          <SectionHeader title="Registered Companies" subtitle="Create, inspect, activate, and suspend tenant companies from one clean operational workspace." />
          <Toolbar search={companySearch} setSearch={setCompanySearch} active={companyActive} setActive={setCompanyActive} onAdd={() => setCompanyFormOpen(true)} />
          {companiesLoading ? <LoadingPanel label="Loading companies..." /> : null}
          <CompanyTable
            companies={companies.records}
            onToggle={confirmToggleCompany}
            onView={(company) => {
              void loadPreviewDetails(company.id).catch((err) => setApiError(err, "Unable to load company details"));
            }}
          />
          <Pagination
            page={companies.page}
            size={companies.size}
            totalRecords={companies.totalRecords}
            totalPages={companies.totalPages}
            disabled={companiesLoading}
            onPageChange={(page) => {
              void loadCompanies(page).catch((err) => setApiError(err, "Unable to load companies"));
            }}
          />
        </GlassCard>
      ) : null}

      {mode === "details" ? (
        <GlassCard className="p-6 md:p-7">
          <SectionHeader title="Company Details" subtitle="Review tenant identity, ownership, activity, and operational readiness." />
          <div className="mb-5 max-w-md">
            <Select label="Company" value={String(detailsCompanyId)} options={companyOptions} onChange={(event) => setDetailsCompanyId(event.target.value ? Number(event.target.value) : "")} />
          </div>
          {detailsLoading ? <LoadingPanel label="Loading company details..." /> : null}
          {details ? <CompanyDetailsView details={details} /> : <p className="text-sm font-medium text-slate-500">Select a company to view details.</p>}
        </GlassCard>
      ) : null}

      {mode === "settings" ? (
        <GlassCard className="p-6 md:p-7">
          <SectionHeader title="Platform Settings" subtitle="Update the branding values and platform-owner credentials stored in the platform settings table." />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Platform Name" value={settingsForm.platformName} onChange={(event) => setSettingsForm((current) => ({ ...current, platformName: event.target.value }))} />
            <Input label="Username" requiredMark value={settingsForm.username} onChange={(event) => setSettingsForm((current) => ({ ...current, username: event.target.value }))} />
            <div className="md:col-span-2">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                <span>Platform Tagline</span>
                <textarea className="min-h-[108px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-color)_18%,transparent)]" rows={3} value={settingsForm.platformTagline} onChange={(event) => setSettingsForm((current) => ({ ...current, platformTagline: event.target.value }))} />
              </label>
            </div>
            <PasswordInput label="New Password" value={settingsForm.password} onChange={(event) => setSettingsForm((current) => ({ ...current, password: event.target.value }))} />
            <div className="flex items-end">
              <Button type="button" disabled={settingsSaving} onClick={() => void saveSettings()}>
                {settingsSaving ? <LoaderCircle className="animate-spin" size={16} /> : <Settings size={16} />} Save settings
              </Button>
            </div>
          </div>
          {settings ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Active username: <span className="font-semibold text-slate-900">{settings.username}</span>
            </div>
          ) : null}
        </GlassCard>
      ) : null}

      <CompanySummaryModal
        state={summaryModal}
        companies={summaryCompanies}
        search={summarySearch}
        loading={summaryLoading}
        onClose={() => setSummaryModal(null)}
        onSearchChange={setSummarySearch}
        onPageChange={(page) => {
          if (!summaryModal) {
            return;
          }
          void loadSummaryCompanies(summaryModal.filter, page).catch((err) => setApiError(err, "Unable to load companies"));
        }}
        onView={(company) => void loadPreviewDetails(company.id).catch((err) => setApiError(err, "Unable to load company details"))}
      />
      <CompanyDetailsModal details={previewDetails} loading={previewLoading} onClose={() => {
        setPreviewLoading(false);
        setPreviewDetails(null);
      }} />
      <CompanyFormModal open={companyFormOpen} loading={companyFormSaving} onClose={() => !companyFormSaving && setCompanyFormOpen(false)} onSave={saveCompany} />
      <DeactivateCompanyModal statusAction={statusAction} onCancel={() => setStatusAction(null)} onConfirm={(company) => void toggleCompany(company)} />
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  icon: Icon,
  loading,
  onClick
}: {
  label: string;
  value: number;
  icon: typeof Building2;
  loading: boolean;
  onClick: () => void;
}) => (
  <button type="button" className="text-left" onClick={onClick}>
    <GlassCard className="h-full p-5 transition hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <div className="mt-3 flex min-h-9 items-center gap-2">
            {loading ? <LoaderCircle className="animate-spin text-white/70" size={22} /> : <p className="text-3xl font-extrabold text-white">{value}</p>}
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/72 dark:text-white/88">Click to view companies</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
          <Icon className="text-white/76" size={25} />
        </span>
      </div>
    </GlassCard>
  </button>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-5 flex flex-col gap-1">
    <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--theme-color)]">{title}</p>
    <p className="max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>
  </div>
);

const Toolbar = ({ search, setSearch, active, setActive, onAdd }: { search: string; setSearch: (value: string) => void; active: string; setActive: (value: "" | "true" | "false") => void; onAdd: () => void }) => (
  <div className="mb-5 grid gap-4 md:grid-cols-[1fr_220px_auto]">
    <Input label="Search Companies" value={search} onChange={(event) => setSearch(event.target.value)} />
    <Select label="Status" value={active} options={[{ label: "All", value: "" }, { label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} onChange={(event) => setActive(event.target.value as "" | "true" | "false")} />
    <div className="flex items-end"><Button type="button" onClick={onAdd}>Create company</Button></div>
  </div>
);

const CompanyTable = ({ companies, onToggle, onView }: { companies: PlatformAdminCompany[]; onToggle: (company: PlatformAdminCompany) => void; onView: (company: PlatformAdminCompany) => void }) => (
  <Table data={companies} emptyText="No companies found." columns={[
    { key: "name", header: "Company Name", render: (item) => <span className="font-semibold text-slate-950">{item.name}</span> },
    { key: "owner", header: "Owner Name", render: (item) => item.ownerName ?? "--" },
    { key: "email", header: "Email", render: (item) => item.email },
    { key: "mobile", header: "Mobile", render: (item) => item.mobile ?? "--" },
    { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "created", header: "Created Date", render: (item) => formatDateTime(item.createdAt) },
    { key: "actions", header: "Actions", render: (item) => <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => onView(item)}>View</Button><Button type="button" variant={item.active ? "danger" : "secondary"} onClick={() => onToggle(item)}>{item.active ? "Deactivate" : "Activate"}</Button></div> }
  ]} />
);

const CompanyDetailsView = ({ details, hideSummaryLabels = [] }: { details: PlatformAdminCompanyDetails; hideSummaryLabels?: string[] }) => (
  <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-4">
      {!hideSummaryLabels.includes("Company") ? <Info label="Company" value={details.company.name} /> : null}
      {!hideSummaryLabels.includes("Owner") ? <Info label="Owner" value={details.owner?.fullName ?? "--"} /> : null}
      {!hideSummaryLabels.includes("Owners") ? <Info label="Owners" value={details.ownerCount} /> : null}
      {!hideSummaryLabels.includes("Admins") ? <Info label="Admins" value={details.adminCount} /> : null}
      {!hideSummaryLabels.includes("Users") ? <Info label="Users" value={details.userCount} /> : null}
      {!hideSummaryLabels.includes("Audit Logs") ? <Info label="Audit Logs" value={details.auditLogCount} /> : null}
    </div>
    <Table data={details.users} emptyText="No users found." columns={[
      { key: "name", header: "Name", render: (item) => <span className="font-semibold text-slate-950">{item.fullName}</span> },
      { key: "username", header: "Username", render: (item) => item.username },
      { key: "email", header: "Email", render: (item) => item.email },
      { key: "mobile", header: "Mobile", render: (item) => item.mobileNumber },
      { key: "role", header: "Role", render: (item) => <StatusBadge label={item.role} /> },
      { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> }
    ]} />
  </div>
);

const Info = ({ label, value }: { label: string; value: string | number }) => <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-2 font-bold text-slate-950">{value}</p></div>;

const CompanyDetailsModal = ({ details, loading, onClose }: { details: PlatformAdminCompanyDetails | null; loading: boolean; onClose: () => void }) => (
  <Modal open={loading || Boolean(details)} title={details?.company.name ?? "Company Details"} onClose={onClose}>
    {loading ? <LoadingPanel label="Loading company details..." /> : null}
    {!loading && details ? <CompanyDetailsView details={details} hideSummaryLabels={["Company", "Owner", "Audit Logs"]} /> : null}
  </Modal>
);

const CompanySummaryModal = ({
  state,
  companies,
  search,
  loading,
  onClose,
  onSearchChange,
  onPageChange,
  onView
}: {
  state: SummaryModalState | null;
  companies: PageResponse<PlatformAdminCompany>;
  search: string;
  loading: boolean;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onView: (company: PlatformAdminCompany) => void;
}) => (
  <Modal open={Boolean(state)} title={state?.title ?? "Companies"} eyebrow="Platform Dashboard" maxWidthClass="max-w-4xl" onClose={onClose}>
    {loading ? <LoadingPanel label="Loading companies..." /> : null}
    <div className="flex min-h-[540px] flex-col gap-5">
      <Input label="Search By Company Name" value={search} onChange={(event) => onSearchChange(event.target.value)} />
      <div className="flex-1">
        <CompanySummaryTable companies={companies.records} onView={onView} />
      </div>
      <div className="min-h-[52px]">
        <Pagination page={companies.page} size={companies.size} totalRecords={companies.totalRecords} totalPages={companies.totalPages} disabled={loading} onPageChange={onPageChange} />
      </div>
    </div>
  </Modal>
);

const CompanyFormModal = ({
  open,
  loading,
  onClose,
  onSave
}: {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSave: (payload: CreatePlatformAdminCompanyPayload) => void;
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState(companyFormInitial);

  useEffect(() => {
    if (open) {
      setStep(1);
      setForm(companyFormInitial);
    }
  }, [open]);

  const updateField = (key: keyof CreatePlatformAdminCompanyPayload, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validateStep = (currentStep: 1 | 2) => {
    const errors = currentStep === 1
      ? [
          !form.companyName.trim() && "Enter company name.",
          !form.email.trim() && "Enter company email.",
          form.email.trim() && !isValidEmail(form.email) && "Enter a valid company email.",
          !form.mobile.trim() && "Enter company mobile number.",
          !form.address.trim() && "Enter company address."
        ]
      : [
          !form.ownerName.trim() && "Enter owner full name.",
          !form.ownerUsername.trim() && "Enter owner username.",
          !form.ownerEmail.trim() && "Enter owner email.",
          form.ownerEmail.trim() && !isValidEmail(form.ownerEmail) && "Enter a valid owner email.",
          !form.ownerMobile.trim() && "Enter owner mobile number.",
          !form.ownerPassword.trim() && "Enter owner password.",
          form.ownerPassword.trim().length > 0 && form.ownerPassword.trim().length < 8 && "Owner password must be at least 8 characters."
        ];

    const firstError = errors.find(Boolean);
    if (firstError) {
      notificationService.showError(firstError);
      return false;
    }
    return true;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) {
      return;
    }
    if (step === 1) {
      if (validateStep(1)) {
        setStep(2);
      }
      return;
    }
    if (validateStep(2)) {
      onSave(form);
    }
  };

  return (
    <Modal open={open} title="Create Company" eyebrow="Platform Companies" maxWidthClass="max-w-3xl" onClose={onClose}>
      <form className="space-y-6" onSubmit={submit}>
      <div className="flex items-center gap-3">
        {stepItems.map((item) => {
          const active = step === item.step;
          const complete = step > item.step;
          return (
            <div key={item.step} className={`flex-1 rounded-2xl border px-4 py-3 ${active ? "border-[var(--theme-color)] bg-[color-mix(in_srgb,var(--theme-color)_8%,white)]" : complete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Step {item.step}</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{item.title}</p>
            </div>
          );
        })}
      </div>

      {step === 1 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Company Name" requiredMark value={form.companyName} onChange={(event) => updateField("companyName", event.target.value)} />
          <Input label="Email" requiredMark type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
          <Input label="Mobile" requiredMark value={form.mobile} onChange={(event) => updateField("mobile", event.target.value)} />
          <Input label="GST" value={form.gstNumber} onChange={(event) => updateField("gstNumber", event.target.value)} />
          <div className="md:col-span-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
              <span>Address <span className="text-rose-500">*</span></span>
              <textarea className="min-h-[108px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-color)_18%,transparent)]" rows={3} value={form.address} onChange={(event) => updateField("address", event.target.value)} />
            </label>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={loading}>
              Continue
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Full Name" requiredMark value={form.ownerName} onChange={(event) => updateField("ownerName", event.target.value)} />
          <Input label="Username" requiredMark value={form.ownerUsername} onChange={(event) => updateField("ownerUsername", event.target.value)} />
          <Input label="Email" requiredMark type="email" value={form.ownerEmail} onChange={(event) => updateField("ownerEmail", event.target.value)} />
          <Input label="Mobile" requiredMark value={form.ownerMobile} onChange={(event) => updateField("ownerMobile", event.target.value)} />
          <div className="md:col-span-2">
            <PasswordInput label="Password" requiredMark value={form.ownerPassword} onChange={(event) => updateField("ownerPassword", event.target.value)} />
          </div>
          <div className="md:col-span-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" disabled={loading} onClick={() => setStep(1)}>
              Back
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <LoaderCircle className="animate-spin" size={16} /> : null}
              {loading ? "Creating..." : "Create company"}
            </Button>
          </div>
        </div>
      )}
      </form>
    </Modal>
  );
};

const DeactivateCompanyModal = ({
  statusAction,
  onCancel,
  onConfirm
}: {
  statusAction: CompanyStatusActionState;
  onCancel: () => void;
  onConfirm: (company: PlatformAdminCompany) => void;
}) => (
  <Modal open={Boolean(statusAction)} title="Deactivate Company" eyebrow="Company Status" maxWidthClass="max-w-lg" onClose={() => !statusAction?.loading && onCancel()}>
    <div className="space-y-5">
      <p className="text-sm leading-6 text-slate-600">
        Users of this company will lose access immediately. Do you want to continue?
      </p>
      {statusAction?.company ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Company: <span className="font-semibold text-slate-950">{statusAction.company.name}</span>
        </div>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" disabled={statusAction?.loading} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="danger" disabled={statusAction?.loading || !statusAction?.company} onClick={() => statusAction?.company && onConfirm(statusAction.company)}>
          {statusAction?.loading ? <LoaderCircle className="animate-spin" size={16} /> : null}
          {statusAction?.loading ? "Deactivating..." : "Deactivate"}
        </Button>
      </div>
    </div>
  </Modal>
);

const LoadingPanel = ({ label }: { label: string }) => (
  <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
    <LoaderCircle className="animate-spin text-[var(--theme-color)]" size={18} />
    <span>{label}</span>
  </div>
);

const CompanySummaryTable = ({ companies, onView }: { companies: PlatformAdminCompany[]; onView: (company: PlatformAdminCompany) => void }) => (
  <div className="h-full space-y-3">
    <div className="hidden min-h-[360px] overflow-hidden rounded-2xl border border-slate-200 md:block">
      <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-700">
        <thead className="bg-slate-50">
          <tr>
            {["Company Name", "Status", "Owner Count", "Admin Count", "User Count", "Created Date"].map((header) => (
              <th key={header} className="border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {companies.length ? companies.map((company) => (
            <tr key={company.id} className="odd:bg-white even:bg-slate-50/55">
              <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-950">
                <button type="button" className="text-left transition hover:text-[var(--theme-color)]" onClick={() => onView(company)}>
                  {company.name}
                </button>
              </td>
              <td className="border-b border-slate-100 px-4 py-4"><StatusBadge label={company.active ? "ACTIVE" : "INACTIVE"} /></td>
              <td className="border-b border-slate-100 px-4 py-4">{company.ownerCount}</td>
              <td className="border-b border-slate-100 px-4 py-4">{company.adminCount}</td>
              <td className="border-b border-slate-100 px-4 py-4">{company.userCount}</td>
              <td className="border-b border-slate-100 px-4 py-4">{formatDateTime(company.createdAt)}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-sm font-medium text-slate-500">No companies found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    <div className="grid min-h-[360px] gap-3 md:hidden">
      {companies.length ? companies.map((company) => (
        <div key={company.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <button type="button" className="text-left text-base font-bold text-slate-950 transition hover:text-[var(--theme-color)]" onClick={() => onView(company)}>
              {company.name}
            </button>
            <StatusBadge label={company.active ? "ACTIVE" : "INACTIVE"} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <CompactInfo label="Owner Count" value={company.ownerCount} />
            <CompactInfo label="Admin Count" value={company.adminCount} />
            <CompactInfo label="User Count" value={company.userCount} />
            <CompactInfo label="Created Date" value={formatDateTime(company.createdAt)} />
          </div>
        </div>
      )) : <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">No companies found.</div>}
    </div>
  </div>
);

const CompactInfo = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-bold text-slate-950 break-words">{value}</p>
  </div>
);

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

const trimCompanyPayload = (payload: CreatePlatformAdminCompanyPayload): CreatePlatformAdminCompanyPayload => Object.fromEntries(
  Object.entries(payload).map(([key, value]) => [key, value.trim()])
) as CreatePlatformAdminCompanyPayload;

const stepItems = [
  { step: 1 as const, title: "Company Information" },
  { step: 2 as const, title: "Owner Information" }
];

const pageMeta: Record<Mode, { title: string; subtitle: string }> = {
  dashboard: { title: "Platform Dashboard", subtitle: "Real-time company visibility across the full billing platform." },
  companies: { title: "Companies", subtitle: "Tenant lifecycle management for the SaaS platform." },
  details: { title: "Company Details", subtitle: "Company-level ownership, activity, and access diagnostics." },
  settings: { title: "Platform Settings", subtitle: "Credentials and platform-level branding values." }
};
