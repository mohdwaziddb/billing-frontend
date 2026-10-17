import { Download, Edit3, History, KeyRound, Plus, UserX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type FieldErrors, useForm, Controller } from "react-hook-form";
import { createCompanyUser, deactivateCompanyUser, getCompanyUsersPage, getRoles, updateCompanyUser } from "../api/users";
import { resetUserMfa } from "../api/mfa";
import { ActionDropdown } from "../components/ActionDropdown";
import { AuditLogModal } from "../components/AuditLogModal";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonDeleteModal } from "../components/CommonDeleteModal";
import { CommonListPage } from "../components/CommonListPage";
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
import { useListPage } from "../hooks/useListPage";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { exportToExcel } from "../lib/excelExport";
import { firstFormErrorMessage } from "../lib/formValidation";
import { formatDateTime } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { CompanyUserRequest, PageResponse, Role, UserProfile } from "../types/api";

type FormValues = {
  fullName: string;
  username: string;
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
  username: string;
  role: Role | "";
  active: "" | "true" | "false";
};

const emptyFilters: UserFilters = {
  search: "",
  username: "",
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
  const { can, user: activeUser } = useAuth();
  const isOwner = activeUser?.role === "OWNER" || Boolean(activeUser?.superAdmin);
  const [roles, setRoles] = useState<Role[]>(["OWNER", "ADMIN", "USER"]);
  const [exportRows, setExportRows] = useState<UserProfile[]>([]);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [mfaResetTarget, setMfaResetTarget] = useState<UserProfile | null>(null);
  const [mfaResetting, setMfaResetting] = useState(false);
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
    control,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    defaultValues: {
      fullName: "",
      username: "",
      mobileNumber: "",
      email: "",
      password: "",
      role: "USER",
      active: "true"
    }
  });
  const watchedValues = watch();

  const list = useListPage<UserProfile, UserFilters>({
    initialFilters: emptyFilters,
    errorMessage: "Unable to load users",
    fetchPage: ({ page, size, filters }) => {
      if (!can("USERS", "VIEW")) {
        return Promise.resolve({ records: [], page: 0, size, totalRecords: 0, totalPages: 0 });
      }
      return getCompanyUsersPage({
        page,
        size,
        search: filters.search.trim() || undefined,
        username: filters.username.trim() || undefined,
        role: filters.role || undefined,
        active: filters.active === "" ? undefined : filters.active === "true"
      });
    }
  });

  const loadExportRows = async (filters: UserFilters) => {
    const response = await getCompanyUsersPage({
      page: 0,
      size: 100,
      search: filters.search.trim() || undefined,
      username: filters.username.trim() || undefined,
      role: filters.role || undefined,
      active: filters.active === "" ? undefined : filters.active === "true"
    });
    setExportRows(response.records);
  };

  useEffect(() => {
    if (can("USERS", "VIEW")) {
      void getRoles().then(setRoles).catch((err: any) => setApiError(err, "Unable to load users"));
    }
  }, [can, setApiError]);

  useEffect(() => {
    if (can("USERS", "VIEW")) {
      void loadExportRows(list.activeFilters).catch((err: any) => setApiError(err, "Unable to load users"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [can, list.activeFilters, setApiError]);

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

  const canSaveUser = Boolean(
    watchedValues.fullName.trim() &&
    watchedValues.username.trim() &&
    watchedValues.email.trim() &&
    watchedValues.mobileNumber.trim() &&
    watchedValues.role &&
    (editingUser || watchedValues.password.trim().length >= 8)
  );

  const roleCounts = useMemo(() => {
    const source = exportRows.length ? exportRows : list.tableData;
    return {
      owners: source.filter((item) => item.role === "OWNER").length,
      admins: source.filter((item) => item.role === "ADMIN").length,
      users: source.filter((item) => item.role === "USER").length
    };
  }, [exportRows, list.tableData]);

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
      username: "",
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
      username: target.username,
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
      username: values.username.trim(),
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
      list.refreshTable();
      await loadExportRows(list.activeFilters);
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
      list.refreshTable();
      await loadExportRows(list.activeFilters);
      setDeleteTarget(null);
      notificationService.showSuccess(CommonSuccessMessageUtil.deleted("User"));
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  const resetMfa = async () => {
    if (!mfaResetTarget) {
      return;
    }
    clearMessage();
    try {
      setMfaResetting(true);
      const result = await resetUserMfa(mfaResetTarget.id);
      setMfaResetTarget(null);
      notificationService.showSuccess(
        `MFA reset (${result.removedDevices} device(s) removed). The user needs to enroll again.`
      );
    } catch (err: any) {
      setApiError(err, "Unable to reset MFA.");
    } finally {
      setMfaResetting(false);
    }
  };

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const userColumns = useMemo(() => [
    {
      key: "name",
      header: "Name",
      render: (item: UserProfile) => <span className="font-semibold text-slate-950">{item.fullName || "--"}</span>
    },
    {
      key: "username",
      header: "Username",
      render: (item: UserProfile) => <span className="whitespace-nowrap font-semibold text-slate-700">{item.username || "--"}</span>
    },
    {
      key: "mobileNumber",
      header: "Mobile Number",
      render: (item: UserProfile) => <span className="whitespace-nowrap text-slate-700">{item.mobileNumber || "--"}</span>
    },
    {
      key: "email",
      header: "Email Address",
      render: (item: UserProfile) => <span className="break-all text-slate-700">{item.email || "--"}</span>
    },
    { key: "role", header: "Role", render: (item: UserProfile) => <StatusBadge label={item.role} /> },
    { key: "status", header: "Status", render: (item: UserProfile) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "createdAt", header: "Created Date", render: (item: UserProfile) => <span className="whitespace-nowrap text-slate-700">{formatDateTime(item.createdAt)}</span> }
  ], []);
  const visibleUserColumns = useMemo(() => applyVisibleColumns(userColumns, visibleColumns), [userColumns, visibleColumns]);

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
    <CommonListPage<UserProfile, UserFilters>
      pageTitle="Users"
      pageSubtitle="Create, update, and deactivate company users."
      list={list}
      liveSearch
      searchPlaceholder="Search User"
      activeFilterCount={(filters) => (filters.username ? 1 : 0) + (filters.role ? 1 : 0) + (filters.active !== "true" ? 1 : 0)}
      statCards={
        <div className="grid gap-4 md:grid-cols-4">
          <button type="button" className="block h-full w-full text-left" onClick={() => openUserSummary("ALL")}>
            <GlassCard className="h-full p-5 transition hover:-translate-y-0.5">
              <p className="text-sm text-slate-400">Total Users</p>
              <p className="mt-3 fs-24 font-extrabold text-white">{list.paginationInfo.totalRecords}</p>
            </GlassCard>
          </button>
          <button type="button" className="block h-full w-full text-left" onClick={() => openUserSummary("OWNER")}>
            <GlassCard className="h-full p-5 transition hover:-translate-y-0.5">
              <p className="text-sm text-slate-400">Owners</p>
              <p className="mt-3 fs-24 font-extrabold text-white">{roleCounts.owners}</p>
            </GlassCard>
          </button>
          <button type="button" className="block h-full w-full text-left" onClick={() => openUserSummary("ADMIN")}>
            <GlassCard className="h-full p-5 transition hover:-translate-y-0.5">
              <p className="text-sm text-slate-400">Admins</p>
              <p className="mt-3 fs-24 font-extrabold text-white">{roleCounts.admins}</p>
            </GlassCard>
          </button>
          <button type="button" className="block h-full w-full text-left" onClick={() => openUserSummary("USER")}>
            <GlassCard className="h-full p-5 transition hover:-translate-y-0.5">
              <p className="text-sm text-slate-400">Users</p>
              <p className="mt-3 fs-24 font-extrabold text-white">{roleCounts.users}</p>
            </GlassCard>
          </button>
        </div>
      }
      filterFields={
        <>
          <Input
            label="Username"
            placeholder="Filter by username"
            value={list.formFilters.username}
            onChange={(event) => list.updateFormFilters({ username: event.target.value })}
          />
          <Select
            label="User Role"
            value={list.formFilters.role}
            options={[
              { label: "All Roles", value: "" },
              ...roles.filter(Boolean).map(toRoleOption)
            ]}
            onChange={(event) => list.updateFormFilters({ role: event.target.value as Role | "" })}
          />
          <Select
            label="Status Filter"
            value={list.formFilters.active}
            options={[
              { label: "All", value: "" },
              { label: "Active", value: "true" },
              { label: "Inactive", value: "false" }
            ]}
            onChange={(event) => list.updateFormFilters({ active: event.target.value as UserFilters["active"] })}
          />
        </>
      }
      toolbarButtons={
        <>
          {can("USERS", "EXPORT") ? <Button type="button" variant="secondary" disabled={!exportRows.length && !list.tableData.length} onClick={() => exportUsers("users.xlsx", exportRows.length ? exportRows : list.tableData)}>
            <Download size={16} />
            Export Excel
          </Button> : null}
          {can("USERS", "ADD") ? <Button type="button" onClick={openCreateModal}>
            <Plus size={16} />
            Add user
          </Button> : null}
        </>
      }
      columnSelector={{ tableName: "USERS", columns: userColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["name"] }}
      tableColumns={[
        ...visibleUserColumns,
        {
          key: "actions",
          header: "Actions",
          className: "text-right",
          render: (item: UserProfile) => (
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
                  label: "Reset MFA",
                  icon: <KeyRound size={15} />,
                  hidden: !isOwner || !can("USERS", "EDIT"),
                  onClick: () => setMfaResetTarget(item)
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
      emptyMessage="No company users found."
      fullHeight
      modals={
        <>
          <Modal open={modalOpen} title={editingUser ? "Edit User" : "Add User"} onClose={() => setModalOpen(false)}>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit, onInvalid)}>
              <Input
                label="Full Name"
                requiredMark
                error={fieldErrors.fullName ?? errors.fullName?.message}
                {...register("fullName", { required: "Full name is required" })}
              />
              <Input
                label="Username"
                requiredMark
                autoComplete="off"
                error={fieldErrors.username ?? errors.username?.message}
                {...register("username", { required: "Username is required" })}
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
                autoComplete={editingUser ? "off" : "new-password"}
                hint={editingUser ? "Leave blank to keep the current password." : undefined}
                error={fieldErrors.password ?? errors.password?.message}
                {...register("password", {
                  required: editingUser ? false : "Password is required",
                  minLength: { value: 8, message: "Password must be at least 8 characters" }
                })}
              />
              <Controller
                name="role"
                control={control}
                rules={{ required: "Role is required" }}
                render={({ field }) => (
                  <Select
                    label="Role"
                    requiredMark
                    placeholder={null}
                    error={fieldErrors.role}
                    options={roles.filter(Boolean).map(toRoleOption)}
                    name={field.name}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
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
              <div className="flex min-h-[52px] flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <span className="font-semibold text-slate-950">Role Filter:</span>
                <span className="min-w-0 flex-1 text-slate-600">{activeUserRole === "ALL" ? "All Users" : toRoleOption(activeUserRole as Role).label}</span>
                <span className="font-semibold text-slate-950">Records: {modalUserPage.totalRecords}</span>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Input
                  label="Search Modal Users"
                  placeholder="Search by name, username, mobile number or email"
                  value={modalSearch}
                  onChange={(event) => {
                    setModalPage(0);
                    setModalSearch(event.target.value);
                  }}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button type="button" variant="secondary" disabled={!modalUsers.length} onClick={() => exportUsers(`${activeUserRole ?? "users"}-users.xlsx`, modalUsers)}>
                  <Download size={17} />
                  Export Excel
                </Button>
                <div className="flex justify-end"><Pagination page={modalUserPage.page} size={modalUserPage.size} totalRecords={modalUserPage.totalRecords} totalPages={modalUserPage.totalPages} onPageChange={setModalPage} layout="inline" /></div>
              </div>
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
                    key: "username",
                    header: "Username",
                    render: (item) => <span className="whitespace-nowrap font-semibold text-slate-700">{item.username || "--"}</span>
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
            </div>
          </Modal>
          <AuditLogModal open={Boolean(logTarget)} moduleName="User" entityId={logTarget?.id ?? null} title={logTarget ? `${logTarget.fullName} Logs` : "User Logs"} onClose={() => setLogTarget(null)} />
          <CommonDeleteModal open={Boolean(deleteTarget)} loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deactivateUser()} />
          <Modal
            open={Boolean(mfaResetTarget)}
            title="Reset MFA"
            eyebrow="Security"
            maxWidthClass="max-w-md"
            onClose={() => setMfaResetTarget(null)}
          >
            <p className="text-sm leading-relaxed text-slate-600">
              All MFA devices of <strong>{mfaResetTarget?.fullName}</strong> ({mfaResetTarget?.username}) will be removed.
              The user will sign in without a code next time and will need to enroll again. Continue?
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" disabled={mfaResetting} onClick={() => setMfaResetTarget(null)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" disabled={mfaResetting} onClick={() => void resetMfa()}>
                {mfaResetting ? "Resetting…" : "Reset MFA"}
              </Button>
            </div>
          </Modal>
        </>
      }
    />
  );
};

const userExportColumns = [
  { key: "fullName", header: "Name" },
  { key: "username", header: "Username" },
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
