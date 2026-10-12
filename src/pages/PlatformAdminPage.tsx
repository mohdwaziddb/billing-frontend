import { Bot, Building2, CheckCircle2, Download, Eye, KeyRound, LoaderCircle, Power, RefreshCw, Settings, XCircle } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  activatePlatformAdminCompany,
  deactivatePlatformAdminCompany,
  disablePlatformAdminCompanyChatbot,
  downloadDumpFile,
  enablePlatformAdminCompanyChatbot,
  getDumpDatabases,
  getDumpHistory,
  getDumpInstances,
  getDumpStats,
  getPlatformAdminCompanies,
  getPlatformAdminCompanyDetails,
  getPlatformAdminDashboard,
  getPlatformAdminSettings,
  queueDumpRequest,
  readDumpDownloadError,
  resetSuperAdminPassword,
  updatePlatformAdminSettings,
  validateDumpDatabase
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
import type { PageResponse, PlatformAdminCompany, PlatformAdminCompanyDetails, PlatformAdminDashboardSummary, PlatformAdminDumpMode, PlatformAdminDumpRequest, PlatformAdminDumpStats, PlatformAdminSettings as PlatformAdminSettingsType } from "../types/api";

type Mode = "dashboard" | "companies" | "details" | "settings" | "dumps";

type DumpFormState = {
  instance: string;
  database: string;
  mode: PlatformAdminDumpMode;
  tables: string;
};

const dumpFormInitial: DumpFormState = { instance: "", database: "", mode: "FULL", tables: "" };

const formatDumpBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) {
    return "--";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
};

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
  const [dumpInstances, setDumpInstances] = useState<string[]>([]);
  const [dumpDatabases, setDumpDatabases] = useState<Array<{ companyCode: string | null; databaseName: string; dbHost: string; status: string }>>([]);
  const [dumpForm, setDumpForm] = useState<DumpFormState>(dumpFormInitial);
  const [dumpValidating, setDumpValidating] = useState(false);
  const [dumpValidationMessage, setDumpValidationMessage] = useState("");
  const [dumpQueueing, setDumpQueueing] = useState(false);
  const [dumpHistory, setDumpHistory] = useState<PlatformAdminDumpRequest[]>([]);
  const [dumpHistoryLoading, setDumpHistoryLoading] = useState(false);
  const [dumpStats, setDumpStats] = useState<PlatformAdminDumpStats | null>(null);
  const [dumpDateFilter, setDumpDateFilter] = useState("");
  const [dumpDownloadingId, setDumpDownloadingId] = useState<number | null>(null);
  const [dumpExpandedErrorId, setDumpExpandedErrorId] = useState<number | null>(null);
  const dumpActiveCount = dumpHistory.filter((item) => item.status === "QUEUED" || item.status === "RUNNING").length;
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
    if (mode === "dumps") {
      setDumpHistoryLoading(true);
      void Promise.all([
        loadDumpLookups().catch((err) => setApiError(err, "Unable to load dump options")),
        loadDumpHistory().catch((err) => setApiError(err, "Unable to load dump history"))
      ]).finally(() => setDumpHistoryLoading(false));
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "dumps" || dumpActiveCount === 0) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadDumpHistory().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [mode, dumpActiveCount]);

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

  const dumpTablesList = (value: string) => value.split(",").map((item) => item.trim()).filter((item) => item.length > 0);

  const loadDumpLookups = async () => {
    const [instances, databases] = await Promise.all([getDumpInstances(), getDumpDatabases()]);
    setDumpInstances(instances);
    setDumpDatabases(databases);
    setDumpForm((current) => ({
      ...current,
      instance: current.instance || instances[0] || ""
    }));
  };

  const loadDumpHistory = async () => {
    const [history, stats] = await Promise.all([
      getDumpHistory({ date: dumpDateFilter || undefined }),
      getDumpStats()
    ]);
    setDumpHistory(history);
    setDumpStats(stats);
  };

  const validateDumpForm = async () => {
    const database = dumpForm.database.trim();
    if (!database) {
      notificationService.showError("Enter a database name first");
      return;
    }
    setDumpValidating(true);
    setDumpValidationMessage("");
    try {
      await validateDumpDatabase(database, dumpTablesList(dumpForm.tables));
      setDumpValidationMessage(`Database '${database}' is valid and ready for dump.`);
      notificationService.showSuccess("Database validated successfully");
    } catch (err) {
      setDumpValidationMessage("");
      setApiError(err, "Database validation failed");
    } finally {
      setDumpValidating(false);
    }
  };

  const queueDumpForm = async () => {
    const database = dumpForm.database.trim();
    if (!database) {
      notificationService.showError("Enter a database name first");
      return;
    }
    if (dumpForm.mode !== "FULL" && dumpTablesList(dumpForm.tables).length === 0) {
      notificationService.showError("Enter comma-separated table names for Include/Exclude mode");
      return;
    }
    setDumpQueueing(true);
    try {
      await queueDumpRequest({ database, mode: dumpForm.mode, tables: dumpTablesList(dumpForm.tables) });
      notificationService.showSuccess(`Dump queued for '${database}'`);
      await loadDumpHistory().catch((err) => setApiError(err, "Unable to load dump history"));
    } catch (err) {
      setApiError(err, "Unable to queue dump request");
    } finally {
      setDumpQueueing(false);
    }
  };

  const downloadDump = async (item: PlatformAdminDumpRequest) => {
    setDumpDownloadingId(item.id);
    try {
      const fileName = await downloadDumpFile(item.id);
      notificationService.showSuccess(`Downloaded ${fileName}`);
    } catch (err) {
      notificationService.showError(await readDumpDownloadError(err));
    } finally {
      setDumpDownloadingId(null);
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

      {mode === "dumps" ? (
        <div className="space-y-4">
          <GlassCard className="px-6 py-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Today</span>
              <span><span className="font-bold text-slate-950">{dumpStats?.totalDumps ?? 0}</span> <span className="text-slate-500">Total</span></span>
              <span><span className="font-bold text-emerald-600">{dumpStats?.completed ?? 0}</span> <span className="text-slate-500">Completed</span></span>
              <span><span className="font-bold text-amber-600">{dumpStats?.inProgress ?? 0}</span> <span className="text-slate-500">In Progress</span></span>
              <span><span className="font-bold text-rose-600">{dumpStats?.failed ?? 0}</span> <span className="text-slate-500">Failed</span></span>
              <span><span className="font-bold text-violet-600">{dumpStats?.activeUsers ?? 0}</span> <span className="text-slate-500">Active Users</span></span>
              <span className="ml-auto text-xs text-slate-500">
                {(dumpStats?.perUser ?? []).length === 0
                  ? "No dumps today"
                  : (dumpStats?.perUser ?? []).map((row) => `${row.username || "Unknown"} (${row.dumps})`).join(" • ")}
              </span>
            </div>
          </GlassCard>
          <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
          <GlassCard className="p-6 md:p-7">
            <SectionHeader title="New Dump Request" subtitle="Configure and queue a database dump." />
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500"><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--theme-color)] text-[10px] text-white">1</span>Select MySQL server</p>
                <Select
                  value={dumpForm.instance}
                  options={dumpInstances.map((host) => ({ label: host, value: host }))}
                  onChange={(event) => setDumpForm((current) => ({ ...current, instance: event.target.value }))}
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500"><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--theme-color)] text-[10px] text-white">2</span>Database name</p>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      placeholder="e.g. gyanbharti"
                      list="dump-database-suggestions"
                      value={dumpForm.database}
                      onChange={(event) => {
                        setDumpForm((current) => ({ ...current, database: event.target.value }));
                        setDumpValidationMessage("");
                      }}
                    />
                    <datalist id="dump-database-suggestions">
                      {dumpDatabases.map((db) => (
                        <option key={db.databaseName} value={db.databaseName}>
                          {db.companyCode ? `${db.companyCode} (${db.status})` : "catalog"}
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <Button type="button" variant="secondary" disabled={dumpValidating || !dumpForm.database.trim()} onClick={() => void validateDumpForm()}>
                    {dumpValidating ? <LoaderCircle className="animate-spin" size={15} /> : null} Validate
                  </Button>
                </div>
                {dumpValidationMessage ? <p className="mt-2 text-xs font-semibold text-emerald-600">{dumpValidationMessage}</p> : null}
              </div>
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500"><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--theme-color)] text-[10px] text-white">3</span>Dump mode</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["INCLUDE", "EXCLUDE", "FULL"] as const).map((dumpMode) => (
                    <button
                      key={dumpMode}
                      type="button"
                      onClick={() => setDumpForm((current) => ({ ...current, mode: dumpMode }))}
                      className={`rounded-2xl border px-2 py-3 text-center transition ${dumpForm.mode === dumpMode ? "border-[var(--theme-color)] bg-[color-mix(in_srgb,var(--theme-color)_8%,white)]" : "border-slate-200 bg-white hover:border-slate-300"}`}
                    >
                      <p className="text-xs font-bold text-slate-800">{dumpMode === "FULL" ? "Full Dump" : dumpMode === "INCLUDE" ? "Include" : "Exclude"}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{dumpMode === "FULL" ? "Entire database" : dumpMode === "INCLUDE" ? "Specific tables only" : "All except selected"}</p>
                    </button>
                  ))}
                </div>
              </div>
              {dumpForm.mode !== "FULL" ? (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Table names</p>
                  <textarea
                    className="min-h-[84px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-color)]"
                    placeholder="orders, users, products (comma-separated)"
                    rows={3}
                    value={dumpForm.tables}
                    onChange={(event) => setDumpForm((current) => ({ ...current, tables: event.target.value }))}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">Separate table names with commas. Each will be validated server-side.</p>
                </div>
              ) : null}
              <Button type="button" disabled={dumpQueueing || !dumpForm.database.trim()} onClick={() => void queueDumpForm()} className="w-full">
                {dumpQueueing ? <LoaderCircle className="animate-spin" size={16} /> : null} Queue Dump Request
              </Button>
            </div>
          </GlassCard>

          <GlassCard className="p-6 md:p-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <SectionHeader title="Dump History" subtitle="Your recent dump requests." />
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <span className={`h-2 w-2 rounded-full ${dumpActiveCount > 0 ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`} /> Live
                </span>
                <Input
                  type="date"
                  aria-label="Filter by date"
                  value={dumpDateFilter}
                  onChange={(event) => setDumpDateFilter(event.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={dumpHistoryLoading}
                  onClick={() => {
                    setDumpHistoryLoading(true);
                    void loadDumpHistory()
                      .catch((err) => setApiError(err, "Unable to load dump history"))
                      .finally(() => setDumpHistoryLoading(false));
                  }}
                >
                  <RefreshCw size={15} /> Refresh
                </Button>
              </div>
            </div>
            {dumpHistoryLoading ? <LoadingPanel label="Loading dump history..." /> : null}
            <Table
              data={dumpHistory}
              emptyText="No dump requests yet. Use the form on the left to get started."
              columns={[
                {
                  key: "database",
                  header: "Database",
                  render: (item) => (
                    <div className="min-w-[160px]">
                      <p className="font-semibold text-slate-950">{item.databaseName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.mode} • {item.companyCode ?? "catalog"}</p>
                    </div>
                  )
                },
                {
                  key: "status",
                  header: "Status",
                  render: (item) => (
                    <div>
                      <StatusBadge label={item.status} />
                      {item.status === "FAILED" && item.error ? (
                        <button
                          type="button"
                          title={item.error}
                          onClick={() => setDumpExpandedErrorId((current) => (current === item.id ? null : item.id))}
                          className={`mt-1 block max-w-[220px] text-left text-[11px] text-rose-600 hover:underline ${dumpExpandedErrorId === item.id ? "whitespace-pre-wrap break-words" : "truncate"}`}
                        >
                          {item.error}
                        </button>
                      ) : null}
                    </div>
                  )
                },
                {
                  key: "size",
                  header: "Size",
                  render: (item) => <span className="whitespace-nowrap">{item.hasFile ? formatDumpBytes(item.fileSize) : "--"}</span>
                },
                {
                  key: "requested",
                  header: "Requested",
                  render: (item) => (
                    <div className="min-w-[150px]">
                      <p className="text-xs font-semibold text-slate-700">{item.requestedBy ?? "--"}</p>
                      <p className="text-[11px] text-slate-500">{formatDateTime(item.createdAt)}</p>
                    </div>
                  )
                },
                {
                  key: "actions",
                  header: "File",
                  render: (item) => item.status === "COMPLETED" && item.hasFile ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={dumpDownloadingId === item.id}
                      onClick={() => void downloadDump(item)}
                    >
                      {dumpDownloadingId === item.id ? <LoaderCircle className="animate-spin" size={15} /> : <Download size={15} />} Download
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400">{item.status === "COMPLETED" ? "Expired" : "--"}</span>
                  )
                }
              ]}
            />
          </GlassCard>

          </div>
        </div>
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
  settings: { title: "Platform Settings", subtitle: "Credentials and platform-level branding values." },
  dumps: { title: "Dump Manager", subtitle: "Queued MySQL dumps for tenant databases and billing_common." }
};
