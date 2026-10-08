import { Bot, Building2, CheckCircle2, Eye, KeyRound, LoaderCircle, Power, Settings, XCircle } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  activatePlatformAdminCompany,
  deactivatePlatformAdminCompany,
  disablePlatformAdminCompanyChatbot,
  enablePlatformAdminCompanyChatbot,
  getPlatformAdminCompanies,
  getPlatformAdminCompanyDetails,
  getPlatformAdminDashboard,
  getPlatformAdminSettings,
  resetSuperAdminPassword,
  updatePlatformAdminSettings
} from "../api/platformAdmin";
import { Button } from "../components/Button";
import { applyVisibleColumns, CommonColumnSelector } from "../components/CommonColumnSelector";
import { ActionDropdown } from "../components/ActionDropdown";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE } from "../components/Pagination";
import { PagePagination } from "../components/PagePagination";
import { ModalPagination } from "../components/ModalPagination";
import { PasswordInput } from "../components/PasswordInput";
import { Select } from "../components/Select";
import { StatCard } from "../components/StatCard";
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

type CompanyColumn = {
  key: string;
  header: string;
  render: (item: PlatformAdminCompany) => ReactNode;
  className?: string;
  locked?: boolean;
};

const emptyCompanyPage: PageResponse<PlatformAdminCompany> = { records: [], page: 0, size: DEFAULT_PAGE_SIZE, totalRecords: 0, totalPages: 0 };

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
  const [detailsCompanyCode, setDetailsCompanyId] = useState<string>("");
  const [details, setDetails] = useState<PlatformAdminCompanyDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [previewDetails, setPreviewDetails] = useState<PlatformAdminCompanyDetails | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [summaryModal, setSummaryModal] = useState<SummaryModalState | null>(null);
  const [summaryCompanies, setSummaryCompanies] = useState<PageResponse<PlatformAdminCompany>>(emptyCompanyPage);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summarySearch, setSummarySearch] = useState("");
  const [settings, setSettings] = useState<PlatformAdminSettingsType | null>(null);
  const [settingsForm, setSettingsForm] = useState(settingsFormInitial);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [statusAction, setStatusAction] = useState<CompanyStatusActionState>(null);
  const [resetAction, setResetAction] = useState<{ company: PlatformAdminCompany; loading: boolean } | null>(null);
  const [chatbotToggleId, setChatbotToggleId] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const { setApiError } = useApiMessage();

  function onViewCompany(company: PlatformAdminCompany) {
    void loadPreviewDetails(company.code).catch((err) => setApiError(err, "Unable to load company details"));
  }

  function onToggleCompany(company: PlatformAdminCompany) {
    confirmToggleCompany(company);
  }

  function onToggleChatbot(company: PlatformAdminCompany) {
    void toggleChatbot(company);
  }

  const companyOptions = useMemo(() => [
    { label: "Select company", value: "" },
    ...companies.records.map((company) => ({ label: `${company.name} (${company.code})`, value: company.code }))
  ], [companies.records]);

  const companyColumns = useMemo(() => [
    {
      key: "name",
      header: "Company Name",
      render: (item: PlatformAdminCompany) => (
        <div className="min-w-[180px]">
          <p className="font-semibold text-slate-950">{item.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{item.ownerName ?? "--"}</p>
        </div>
      )
    },
    { key: "email", header: "Email", render: (item: PlatformAdminCompany) => <span className="block min-w-[180px]">{item.email}</span> },
    { key: "mobile", header: "Mobile", render: (item: PlatformAdminCompany) => <span className="whitespace-nowrap">{item.mobile ?? "--"}</span> },
    { key: "chatbot", header: "Chatbot", render: (item: PlatformAdminCompany) => <StatusBadge label={item.chatbotEnabled ? "ON" : "OFF"} /> },
    { key: "status", header: "Status", render: (item: PlatformAdminCompany) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "users", header: "Users", render: (item: PlatformAdminCompany) => item.totalUsers },
    { key: "created", header: "Created Date", render: (item: PlatformAdminCompany) => <span className="whitespace-nowrap">{formatDateTime(item.createdAt)}</span> },
    {
      key: "actions",
      header: "Actions",
      locked: true,
      render: (item: PlatformAdminCompany) => (
        <ActionDropdown
          actions={[
            { label: "View", icon: <Eye size={15} />, onClick: () => onViewCompany(item) },
            {
              label: item.active ? "Deactivate" : "Activate",
              icon: <Power size={15} />,
              danger: item.active,
              onClick: () => onToggleCompany(item)
            },
            {
              label: item.chatbotEnabled ? "Disable Chatbot" : "Enable Chatbot",
              icon: <Bot size={15} />,
              disabled: chatbotToggleId === item.code,
              onClick: () => onToggleChatbot(item)
            },
            {
              label: "Reset super-admin",
              icon: <KeyRound size={15} />,
              onClick: () => setResetAction({ company: item, loading: false })
            }
          ]}
        />
      )
    }
  ], [chatbotToggleId, onToggleChatbot, onToggleCompany, onViewCompany]);

  const visibleCompanyColumns = useMemo(
    () => applyVisibleColumns(companyColumns, visibleColumns),
    [companyColumns, visibleColumns]
  );

  const companyColumnOptions = useMemo(
    () => companyColumns.map(({ key, header, locked }) => ({ key, header, locked })),
    [companyColumns]
  );

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

  const loadDetails = async (companyCode: string) => {
    setDetailsLoading(true);
    try {
      setDetails(await getPlatformAdminCompanyDetails(companyCode));
    } finally {
      setDetailsLoading(false);
    }
  };

  const loadPreviewDetails = async (companyCode: string) => {
    setPreviewLoading(true);
    try {
      setPreviewDetails(await getPlatformAdminCompanyDetails(companyCode));
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
      mode === "dashboard" || mode === "companies" || mode === "details" ? loadCompanies(nextCompanyPage) : Promise.resolve(),
      summaryModal ? loadSummaryCompanies(summaryModal.filter, summaryCompanies.page) : Promise.resolve()
    ]);
  };

  useEffect(() => {
    void loadDashboard().catch((err) => setApiError(err, "Unable to load platform admin data"));
  }, [mode]);

  useEffect(() => {
    if (mode === "dashboard" || mode === "companies" || mode === "details") {
      void loadCompanies(0).catch((err) => setApiError(err, "Unable to load companies"));
    }
  }, [companySearch, companyActive, mode]);

  useEffect(() => {
    if (mode === "details" && detailsCompanyCode) {
      void loadDetails(detailsCompanyCode).catch((err) => setApiError(err, "Unable to load company details"));
    }
  }, [detailsCompanyCode, mode]);

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
        await deactivatePlatformAdminCompany(company.code);
        notificationService.showSuccess("Company deactivated successfully");
      } else {
        await activatePlatformAdminCompany(company.code);
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

  const toggleChatbot = async (company: PlatformAdminCompany) => {    const isEnabling = !company.chatbotEnabled;
    setChatbotToggleId(company.code);
    try {
      if (isEnabling) {
        await enablePlatformAdminCompanyChatbot(company.code);
        notificationService.showSuccess("Chatbot enabled for company");
      } else {
        await disablePlatformAdminCompanyChatbot(company.code);
        notificationService.showSuccess("Chatbot disabled for company");
      }
      void refreshCountsAndLists(companyPage).catch((err) => setApiError(err, "Unable to refresh platform admin data"));
    } catch (err) {
      setApiError(err, "Unable to update chatbot status");
    } finally {
      setChatbotToggleId(null);
    }
  };

  const confirmResetSuperAdmin = async (company: PlatformAdminCompany, password: string) => {
    setResetAction({ company, loading: true });
    try {
      await resetSuperAdminPassword(company.code, password);
      notificationService.showSuccess("Super-admin password reset successfully");
      setResetAction(null);
    } catch (err) {
      setResetAction({ company, loading: false });
      setApiError(err, "Unable to reset super-admin password");
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title={pageMeta[mode].title} subtitle={pageMeta[mode].subtitle} />

      {mode === "dashboard" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Total Companies"
              value={dashboardLoading ? "…" : String(dashboard?.totalCompanies ?? 0)}
              caption="All registered tenant companies"
              icon={<Building2 size={18} />}
              analyticsColor="#2453d8"
              onClick={() => openSummaryModal("all", "All Companies")}
            />
            <StatCard
              label="Active Companies"
              value={dashboardLoading ? "…" : String(dashboard?.activeCompanies ?? 0)}
              caption="Live tenant workspaces"
              icon={<CheckCircle2 size={18} />}
              analyticsColor="#16a34a"
              onClick={() => openSummaryModal("active", "Active Companies")}
            />
            <StatCard
              label="Inactive Companies"
              value={dashboardLoading ? "…" : String(dashboard?.inactiveCompanies ?? 0)}
              caption="Suspended or deactivated tenants"
              icon={<XCircle size={18} />}
              analyticsColor="#ef4444"
              onClick={() => openSummaryModal("inactive", "Inactive Companies")}
            />
          </div>

          <GlassCard className="p-6 md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <SectionHeader title="Recent Companies" subtitle="Latest tenant companies registered on the platform." />
              <Link to="/platform-admin/companies" className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
                View all companies
              </Link>
            </div>
            {companiesLoading ? <LoadingPanel label="Loading companies..." /> : null}
            <CompanyTable companies={companies.records.slice(0, 5)} columns={visibleCompanyColumns} />
          </GlassCard>
        </>
      ) : null}

      {mode === "companies" ? (
        <GlassCard className="p-6 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <SectionHeader title="Registered Companies" subtitle="Inspect, activate, and suspend tenant companies from one clean operational workspace." />
            <div className="flex flex-wrap items-center gap-2 md:pt-0.5">
              <CommonColumnSelector tableName="PLATFORM_COMPANIES" availableColumns={companyColumnOptions} visibleColumns={visibleColumns} onApply={setVisibleColumns} localOnly />
              <PagePagination
                page={companies.page}
                size={companies.size}
                totalRecords={companies.totalRecords}
                totalPages={companies.totalPages}
                disabled={companiesLoading}
                onPageChange={(page) => {
                  void loadCompanies(page).catch((err) => setApiError(err, "Unable to load companies"));
                }}
              />
            </div>
          </div>
          <Toolbar search={companySearch} setSearch={setCompanySearch} active={companyActive} setActive={setCompanyActive} />
          {companiesLoading ? <LoadingPanel label="Loading companies..." /> : null}
          <CompanyTable companies={companies.records} columns={visibleCompanyColumns} />
        </GlassCard>
      ) : null}

      {mode === "details" ? (
        <GlassCard className="p-6 md:p-7">
          <SectionHeader title="Company Details" subtitle="Review tenant identity, ownership, activity, and operational readiness." />
          <div className="mb-5 max-w-md">
            <Select label="Company" value={detailsCompanyCode} options={companyOptions} onChange={(event) => setDetailsCompanyId(event.target.value)} />
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
            <Input label="Username" requiredMark autoComplete="off" value={settingsForm.username} onChange={(event) => setSettingsForm((current) => ({ ...current, username: event.target.value }))} />
            <div className="md:col-span-2">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                <span>Platform Tagline</span>
                <textarea className="min-h-[108px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[var(--theme-color)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--theme-color)_18%,transparent)]" rows={3} value={settingsForm.platformTagline} onChange={(event) => setSettingsForm((current) => ({ ...current, platformTagline: event.target.value }))} />
              </label>
            </div>
            <PasswordInput label="New Password" autoComplete="new-password" value={settingsForm.password} onChange={(event) => setSettingsForm((current) => ({ ...current, password: event.target.value }))} />
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
        onView={(company) => void loadPreviewDetails(company.code).catch((err) => setApiError(err, "Unable to load company details"))}
      />
      <CompanyDetailsModal details={previewDetails} loading={previewLoading} onClose={() => {
        setPreviewLoading(false);
        setPreviewDetails(null);
      }} />
      <DeactivateCompanyModal statusAction={statusAction} onCancel={() => setStatusAction(null)} onConfirm={(company) => void toggleCompany(company)} />
      <ResetSuperAdminModal resetAction={resetAction} onCancel={() => setResetAction(null)} onConfirm={(company, password) => void confirmResetSuperAdmin(company, password)} />
    </div>
  );
};

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-5 flex flex-col gap-1">
    <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#2453d8]">{title}</p>
    <p className="max-w-3xl text-sm leading-6 text-slate-500">{subtitle}</p>
  </div>
);

const Toolbar = ({ search, setSearch, active, setActive }: { search: string; setSearch: (value: string) => void; active: string; setActive: (value: "" | "true" | "false") => void }) => (
  <div className="mb-5 grid gap-4 md:grid-cols-[1fr_220px]">
    <Input label="Search Companies" value={search} onChange={(event) => setSearch(event.target.value)} />
    <Select label="Status" value={active} options={[{ label: "All", value: "" }, { label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} onChange={(event) => setActive(event.target.value as "" | "true" | "false")} />
  </div>
);

const CompanyTable = ({
  companies,
  columns
}: {
  companies: PlatformAdminCompany[];
  columns: CompanyColumn[];
}) => (
  <Table data={companies} emptyText="No companies found." columns={columns} />
);

const CompanyDetailsView = ({ details, hideSummaryLabels = [] }: { details: PlatformAdminCompanyDetails; hideSummaryLabels?: string[] }) => (
  <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-4">
      {!hideSummaryLabels.includes("Company") ? <Info label="Company" value={details.company.name} /> : null}
      {!hideSummaryLabels.includes("Owner") ? <Info label="Owner" value={details.owner?.fullName ?? "--"} /> : null}
      {!hideSummaryLabels.includes("Owners") ? <Info label="Owners" value={details.ownerCount} /> : null}
      {!hideSummaryLabels.includes("Admins") ? <Info label="Admins" value={details.adminCount} /> : null}
      {!hideSummaryLabels.includes("Users") ? <Info label="Users" value={details.userCount} /> : null}
      {!hideSummaryLabels.includes("Chatbot") ? <Info label="Chatbot" value={details.company.chatbotEnabled ? "ON" : "OFF"} /> : null}
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Input label="Search By Company Name" value={search} onChange={(event) => onSearchChange(event.target.value)} />
        </div>
        <ModalPagination page={companies.page} size={companies.size} totalRecords={companies.totalRecords} totalPages={companies.totalPages} disabled={loading} onPageChange={onPageChange} />
      </div>
      <div className="flex-1">
        <CompanySummaryTable companies={companies.records} onView={onView} />
      </div>
    </div>
  </Modal>
);

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

const ResetSuperAdminModal = ({
  resetAction,
  onCancel,
  onConfirm
}: {
  resetAction: { company: PlatformAdminCompany; loading: boolean } | null;
  onCancel: () => void;
  onConfirm: (company: PlatformAdminCompany, password: string) => void;
}) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  useEffect(() => {
    if (resetAction) {
      setPassword("");
      setConfirmPassword("");
    }
  }, [resetAction?.company.code]);
  const submit = () => {
    if (password.trim().length < 8) {
      notificationService.showError("Super-admin password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      notificationService.showError("Passwords do not match.");
      return;
    }
    if (resetAction?.company) {
      onConfirm(resetAction.company, password.trim());
    }
  };
  return (
    <Modal open={Boolean(resetAction)} title="Reset super-admin password" eyebrow="Company Super Admin" maxWidthClass="max-w-lg" onClose={() => !resetAction?.loading && onCancel()}>
      <div className="space-y-5">
        <p className="text-sm leading-6 text-slate-600">
          Set a new password for this company's super-admin login. The previous password stops working immediately.
        </p>
        {resetAction?.company ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Company: <span className="font-semibold text-slate-950">{resetAction.company.name} ({resetAction.company.code})</span>
          </div>
        ) : null}
        <PasswordInput label="New Password" requiredMark autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <PasswordInput label="Confirm Password" requiredMark autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" disabled={resetAction?.loading} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={resetAction?.loading} onClick={submit}>
            {resetAction?.loading ? <LoaderCircle className="animate-spin" size={16} /> : null}
            {resetAction?.loading ? "Resetting..." : "Reset password"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const LoadingPanel = ({ label }: { label: string }) => (  <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
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
            <tr key={company.code} className="odd:bg-white even:bg-slate-50/55">
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
        <div key={company.code} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

const pageMeta: Record<Mode, { title: string; subtitle: string }> = {
  dashboard: { title: "Platform Dashboard", subtitle: "Real-time company visibility across the full billing platform." },
  companies: { title: "Companies", subtitle: "Tenant lifecycle management for the SaaS platform." },
  details: { title: "Company Details", subtitle: "Company-level ownership, activity, and access diagnostics." },
  settings: { title: "Platform Settings", subtitle: "Credentials and platform-level branding values." }
};
