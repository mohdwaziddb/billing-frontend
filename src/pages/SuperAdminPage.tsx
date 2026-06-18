import { Building2, CheckCircle2, Eye, Plus, ShieldCheck, TrendingUp, Users, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  activateSuperAdminCompany,
  createSuperAdminCompany,
  createSuperAdminUser,
  deactivateSuperAdminCompany,
  getSuperAdminCompanies,
  getSuperAdminCompanyDetails,
  getSuperAdminDashboard,
  getSuperAdminDashboardMetric,
  getSuperAdminUsers,
  type CreateSuperAdminCompanyPayload,
  type CreateSuperAdminUserPayload
} from "../api/superAdmin";
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
import type { PageResponse, Role, SuperAdminCompany, SuperAdminCompanyDetails, SuperAdminDashboardSummary, SuperAdminRevenueRow, SuperAdminUser } from "../types/api";

type Mode = "dashboard" | "companies" | "users" | "details";

const emptyCompanyPage: PageResponse<SuperAdminCompany> = { records: [], page: 0, size: DEFAULT_PAGE_SIZE, totalRecords: 0, totalPages: 0 };
const emptyUserPage: PageResponse<SuperAdminUser> = { records: [], page: 0, size: DEFAULT_PAGE_SIZE, totalRecords: 0, totalPages: 0 };
const tenantRoles: Array<Exclude<Role, "SUPER_ADMIN">> = ["OWNER", "ADMIN", "USER"];

