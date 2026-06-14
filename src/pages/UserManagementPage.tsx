import { Download, Edit3, History, Plus, UserX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { createCompanyUser, deactivateCompanyUser, getCompanyUsersPage, getRoles, updateCompanyUser } from "../api/users";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { DEFAULT_PAGE_SIZE, Pagination } from "../components/Pagination";
import { PasswordInput } from "../components/PasswordInput";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { Table } from "../components/Table";
import { useAuth } from "../context/AuthContext";
import { useApiFormFeedback, useApiMessage } from "../hooks/useApiFeedback";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { exportToExcel } from "../lib/excelExport";
import { firstFormErrorMessage } from "../lib/formValidation";
import { formatDateTime } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { CompanyUserRequest, PageResponse, Role, UserProfile } from "../types/api";

type FormValues = {
  fullName: string;
  mobileNumber: string;
  email: string;
  password: string;
  role: Role;
  active: string;
};

const formatRoleLabel = (role?: string | null) => {
  const normalized = typeof role === "string" ? role.trim() : "";
  if (!normalized) {
    return "Unknown";
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
};

const toRoleOption = (role?: Role | string | null) => ({
  label: formatRoleLabel(role),
  value: typeof role === "string" ? role.trim().toUpperCase() : ""
});

type UserFilters = {
  search: string;
  role: Role | "";
  active: "" | "true" | "false";
};

const emptyFilters: UserFilters = {
  search: "",
  role: "",
  active: "true"
};

const emptyUserPage: PageResponse<UserProfile> = {
  records: [],
  page: 0,
  size: DEFAULT_PAGE_SIZE,
  totalRecords: 0,
  totalPages: 0
};

export const UserManagementPage = () => {
  const { can } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userPage, setUserPage] = useState<PageResponse<UserProfile>>(emptyUserPage);
  const [page, setPage] = useState(0);
  const [roles, setRoles] = useState<Role[]>(["OWNER", "ADMIN", "USER"]);
  const [filters, setFilters] = useState<UserFilters>(emptyFilters);
  const [exportRows, setExportRows] = useState<UserProfile[]>([]);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [logTarget, setLogTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeUserRole, setActiveUserRole] = useState<Role | "ALL" | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [modalPage, setModalPage] = useState(0);
  const [modalUsers, setModalUsers] = useState<UserProfile[]>([]);
  const [modalUserPage, setModalUserPage] = useState<PageResponse<UserProfile>>(emptyUserPage);
  const { clearMessage, setApiError } = useApiMessage();
  const { fieldErrors, clearFeedback, applyApiError } = useApiFormFeedback();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      fullName: "",
      mobileNumber: "",
      email: "",
      password: "",
      role: "USER",
      active: "true"
    }
  });
  const watchedValues = watch();
  const canSaveUser = Boolean(
    watchedValues.fullName.trim() &&
    watchedValues.email.trim() &&
    watchedValues.mobileNumber.trim() &&
    watchedValues.role &&
    (editingUser || watchedValues.password.trim().length >= 8)
  );

  const filterParams = useMemo(() => ({
    search: filters.search.trim() || undefined,
    role: filters.role || undefined,
    active: filters.active === "" ? undefined : filters.active === "true"
  }), [filters]);

  const roleCounts = useMemo(() => {
    const source = exportRows.length ? exportRows : users;
    return {
      owners: source.filter((item) => item.role === "OWNER").length,
      admins: source.filter((item) => item.role === "ADMIN").length,
      users: source.filter((item) => item.role === "USER").length
    };
  }, [exportRows, users]);

  const loadUsers = async (nextPage = page) => {
    const response = await getCompanyUsersPage({ page: nextPage, size: DEFAULT_PAGE_SIZE, ...filterParams });
    setUserPage(response);
    setUsers(response.records);
  };

  const loadExportRows = async () => {
    const response = await getCompanyUsersPage({ page: 0, size: 100, ...filterParams });
    setExportRows(response.records);
  };

  useEffect(() => {
    if (can("USERS", "VIEW")) {
      void Promise.all([loadUsers(0), loadExportRows(), getRoles().then(setRoles)]).catch((err: any) => setApiError(err, "Unable to load users"));
    }
  }, [can, filterParams]);

  useEffect(() => {
    if (!activeUserRole) {
      return;
    }
    void getCompanyUsersPage({
      page: modalPage,
      size: DEFAULT_PAGE_SIZE,
      search: modalSearch.trim() || undefined,
      role: activeUserRole === "ALL" ? undefined : activeUserRole
    })
      .then((response) => {
        setModalUserPage(response);
        setModalUsers(response.records);
      })
      .catch((err: any) => setApiError(err, "Unable to load user details"));
  }, [activeUserRole, modalPage, modalSearch]);

  const openUserSummary = (role: Role | "ALL") => {
    setActiveUserRole(role);
    setModalSearch("");
    setModalPage(0);
  };

  const exportUsers = (fileName: string, rows: UserProfile[]) => exportToExcel(fileName, rows, userExportColumns);

  const openCreateModal = () => {
    clearFeedback();
    setEditingUser(null);
    reset({
      fullName: "",
      mobileNumber: "",
      email: "",
      password: "",
      role: "USER",
      active: "true"
    });
    setModalOpen(true);
  };

  const openEditModal = (target: UserProfile) => {
    clearFeedback();
    setEditingUser(target);
    reset({
      fullName: target.fullName,
      mobileNumber: target.mobileNumber,
      email: target.email,
      password: "",
      role: target.role,
      active: target.active ? "true" : "false"
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    clearFeedback();

    const payload: CompanyUserRequest = {
      fullName: values.fullName.trim(),
      mobileNumber: values.mobileNumber.trim(),
      email: values.email.trim(),
      role: values.role,
      active: values.active === "true"
    };

    if (values.password.trim()) {
      payload.password = values.password.trim();
    }

    try {
      if (editingUser) {
        await updateCompanyUser(editingUser.id, payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.updated("User"));
      } else {
        await createCompanyUser({ ...payload, password: values.password.trim() });
        notificationService.showSuccess(CommonSuccessMessageUtil.created("User"));
      }
      setModalOpen(false);
      clearMessage();
      await loadUsers(page);
      await loadExportRows();
    } catch (err: any) {
      applyApiError(err, editingUser ? "Unable to update user" : "Unable to create user");
    }
  };

  const onInvalid = (validationErrors: FieldErrors<FormValues>) => {
    notificationService.showError(firstFormErrorMessage(validationErrors, "Please fill all required user fields before saving."));
  };

  const deactivateUser = async () => {
    if (!deleteTarget) {
      return;
    }
    clearMessage();
    try {
      setDeleting(true);
      await deactivateCompanyUser(deleteTarget.id);
      await loadUsers(page);
      await loadExportRows();
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("User"));
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  if (!can("USERS", "VIEW")) {
    return (
      <div className="space-y-4 pb-6">
        <Header title="Users" subtitle="Manage company team access and permission assignments." />
        <GlassCard className="p-6 md:p-7">
          <p className="text-sm text-slate-300">You do not have permission to manage users.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-2.5rem)] flex-col space-y-4 pb-6">
      <Header title="Users" subtitle="Create, update, and deactivate company users." />

      <div className="grid gap-4 md:grid-cols-4">
        <button type="button" className="block h-full w-full text-left" onClick={() => openUserSummary("ALL")}>
          <GlassCard className="h-full p-5 transition hover:-translate-y-0.5">
            <p className="text-sm text-slate-400">Total Users</p>
            <p className="mt-3 text-3xl font-extrabold text-white">{userPage.totalRecords}</p>
          </GlassCard>
        </button>
        <button type="button" className="block h-full w-full text-left" onClick={() => openUserSummary("OWNER")}>
          <GlassCard className="h-full p-5 transition hover:-translate-y-0.5">
            <p className="text-sm text-slate-400">Owners</p>
            <p className="mt-3 text-3xl font-extrabold text-white">{roleCounts.owners}</p>
          </GlassCard>
        </button>
        <button type="button" className="block h-full w-full text-left" onClick={() => openUserSummary("ADMIN")}>
          <GlassCard className="h-full p-5 transition hover:-translate-y-0.5">
            <p className="text-sm text-slate-400">Admins</p>
            <p className="mt-3 text-3xl font-extrabold text-white">{roleCounts.admins}</p>
          </GlassCard>
        </button>
        <button type="button" className="block h-full w-full text-left" onClick={() => openUserSummary("USER")}>
          <GlassCard className="h-full p-5 transition hover:-translate-y-0.5">
            <p className="text-sm text-slate-400">Users</p>
            <p className="mt-3 text-3xl font-extrabold text-white">{roleCounts.users}</p>
          </GlassCard>
        </button>
      </div>

      <GlassCard className="flex flex-1 flex-col p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CommonBreadcrumb items={[{ label: "Users" }]} />
          </div>
          {can("USERS", "EXPORT") || can("USERS", "ADD") ? (
            <div className="flex flex-wrap gap-2">
              {can("USERS", "EXPORT") ? <Button type="button" variant="secondary" disabled={!exportRows.length && !users.length} onClick={() => exportUsers("users.xlsx", exportRows.length ? exportRows : users)}>
                <Download size={16} />
                Export Excel
              </Button> : null}
              {can("USERS", "ADD") ? <Button type="button" onClick={openCreateModal}>
                <Plus size={16} />
                Add user
              </Button> : null}
            </div>
          ) : null}
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <Input
            label="Search Users"
            placeholder="Search by name, mobile number or email"
            value={filters.search}
            onChange={(event) => {
              setPage(0);
              setFilters((current) => ({ ...current, search: event.target.value }));
            }}
          />
          <Select
            label="User Role"
            value={filters.role}
            options={[
              { label: "All Roles", value: "" },
              ...roles.filter(Boolean).map(toRoleOption)
            ]}
            onChange={(event) => {
              setPage(0);
              setFilters((current) => ({ ...current, role: event.target.value as Role | "" }));
            }}
          />
          <Select
            label="Status Filter"
            value={filters.active}
            options={[
              { label: "All", value: "" },
              { label: "Active", value: "true" },
              { label: "Inactive", value: "false" }
            ]}
            onChange={(event) => {
              setPage(0);
              setFilters((current) => ({ ...current, active: event.target.value as UserFilters["active"] }));
            }}
          />
        </div>

        <div className="flex-1">
          <Table
            data={users}
            emptyText="No company users found."
            emptyAction={can("USERS", "ADD") ? <Button type="button" onClick={openCreateModal}><Plus size={16} />Add user</Button> : null}
            columns={[
            {
              key: "name",
              header: "Name",
              render: (item) => <span className="font-semibold text-slate-950">{item.fullName || "--"}</span>
            },
            {
              key: "mobileNumber",
              header: "Mobile Number",
              render: (item) => <span className="whitespace-nowrap text-slate-700">{item.mobileNumber || "--"}</span>
            },
            {
              key: "email",
              header: "Email Address",
              render: (item) => <span className="break-all text-slate-700">{item.email || "--"}</span>
            },
            { key: "role", header: "Role", render: (item) => <StatusBadge label={item.role} /> },
            { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
            { key: "createdAt", header: "Created Date", render: (item) => <span className="whitespace-nowrap text-slate-700">{formatDateTime(item.createdAt)}</span> },
            {
              key: "actions",
              header: "Actions",
              className: "text-right",
              render: (item) => (
                <ActionDropdown
                  actions={[
                    {
                      label: "Edit",
                      icon: <Edit3 size={15} />,
                      hidden: !can("USERS", "EDIT"),
                      onClick: () => openEditModal(item)
                    },
                    {
                      label: "Show Logs",
                      icon: <History size={15} />,
                      hidden: !can("USERS", "LOGS"),
                      onClick: () => setLogTarget(item)
                    },
                    {
                      label: "Disable",
                      icon: <UserX size={15} />,
                      danger: true,
                      disabled: !item.active,
                      hidden: !can("USERS", "DELETE"),
                      onClick: () => setDeleteTarget(item)
                    }
                  ]}
                />
              )
            }
            ]}
          />
        </div>
        <div className="mt-auto">
          <Pagination
          page={userPage.page}
          size={userPage.size}
          totalRecords={userPage.totalRecords}
          totalPages={userPage.totalPages}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            void loadUsers(nextPage);
          }}
          />
        </div>
      </GlassCard>

      <Modal open={modalOpen} title={editingUser ? "Edit User" : "Add User"} onClose={() => setModalOpen(false)}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit, onInvalid)}>
          <Input
            label="Full Name"
            requiredMark
            error={fieldErrors.fullName ?? errors.fullName?.message}
            {...register("fullName", { required: "Full name is required" })}
          />
          <Input
            label="Email Address"
            requiredMark
            type="email"
            error={fieldErrors.email ?? errors.email?.message}
            {...register("email", { required: "Email address is required" })}
          />
          <Input
            label="Mobile Number"
            requiredMark
            type="tel"
            error={fieldErrors.mobileNumber ?? errors.mobileNumber?.message}
            {...register("mobileNumber", { required: "Mobile number is required" })}
          />
          <PasswordInput
            label={editingUser ? "New Password" : "Password"}
            requiredMark={!editingUser}
            hint={editingUser ? "Leave blank to keep the current password." : undefined}
            error={fieldErrors.password ?? errors.password?.message}
            {...register("password", {
              required: editingUser ? false : "Password is required",
              minLength: { value: 8, message: "Password must be at least 8 characters" }
            })}
          />
          <Select
            label="Role"
            requiredMark
            placeholder={null}
            error={fieldErrors.role}
            options={roles.filter(Boolean).map(toRoleOption)}
            {...register("role", { required: "Role is required" })}
          />
          <Select
            label="Status"
            placeholder={null}
            error={fieldErrors.active}
            options={[
              { label: "Active", value: "true" },
              { label: "Inactive", value: "false" }
            ]}
            {...register("active")}
          />

          <div className="flex flex-col gap-3 pt-2 sm:flex-row md:col-span-2">
            <Button disabled={isSubmitting || !canSaveUser} type="submit">
              {isSubmitting ? "Saving..." : editingUser ? "Update User" : "Create User"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
      <Modal open={Boolean(activeUserRole)} title={userSummaryTitle(activeUserRole)} onClose={() => setActiveUserRole(null)}>
        <div className="space-y-5">
          <div className="flex min-h-[52px] flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span className="font-semibold text-slate-950">Role Filter:</span>
            <span className="min-w-0 flex-1 text-slate-600">{activeUserRole === "ALL" ? "All Users" : toRoleOption(activeUserRole as Role).label}</span>
            <span className="font-semibold text-slate-950">Records: {modalUserPage.totalRecords}</span>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Input
              label="Search Modal Users"
              placeholder="Search by name, mobile number or email"
              value={modalSearch}
              onChange={(event) => {
                setModalPage(0);
                setModalSearch(event.target.value);
              }}
            />
            <Button type="button" variant="secondary" disabled={!modalUsers.length} onClick={() => exportUsers(`${activeUserRole ?? "users"}-users.xlsx`, modalUsers)}>
              <Download size={17} />
              Export Excel
            </Button>
          </div>
          <Table
            data={modalUsers}
            emptyText="No users found for this role."
            columns={[
              {
                key: "name",
                header: "Name",
                render: (item) => <span className="font-semibold text-slate-950">{item.fullName || "--"}</span>
              },
              {
                key: "mobileNumber",
                header: "Mobile Number",
                render: (item) => <span className="whitespace-nowrap text-slate-700">{item.mobileNumber || "--"}</span>
              },
              {
                key: "email",
                header: "Email Address",
                render: (item) => <span className="break-all text-slate-700">{item.email || "--"}</span>
              },
              { key: "role", header: "Role", render: (item) => <StatusBadge label={item.role} /> },
              { key: "status", header: "Status", render: (item) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> }
            ]}
          />
          <Pagination page={modalUserPage.page} size={modalUserPage.size} totalRecords={modalUserPage.totalRecords} totalPages={modalUserPage.totalPages} onPageChange={setModalPage} />
        </div>
      </Modal>
      <AuditLogModal open={Boolean(logTarget)} moduleName="User" entityId={logTarget?.id ?? null} title={logTarget ? `${logTarget.fullName} Logs` : "User Logs"} onClose={() => setLogTarget(null)} />
      <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deactivateUser()} />
    </div>
  );
};

const userExportColumns = [
  { key: "fullName", header: "Name" },
  { key: "mobileNumber", header: "Mobile Number" },
  { key: "email", header: "Email Address" },
  { key: "role", header: "Role", value: (row: UserProfile) => formatRoleLabel(row.role) },
  { key: "active", header: "Status", value: (row: UserProfile) => row.active ? "Active" : "Inactive" }
];

const userSummaryTitle = (role: Role | "ALL" | null) => {
  if (role === "OWNER") return "Owner Users";
  if (role === "ADMIN") return "Admin Users";
  if (role === "USER") return "Users";
  return "All Users";
};