const companyFormInitial: CreateSuperAdminCompanyPayload = {
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

const userFormInitial: CreateSuperAdminUserPayload = {
  companyId: 0,
  fullName: "",
  username: "",
  email: "",
  mobileNumber: "",
  password: "",
  role: "USER",
  active: true
};

export const SuperAdminPage = ({ mode }: { mode: Mode }) => {
  const [dashboard, setDashboard] = useState<SuperAdminDashboardSummary | null>(null);
  const [companies, setCompanies] = useState<PageResponse<SuperAdminCompany>>(emptyCompanyPage);
  const [users, setUsers] = useState<PageResponse<SuperAdminUser>>(emptyUserPage);
  const [companySearch, setCompanySearch] = useState("");
  const [companyActive, setCompanyActive] = useState<"" | "true" | "false">("");
  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState<"" | Exclude<Role, "SUPER_ADMIN">>("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | "">("");
  const [companyPage, setCompanyPage] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [metricTitle, setMetricTitle] = useState("");
  const [metricRows, setMetricRows] = useState<Array<SuperAdminCompany | SuperAdminUser | SuperAdminRevenueRow>>([]);
  const [companyFormOpen, setCompanyFormOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState(companyFormInitial);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userForm, setUserForm] = useState(userFormInitial);
  const [detailsCompanyId, setDetailsCompanyId] = useState<number | "">("");
  const [details, setDetails] = useState<SuperAdminCompanyDetails | null>(null);
  const [previewDetails, setPreviewDetails] = useState<SuperAdminCompanyDetails | null>(null);
  const { setApiError } = useApiMessage();

  const companyOptions = useMemo(() => [
    { label: "Select company", value: "" },
    ...companies.records.map((company) => ({ label: company.name, value: String(company.id) }))
  ], [companies.records]);

  const loadDashboard = async () => setDashboard(await getSuperAdminDashboard());
  const loadCompanies = async (page = companyPage) => {
    setCompanies(await getSuperAdminCompanies({
      page,
      size: DEFAULT_PAGE_SIZE,
      search: companySearch.trim() || undefined,
      active: companyActive === "" ? undefined : companyActive === "true"
    }));
  };
  const loadUsers = async (page = userPage) => {
    setUsers(await getSuperAdminUsers({
      page,
      size: DEFAULT_PAGE_SIZE,
      search: userSearch.trim() || undefined,
      role: userRole,
      companyId: selectedCompanyId === "" ? undefined : selectedCompanyId
    }));
  };

  useEffect(() => {
    void Promise.all([loadDashboard(), loadCompanies(0)]).catch((err) => setApiError(err, "Unable to load super admin data"));
  }, []);

  useEffect(() => {
    if (mode === "companies" || mode === "details") {
      void loadCompanies(0).catch((err) => setApiError(err, "Unable to load companies"));
    }
  }, [companySearch, companyActive, mode]);

  useEffect(() => {
    if (mode === "users") {
      void loadUsers(0).catch((err) => setApiError(err, "Unable to load users"));
    }
  }, [userSearch, userRole, selectedCompanyId, mode]);

  useEffect(() => {
    if (mode === "details" && detailsCompanyId) {
      void getSuperAdminCompanyDetails(detailsCompanyId).then(setDetails).catch((err) => setApiError(err, "Unable to load company details"));
    }
  }, [detailsCompanyId, mode]);

  const openMetric = async (title: string, metric: string) => {
    setMetricTitle(title);
    setMetricRows(await getSuperAdminDashboardMetric(metric));
  };

  const saveCompany = async () => {
    try {
      const createdCompany = await createSuperAdminCompany(trimCompanyPayload(companyForm));
      setCompanyForm(companyFormInitial);
      setCompanyFormOpen(false);
      setCompanies((current) => ({
        ...current,
        records: [createdCompany, ...current.records].slice(0, current.size),
        totalRecords: current.totalRecords + 1
      }));
      await loadDashboard();
      notificationService.showSuccess("Company created successfully");
    } catch (err) {
      setApiError(err, "Unable to create company");
    }
  };

  const saveUser = async () => {
    try {
      await createSuperAdminUser(userForm);
      setUserForm(userFormInitial);
      setUserFormOpen(false);
      await Promise.all([loadUsers(userPage), loadDashboard()]);
      notificationService.showSuccess("User created successfully");
    } catch (err) {
      setApiError(err, "Unable to create user");
    }
  };

  const toggleCompany = async (company: SuperAdminCompany) => {
    try {
      if (company.active) {
        await deactivateSuperAdminCompany(company.id);
        notificationService.showSuccess("Company deactivated successfully");
      } else {
        await activateSuperAdminCompany(company.id);
        notificationService.showSuccess("Company activated successfully");
      }
      await Promise.all([loadCompanies(companyPage), loadDashboard()]);
    } catch (err) {
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
            <h2 className="mt-2 text-2xl font-extrabold">Master SaaS control panel</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/76">
              This is the master SaaS control panel where Super Admin manages all registered companies, subscriptions, users and platform settings.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-right shadow-inner">
            <p className="text-xs font-bold uppercase tracking-wide text-cyan-100">Platform Owner</p>
            <p className="mt-1 text-lg font-extrabold">SUPER_ADMIN</p>
          </div>
        </div>
      </div>
      {mode === "dashboard" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Total Companies" value={dashboard?.totalCompanies ?? 0} icon={Building2} onClick={() => void openMetric("Total Companies", "total-companies")} />
          <MetricCard label="Active Companies" value={dashboard?.activeCompanies ?? 0} icon={CheckCircle2} onClick={() => void openMetric("Active Companies", "active-companies")} />
          <MetricCard label="Inactive Companies" value={dashboard?.inactiveCompanies ?? 0} icon={XCircle} onClick={() => void openMetric("Inactive Companies", "inactive-companies")} />
          <MetricCard label="Total Users" value={dashboard?.totalUsers ?? 0} icon={Users} onClick={() => void openMetric("Total Users", "total-users")} />
          <MetricCard label="Total Owners" value={dashboard?.totalOwners ?? 0} icon={ShieldCheck} onClick={() => void openMetric("Total Owners", "total-owners")} />
          <MetricCard label="Total Products" value={dashboard?.totalProducts ?? 0} icon={Building2} />
          <MetricCard label="Total Customers" value={dashboard?.totalCustomers ?? 0} icon={Users} />
          <MetricCard label="Total Invoices" value={dashboard?.totalInvoices ?? 0} icon={ShieldCheck} />
          <MetricCard label="Total Revenue" value={dashboard?.totalRevenue ?? 0} icon={TrendingUp} currency onClick={() => void openMetric("Total Revenue", "total-revenue")} />
          <MetricCard label="Total Expenses" value={dashboard?.totalExpenses ?? 0} icon={XCircle} currency />
        </div>
      ) : null}

      {mode === "companies" ? (
        <GlassCard className="p-6 md:p-7">
          <SectionHeader title="Registered Companies" subtitle="Create, inspect, activate, and suspend tenant companies from one operational surface." />
          <Toolbar search={companySearch} setSearch={setCompanySearch} active={companyActive} setActive={setCompanyActive} onAdd={() => setCompanyFormOpen(true)} />
          <CompanyTable companies={companies.records} onToggle={toggleCompany} onView={(company) => {
            setDetailsCompanyId(company.id);
            void getSuperAdminCompanyDetails(company.id).then(setPreviewDetails);
          }} />
          <Pagination page={companies.page} size={companies.size} totalRecords={companies.totalRecords} totalPages={companies.totalPages} onPageChange={(page) => {
            setCompanyPage(page);
            void loadCompanies(page);
          }} />
        </GlassCard>
      ) : null}

      {mode === "users" ? (
        <GlassCard className="p-6 md:p-7">
          <SectionHeader title="Platform Users" subtitle="Manage owners, admins, and users across every tenant. SUPER_ADMIN is intentionally excluded." />
          <div className="mb-5 grid gap-4 md:grid-cols-4">
            <Input label="Search Users" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} />
            <Select label="Company" value={String(selectedCompanyId)} options={companyOptions} onChange={(event) => setSelectedCompanyId(event.target.value ? Number(event.target.value) : "")} />
            <Select label="Role" value={userRole} options={[{ label: "All Roles", value: "" }, ...tenantRoles.map((role) => ({ label: role, value: role }))]} onChange={(event) => setUserRole(event.target.value as typeof userRole)} />
            <div className="flex items-end"><Button type="button" onClick={() => setUserFormOpen(true)}><Plus size={16} /> Add user</Button></div>
          </div>
          <UserTable users={users.records} />
          <Pagination page={users.page} size={users.size} totalRecords={users.totalRecords} totalPages={users.totalPages} onPageChange={(page) => {
            setUserPage(page);
            void loadUsers(page);
          }} />
        </GlassCard>
      ) : null}

      {mode === "details" ? (
        <GlassCard className="p-6 md:p-7">
          <SectionHeader title="Company Details" subtitle="Review tenant identity, ownership, user statistics, activity, and operational readiness." />
          <div className="mb-5 max-w-md">
            <Select label="Company" value={String(detailsCompanyId)} options={companyOptions} onChange={(event) => setDetailsCompanyId(event.target.value ? Number(event.target.value) : "")} />
          </div>
          {details ? <CompanyDetailsView details={details} /> : <p className="text-sm font-medium text-slate-500">Select a company to view details.</p>}
        </GlassCard>
      ) : null}

      <MetricModal title={metricTitle} rows={metricRows} onClose={() => setMetricTitle("")} />
      <CompanyDetailsModal details={previewDetails} onClose={() => setPreviewDetails(null)} />
      <CompanyFormModal open={companyFormOpen} form={companyForm} setForm={setCompanyForm} onClose={() => setCompanyFormOpen(false)} onSave={saveCompany} />
      <UserFormModal open={userFormOpen} form={userForm} setForm={setUserForm} companies={companies.records} onClose={() => setUserFormOpen(false)} onSave={saveUser} />
    </div>
  );
};

const MetricCard = ({ label, value, icon: Icon, onClick, currency = false }: { label: string; value: number; icon: typeof Building2; onClick?: () => void; currency?: boolean }) => (
  <button type="button" className="block text-left disabled:cursor-default" onClick={onClick} disabled={!onClick}>
    <GlassCard className="h-full p-5 transition hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-extrabold text-white">{currency ? formatMoney(value) : value}</p>
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
    <div className="flex items-end"><Button type="button" onClick={onAdd}><Plus size={16} /> Create company</Button></div>
  </div>
);

const CompanyTable = ({ companies, onToggle, onView }: { companies: SuperAdminCompany[]; onToggle: (company: SuperAdminCompany) => void; onView: (company: SuperAdminCompany) => void }) => (
  <Table data={companies} emptyText="No companies found." columns={[
    { key: "name", header: "Company Name", render: (item) => <span className="font-semibold text-slate-950">{item.name}</span> },
    { key: "owner", header: "Owner Name", render: (item) => item.ownerName ?? "--" },
    { key: "email", header: "Email", render: (item) => item.email },
    { key: "mobile", header: "Mobile", render: (item) => item.mobile ?? "--" },
    { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "created", header: "Created Date", render: (item) => formatDateTime(item.createdAt) },
    { key: "users", header: "Total Users", render: (item) => item.totalUsers },
    { key: "actions", header: "Actions", render: (item) => <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => onView(item)}><Eye size={15} /> View</Button><Button type="button" variant={item.active ? "danger" : "secondary"} onClick={() => onToggle(item)}>{item.active ? "Deactivate" : "Activate"}</Button></div> }
  ]} />
);

const UserTable = ({ users }: { users: SuperAdminUser[] }) => (
  <Table data={users} emptyText="No users found." columns={[
    { key: "name", header: "Name", render: (item) => <span className="font-semibold text-slate-950">{item.fullName}</span> },
    { key: "username", header: "Username", render: (item) => item.username },
    { key: "company", header: "Company", render: (item) => item.companyName ?? "--" },
    { key: "email", header: "Email", render: (item) => item.email },
    { key: "mobile", header: "Mobile", render: (item) => item.mobileNumber },
    { key: "role", header: "Role", render: (item) => <StatusBadge label={item.role} /> },
    { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> }
  ]} />
);

const CompanyDetailsView = ({ details }: { details: SuperAdminCompanyDetails }) => (
  <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-4">
      <Info label="Company" value={details.company.name} />
      <Info label="Owner" value={details.owner?.fullName ?? "--"} />
      <Info label="Admins" value={details.adminCount} />
      <Info label="Users" value={details.userCount} />
      <Info label="Audit Logs" value={details.auditLogCount} />
      <Info label="Storage" value="Not available" />
    </div>
    <UserTable users={details.users} />
  </div>
);

const Info = ({ label, value }: { label: string; value: string | number }) => <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">{label}</p><p className="mt-2 font-bold text-slate-950">{value}</p></div>;

const MetricModal = ({ title, rows, onClose }: { title: string; rows: Array<SuperAdminCompany | SuperAdminUser | SuperAdminRevenueRow>; onClose: () => void }) => (
  <Modal open={Boolean(title)} title={title || "Details"} onClose={onClose}>
    {"totalRevenue" in (rows[0] ?? {})
      ? <RevenueTable rows={rows as SuperAdminRevenueRow[]} />
      : "companyName" in (rows[0] ?? {})
        ? <UserTable users={rows as SuperAdminUser[]} />
        : <CompanyTable companies={rows as SuperAdminCompany[]} onToggle={() => undefined} onView={() => undefined} />}
  </Modal>
);

const RevenueTable = ({ rows }: { rows: SuperAdminRevenueRow[] }) => (
  <Table data={rows} emptyText="No revenue records found." columns={[
    { key: "company", header: "Company", render: (item) => <span className="font-semibold text-slate-950">{item.companyName}</span> },
    { key: "invoices", header: "Invoices", render: (item) => item.invoiceCount },
    { key: "revenue", header: "Total Revenue", render: (item) => formatMoney(item.totalRevenue) }
  ]} />
);

const CompanyDetailsModal = ({ details, onClose }: { details: SuperAdminCompanyDetails | null; onClose: () => void }) => (
  <Modal open={Boolean(details)} title={details?.company.name ?? "Company Details"} onClose={onClose}>
    {details ? <CompanyDetailsView details={details} /> : null}
  </Modal>
);

const CompanyFormModal = ({ open, form, setForm, onClose, onSave }: { open: boolean; form: CreateSuperAdminCompanyPayload; setForm: (form: CreateSuperAdminCompanyPayload) => void; onClose: () => void; onSave: () => void }) => (
  <Modal open={open} title="Create Company" onClose={onClose}>
    <div className="grid gap-4 md:grid-cols-2">
      {Object.entries(companyFieldLabels).map(([key, label]) => key === "ownerPassword"
        ? <PasswordInput key={key} label={label} requiredMark value={form[key as keyof CreateSuperAdminCompanyPayload]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
        : <Input key={key} label={label} requiredMark value={form[key as keyof CreateSuperAdminCompanyPayload]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />)}
      <div className="md:col-span-2"><Button type="button" onClick={onSave}>Create company</Button></div>
    </div>
  </Modal>
);

const UserFormModal = ({ open, form, setForm, companies, onClose, onSave }: { open: boolean; form: CreateSuperAdminUserPayload; setForm: (form: CreateSuperAdminUserPayload) => void; companies: SuperAdminCompany[]; onClose: () => void; onSave: () => void }) => (
  <Modal open={open} title="Create Company User" onClose={onClose}>
    <div className="grid gap-4 md:grid-cols-2">
      <Select label="Company" requiredMark value={form.companyId ? String(form.companyId) : ""} options={[{ label: "Select company", value: "" }, ...companies.map((company) => ({ label: company.name, value: String(company.id) }))]} onChange={(event) => setForm({ ...form, companyId: Number(event.target.value) })} />
      <Select label="Role" requiredMark value={form.role} options={tenantRoles.map((role) => ({ label: role, value: role }))} onChange={(event) => setForm({ ...form, role: event.target.value as Exclude<Role, "SUPER_ADMIN"> })} />
      <Input label="Full Name" requiredMark value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
      <Input label="Username" requiredMark value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
      <Input label="Email" requiredMark value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <Input label="Mobile" requiredMark value={form.mobileNumber} onChange={(event) => setForm({ ...form, mobileNumber: event.target.value })} />
      <PasswordInput label="Password" requiredMark value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
      <Select label="Status" value={form.active ? "true" : "false"} options={[{ label: "Active", value: "true" }, { label: "Inactive", value: "false" }]} onChange={(event) => setForm({ ...form, active: event.target.value === "true" })} />
      <div className="md:col-span-2"><Button type="button" onClick={onSave}>Create user</Button></div>
    </div>
  </Modal>
);

const companyFieldLabels: Record<keyof CreateSuperAdminCompanyPayload, string> = {
  companyName: "Company Name",
  address: "Address",
  gstNumber: "GST Number",
  mobile: "Mobile",
  email: "Email",
  ownerName: "Owner Name",
  ownerUsername: "Owner Username",
  ownerEmail: "Owner Email",
  ownerMobile: "Owner Mobile",
  ownerPassword: "Owner Password"
};

const trimCompanyPayload = (payload: CreateSuperAdminCompanyPayload): CreateSuperAdminCompanyPayload => Object.fromEntries(
  Object.entries(payload).map(([key, value]) => [key, value.trim()])
) as CreateSuperAdminCompanyPayload;

const pageMeta: Record<Mode, { title: string; subtitle: string }> = {
  dashboard: { title: "Super Admin Dashboard", subtitle: "Platform-wide company, user, and revenue intelligence." },
  companies: { title: "Companies", subtitle: "Tenant lifecycle management for the SaaS platform." },
  users: { title: "Platform Users", subtitle: "Cross-company user administration without exposing SUPER_ADMIN creation." },
  details: { title: "Company Details", subtitle: "Company-level ownership, activity, and access diagnostics." }
};

const formatMoney = (value: number) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
}).format(value);
