import clsx from "clsx";
import { Crown, Download, Edit3, History, KeyRound, MonitorSmartphone, Plus, ShieldCheck, UserCheck, UserRound, Users, UserX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type FieldErrors, useForm, Controller } from "react-hook-form";
import { createCompanyUser, deactivateCompanyUser, deleteUserPhoto, getCompanyUserRoleCounts, getCompanyUsersPage, getRoles, updateCompanyUser, uploadUserPhoto, type UserFilterParams } from "../api/users";
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
import { ModalFormActions } from "../components/ModalFormActions";
import { PasswordInput } from "../components/PasswordInput";
import { PhotoUploadField } from "../components/PhotoUploadField";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { UserAvatar } from "../components/UserAvatar";
import { UserDevicesList } from "../components/UserDevicesList";
import { useAuth } from "../context/AuthContext";
import { useApiFormFeedback, useApiMessage } from "../hooks/useApiFeedback";
import { useListPage } from "../hooks/useListPage";
import { CommonErrorMessageUtil } from "../lib/CommonErrorMessageUtil";
import { CommonSuccessMessageUtil } from "../lib/CommonSuccessMessageUtil";
import { exportToExcel } from "../lib/excelExport";
import { EMAIL_VALIDATION_MESSAGE, isValidEmail, isValidMobileNumber, MOBILE_VALIDATION_MESSAGE, normalizeMobileNumber } from "../lib/customerValidation";
import { firstFormErrorMessage } from "../lib/formValidation";
import { formatDateTime } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { CompanyUserRequest, Role, UserProfile } from "../types/api";

type FormValues = {
  fullName: string;
  username: string;
  mobileNumber: string;
  email: string;
  password: string;
  role: Role;
  active: string;
};

const USERNAME_PATTERN = /^[A-Za-z0-9._@-]{3,50}$/;
const USERNAME_VALIDATION_MESSAGE = "Use 3-50 letters, numbers, dot, underscore, @ or hyphen (no spaces).";
// Backend jaisa: min 8, max 72 bytes (BCrypt limit). Login bhi trim karta hai, isliye yahan bhi trim.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

const validatePassword = (value: string, required: boolean) => {
  const password = value.trim();
  if (!password) {
    return required ? "Password is required" : true;
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return `Password must be ${PASSWORD_MAX_BYTES} characters or less`;
  }
  return true;
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

// Role chip: status-badge classes reuse (dark mode bhi wahi se aata hai).
const ROLE_BADGE_CLASS: Record<string, string> = {
  OWNER: "status-badge-warning",
  ADMIN: "status-badge-active",
  USER: "status-badge-muted"
};

const RoleBadge = ({ role }: { role?: string | null }) => {
  const normalized = typeof role === "string" ? role.trim().toUpperCase() : "";
  const Icon = normalized === "OWNER" ? Crown : normalized === "ADMIN" ? ShieldCheck : UserRound;
  return (
    <span className={clsx("status-badge inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 fs-11 font-semibold tracking-wide", ROLE_BADGE_CLASS[normalized] ?? "status-badge-muted")}>
      <Icon size={12} />
      {formatRoleLabel(role)}
    </span>
  );
};

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

const toQuery = (filters: UserFilters): UserFilterParams => ({
  search: filters.search.trim() || undefined,
  username: filters.username.trim() || undefined,
  role: filters.role || undefined,
  active: filters.active === "" ? undefined : filters.active === "true"
});

type RoleKey = "ALL" | "OWNER" | "ADMIN" | "USER";
type RoleCounts = Record<RoleKey, number | null>;

const ROLE_CHIPS: { key: RoleKey; label: string; icon: typeof Users }[] = [
  { key: "ALL", label: "All Users", icon: Users },
  { key: "OWNER", label: "Owners", icon: Crown },
  { key: "ADMIN", label: "Admins", icon: ShieldCheck },
  { key: "USER", label: "Users", icon: UserRound }
];

const statusCaption = (active: UserFilters["active"]) => (active === "true" ? "active" : active === "false" ? "inactive" : "total");

export const UserManagementPage = () => {
  const { can, user: activeUser, refreshProfile } = useAuth();
  const isOwner = activeUser?.role === "OWNER" || Boolean(activeUser?.superAdmin);
  const canView = can("USERS", "VIEW");
  const [roles, setRoles] = useState<Role[]>(["OWNER", "ADMIN", "USER"]);
  const [roleCounts, setRoleCounts] = useState<RoleCounts>({ ALL: null, OWNER: null, ADMIN: null, USER: null });
  const [exporting, setExporting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  // Add User: photo save ke baad upload hoti hai (user id tab milti hai). Edit: turant upload.
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [activateTarget, setActivateTarget] = useState<UserProfile | null>(null);
  const [activating, setActivating] = useState(false);
  const [mfaResetTarget, setMfaResetTarget] = useState<UserProfile | null>(null);
  const [mfaResetting, setMfaResetting] = useState(false);
  const [logTarget, setLogTarget] = useState<UserProfile | null>(null);
  const [devicesTarget, setDevicesTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
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
      if (!canView) {
        return Promise.resolve({ records: [], page: 0, size, totalRecords: 0, totalPages: 0 });
      }
      return getCompanyUsersPage({ page, size, ...toQuery(filters) });
    }
  });

  // Role chips ke counts: har role ka sahi total, backend ek GROUP BY call (/v1/users/role-counts) me deta hai.
  // Pehle 4 alag /v1/users?size=1 calls jaati thi (har ek me permission check + page + count query).
  // requestId: tez typing me purana (der se aaya) jawab naye counts overwrite na kare.
  const roleCountRequestIdRef = useRef(0);
  const loadRoleCounts = useCallback(async (filters: UserFilters) => {
    const requestId = ++roleCountRequestIdRef.current;
    const { role: _ignoredRole, ...countQuery } = toQuery(filters);
    const counts = await getCompanyUserRoleCounts(countQuery);
    if (requestId !== roleCountRequestIdRef.current) {
      return;
    }
    setRoleCounts({ ALL: counts?.ALL ?? 0, OWNER: counts?.OWNER ?? 0, ADMIN: counts?.ADMIN ?? 0, USER: counts?.USER ?? 0 });
  }, []);

  useEffect(() => {
    if (canView) {
      void getRoles().then(setRoles).catch((err: any) => setApiError(err, "Unable to load roles"));
    }
  }, [canView, setApiError]);

  // Counts role filter se independent hain: role chip click par dobara fetch nahi (pehle har click = 4 calls).
  // Live search har keystroke par activeFilters badalta hai, isliye counts debounce (pehli load turant).
  const activeFiltersRef = useRef(list.activeFilters);
  activeFiltersRef.current = list.activeFilters;
  const roleCountFilterKey = `${list.activeFilters.search}\u0000${list.activeFilters.username}\u0000${list.activeFilters.active}`;
  const roleCountsLoadedRef = useRef(false);
  useEffect(() => {
    if (!canView) {
      return;
    }
    const delayMs = roleCountsLoadedRef.current ? 300 : 0;
    roleCountsLoadedRef.current = true;
    const timer = window.setTimeout(() => {
      void loadRoleCounts(activeFiltersRef.current).catch(() => undefined);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [canView, roleCountFilterKey, loadRoleCounts]);

  const refreshAll = () => {
    list.refreshTable();
    void loadRoleCounts(list.activeFilters).catch(() => undefined);
  };

  const canSaveUser = Boolean(
    watchedValues.fullName.trim() &&
    watchedValues.username.trim() &&
    watchedValues.email.trim() &&
    watchedValues.mobileNumber.trim() &&
    watchedValues.role &&
    (editingUser || watchedValues.password.trim().length >= PASSWORD_MIN_LENGTH)
  );

  const editingSelf = Boolean(editingUser && activeUser && editingUser.id === activeUser.id);
  // Owner role sirf owner de sakta hai (backend bhi yahi rule lagata hai).
  const roleFormOptions = useMemo(
    () => roles.filter(Boolean).filter((role) => isOwner || role !== "OWNER" || editingUser?.role === "OWNER").map(toRoleOption),
    [roles, isOwner, editingUser]
  );

  // Export: poori filtered list (backend page size 100 tak deta hai, isliye pages me).
  const exportUsers = async () => {
    setExporting(true);
    try {
      const rows: UserProfile[] = [];
      let page = 0;
      let totalPages = 1;
      while (page < totalPages && page < 50) {
        const response = await getCompanyUsersPage({ ...toQuery(list.activeFilters), page, size: 100 });
        rows.push(...response.records);
        totalPages = response.totalPages;
        page += 1;
      }
      if (!rows.length) {
        notificationService.showError("No users to export.");
        return;
      }
      exportToExcel("users.xlsx", rows, userExportColumns);
    } catch (err: any) {
      setApiError(err, "Unable to export users");
    } finally {
      setExporting(false);
    }
  };

  const openCreateModal = () => {
    clearFeedback();
    setEditingUser(null);
    setPendingPhoto(null);
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
    setPendingPhoto(null);
    reset({
      fullName: target.fullName ?? "",
      username: target.username ?? "",
      mobileNumber: target.mobileNumber ?? "",
      email: target.email ?? "",
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
      mobileNumber: normalizeMobileNumber(values.mobileNumber),
      email: values.email.trim(),
      role: values.role,
      active: values.active === "true"
    };

    // Password me koi escaping/sanitization nahi (< > & sab allowed) — sirf trim, jaisa login karta hai.
    if (values.password.trim()) {
      payload.password = values.password.trim();
    }

    try {
      if (editingUser) {
        const updated = await updateCompanyUser(editingUser.id, payload);
        notificationService.showSuccess(CommonSuccessMessageUtil.updated("User"));
        if (activeUser?.id === updated.id) {
          await refreshProfile();
        }
      } else {
        const created = await createCompanyUser({ ...payload, password: values.password.trim() });
        notificationService.showSuccess(CommonSuccessMessageUtil.created("User"));
        if (pendingPhoto) {
          try {
            await uploadUserPhoto(created.id, pendingPhoto);
          } catch (photoError) {
            // User ban chuka hai; sirf photo reh gayi — edit se dobara laga sakte hain.
            setApiError(photoError, "User created, but the photo could not be uploaded. Edit the user to try again.");
          }
        }
      }
      setModalOpen(false);
      clearMessage();
      refreshAll();
    } catch (err: any) {
      applyApiError(err, editingUser ? "Unable to update user" : "Unable to create user");
    }
  };

  // Edit modal: photo turant upload / remove (list + agar khud ka record ho to header bhi taaza).
  const changeEditingUserPhoto = async (file: File | null) => {
    if (!editingUser) {
      setPendingPhoto(file);
      return;
    }
    setPhotoBusy(true);
    try {
      const updated = file ? await uploadUserPhoto(editingUser.id, file) : await deleteUserPhoto(editingUser.id);
      setEditingUser(updated);
      list.refreshTable();
      if (activeUser?.id === updated.id) {
        await refreshProfile();
      }
      notificationService.showSuccess(CommonSuccessMessageUtil.updated("User Photo"));
    } catch (err: any) {
      setApiError(err, file ? "Unable to upload photo" : "Unable to remove photo");
    } finally {
      setPhotoBusy(false);
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
      setDeleteTarget(null);
      refreshAll();
      notificationService.showSuccess("User disabled successfully");
    } catch (err: any) {
      setApiError(err, CommonErrorMessageUtil.deleteFailed);
    } finally {
      setDeleting(false);
    }
  };

  // Inactive user ko wapas active (pehle sirf Edit modal khol ke status badalna padta tha).
  const activateUser = async () => {
    if (!activateTarget) {
      return;
    }
    clearMessage();
    try {
      setActivating(true);
      await updateCompanyUser(activateTarget.id, {
        fullName: activateTarget.fullName,
        username: activateTarget.username,
        mobileNumber: activateTarget.mobileNumber,
        email: activateTarget.email,
        role: activateTarget.role,
        active: true
      });
      setActivateTarget(null);
      refreshAll();
      notificationService.showSuccess("User activated successfully");
    } catch (err: any) {
      setApiError(err, "Unable to activate user");
    } finally {
      setActivating(false);
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
      render: (item: UserProfile) => (
        <span className="flex min-w-[170px] items-center gap-2.5">
          <UserAvatar name={item.fullName} photoUrl={item.photoUrl} size="sm" />
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="max-w-[200px] truncate font-semibold text-slate-950" title={item.fullName}>{item.fullName || "--"}</span>
            {activeUser?.id === item.id ? (
              <span className="shrink-0 rounded-full bg-[color:color-mix(in_srgb,var(--theme-color)_12%,white)] px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-[var(--theme-color)]">You</span>
            ) : null}
          </span>
        </span>
      )
    },
    {
      key: "username",
      header: "Username",
      render: (item: UserProfile) => <span className="whitespace-nowrap font-medium text-slate-700">{item.username || "--"}</span>
    },
    {
      key: "mobileNumber",
      header: "Mobile Number",
      render: (item: UserProfile) => <span className="whitespace-nowrap text-slate-700">{item.mobileNumber || "--"}</span>
    },
    {
      key: "email",
      header: "Email Address",
      render: (item: UserProfile) => <span className="block max-w-[240px] truncate text-slate-700" title={item.email}>{item.email || "--"}</span>
    },
    { key: "role", header: "Role", render: (item: UserProfile) => <RoleBadge role={item.role} /> },
    { key: "status", header: "Status", render: (item: UserProfile) => <StatusBadge label={item.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "createdAt", header: "Created Date", render: (item: UserProfile) => <span className="whitespace-nowrap text-xs text-slate-600">{formatDateTime(item.createdAt)}</span> }
  ], [activeUser?.id]);
  const visibleUserColumns = useMemo(() => applyVisibleColumns(userColumns, visibleColumns), [userColumns, visibleColumns]);

  if (!canView) {
    return (
      <div className="space-y-4 pb-6">
        <Header title="Users" subtitle="Manage company team access and permission assignments." />
        <GlassCard className="p-6 md:p-7">
          <p className="text-sm text-slate-500">You do not have permission to manage users.</p>
        </GlassCard>
      </div>
    );
  }

  const activeRole: RoleKey = list.activeFilters.role || "ALL";
  const caption = statusCaption(list.activeFilters.active);
  const canEditUsers = isOwner && can("USERS", "EDIT");

  return (
    <CommonListPage<UserProfile, UserFilters>
      pageTitle="Users"
      pageSubtitle="Create, update, and deactivate company users."
      list={list}
      liveSearch
      searchPlaceholder="Search name, username, mobile or email"
      activeFilterCount={(filters) => (filters.username ? 1 : 0) + (filters.active !== "true" ? 1 : 0)}
      statCards={
        // Compact role chips (ek line): click = us role ka filter. Bade stat cards + alag modal hata diye.
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {ROLE_CHIPS.map(({ key, label, icon: Icon }) => {
            const selected = activeRole === key;
            const count = roleCounts[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                onClick={() => list.applyFilterNow({ role: key === "ALL" ? "" : key })}
                className={clsx(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                  selected
                    ? "border-[var(--theme-color)] bg-[color:color-mix(in_srgb,var(--theme-color)_6%,white)] shadow-[0_8px_24px_-14px_color-mix(in_srgb,var(--theme-color)_50%,transparent)]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                )}
              >
                <span
                  className={clsx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    selected ? "bg-[var(--theme-color)] text-[var(--theme-contrast)]" : "bg-slate-100 text-slate-600"
                  )}
                >
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{label}</span>
                  <span className="block text-[11px] font-semibold text-slate-500">
                    {count === null ? "…" : `${count} ${caption}`}
                  </span>
                </span>
              </button>
            );
          })}
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
          {/* Role filter upar ke role chips se hota hai — yahan dobara dropdown nahi. */}
          <Select
            label="Record Status"
            placeholder={null}
            value={list.formFilters.active}
            options={[
              { label: "Active", value: "true" },
              { label: "Inactive", value: "false" },
              { label: "All", value: "" }
            ]}
            onChange={(event) => list.updateFormFilters({ active: event.target.value as UserFilters["active"] })}
          />
        </>
      }
      toolbarButtons={
        <>
          {can("USERS", "EXPORT") ? <Button type="button" variant="secondary" disabled={exporting || !list.paginationInfo.totalRecords} onClick={() => void exportUsers()}>
            <Download size={16} />
            {exporting ? "Exporting…" : "Export Excel"}
          </Button> : null}
          {can("USERS", "ADD") ? <Button type="button" onClick={openCreateModal}>
            <Plus size={16} />
            Add User
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
          render: (item: UserProfile) => {
            const self = item.id === activeUser?.id;
            return (
              <ActionDropdown
                actions={[
                  {
                    label: "Edit",
                    icon: <Edit3 size={15} />,
                    // Backend user edit/disable sirf owner ko deta hai — baaki ko button dikha ke 403 mat dikhao.
                    hidden: !canEditUsers,
                    onClick: () => openEditModal(item)
                  },
                  {
                    label: "Activate",
                    icon: <UserCheck size={15} />,
                    hidden: !canEditUsers || item.active,
                    onClick: () => setActivateTarget(item)
                  },
                  {
                    label: "Show Logs",
                    icon: <History size={15} />,
                    hidden: !can("USERS", "LOGS"),
                    onClick: () => setLogTarget(item)
                  },
                  {
                    // Owner ke devices sirf Owner (backend bhi yahi rokta hai).
                    label: "Devices",
                    icon: <MonitorSmartphone size={15} />,
                    hidden: !can("USERS", "EDIT") || (item.role === "OWNER" && !isOwner),
                    onClick: () => setDevicesTarget(item)
                  },
                  {
                    label: "Reset MFA",
                    icon: <KeyRound size={15} />,
                    hidden: !canEditUsers,
                    onClick: () => setMfaResetTarget(item)
                  },
                  {
                    // Inactive record par Disable/Delete nahi (baaki pages jaisa pattern).
                    label: "Disable",
                    icon: <UserX size={15} />,
                    danger: true,
                    hidden: !isOwner || !can("USERS", "DELETE") || self || !item.active,
                    onClick: () => setDeleteTarget(item)
                  }
                ]}
              />
            );
          }
        }
      ]}
      emptyMessage={list.loading ? "Loading users..." : "No users found for these filters."}
      fullHeight
      modals={
        <>
          <Modal open={modalOpen} eyebrow="Team Member" title={editingUser ? "Edit User" : "Add User"} onClose={() => setModalOpen(false)} maxWidthClass="max-w-3xl">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit, onInvalid)}>
              {/* Photo API owner-only hai: non-owner (USERS:ADD wala admin) ko field dikha ke upload fail mat karao. */}
              {isOwner ? (
                <div className="md:col-span-2">
                  <PhotoUploadField
                    name={watchedValues.fullName || editingUser?.fullName}
                    photoUrl={editingUser?.photoUrl}
                    pendingFile={pendingPhoto}
                    busy={photoBusy}
                    hint={editingUser ? "JPG, PNG or WEBP, up to 2 MB. Saved immediately." : "JPG, PNG or WEBP, up to 2 MB. Uploaded when you create the user."}
                    onSelect={(file) => void changeEditingUserPhoto(file)}
                    onRemove={() => void changeEditingUserPhoto(null)}
                  />
                </div>
              ) : null}
              <Input
                label="Full Name"
                requiredMark
                maxLength={100}
                error={fieldErrors.fullName ?? errors.fullName?.message}
                {...register("fullName", { required: "Full name is required", validate: (value) => Boolean(value.trim()) || "Full name is required" })}
              />
              <Input
                label="Username"
                requiredMark
                autoComplete="off"
                maxLength={50}
                hint="Used to sign in. No spaces."
                error={fieldErrors.username ?? errors.username?.message}
                {...register("username", { required: "Username is required", validate: (value) => USERNAME_PATTERN.test(value.trim()) || USERNAME_VALIDATION_MESSAGE })}
              />
              <Input
                label="Email Address"
                requiredMark
                type="email"
                maxLength={150}
                error={fieldErrors.email ?? errors.email?.message}
                {...register("email", { required: "Email address is required", validate: (value) => isValidEmail(value) || EMAIL_VALIDATION_MESSAGE })}
              />
              <Input
                label="Mobile Number"
                requiredMark
                type="tel"
                inputMode="numeric"
                maxLength={15}
                placeholder="10-digit mobile number"
                error={fieldErrors.mobileNumber ?? errors.mobileNumber?.message}
                {...register("mobileNumber", { required: "Mobile number is required", validate: (value) => isValidMobileNumber(value) || MOBILE_VALIDATION_MESSAGE })}
              />
              <PasswordInput
                label={editingUser ? "New Password" : "Password"}
                requiredMark={!editingUser}
                autoComplete="new-password"
                maxLength={PASSWORD_MAX_BYTES}
                hint={editingUser ? "Leave blank to keep the current password. Changing it signs the user out." : "8-72 characters."}
                error={fieldErrors.password ?? errors.password?.message}
                {...register("password", { validate: (value) => validatePassword(value, !editingUser) })}
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
                    error={fieldErrors.role ?? errors.role?.message}
                    options={roleFormOptions}
                    disabled={editingSelf}
                    hint={editingSelf ? "You cannot change your own role." : undefined}
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
                    disabled={editingSelf}
                    hint={editingSelf ? "You cannot deactivate your own account." : undefined}
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

              <div className="md:col-span-2">
                <ModalFormActions submit editing={Boolean(editingUser)} saving={isSubmitting} disabled={!canSaveUser} entityLabel="User" onCancel={() => setModalOpen(false)} />
              </div>
            </form>
          </Modal>
          <AuditLogModal open={Boolean(logTarget)} moduleName="User" entityId={logTarget?.id ?? null} title={logTarget ? `${logTarget.fullName} Logs` : "User Logs"} onClose={() => setLogTarget(null)} />
          <CommonDeleteModal
            open={Boolean(deleteTarget)}
            title="Disable User"
            confirmLabel="Disable"
            description={deleteTarget ? `Disable "${deleteTarget.fullName}" (${deleteTarget.username})? They will be signed out and cannot log in until an owner activates them again.` : undefined}
            loading={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deactivateUser()} />
          <Modal
            open={Boolean(activateTarget)}
            title="Activate User"
            eyebrow="Team Member"
            maxWidthClass="max-w-md"
            onClose={() => setActivateTarget(null)}
          >
            <p className="text-sm leading-relaxed text-slate-600">
              Activate <strong>{activateTarget?.fullName}</strong> ({activateTarget?.username})? They will be able to sign in again with their existing password.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" disabled={activating} onClick={() => setActivateTarget(null)}>
                Cancel
              </Button>
              <Button type="button" disabled={activating} onClick={() => void activateUser()}>
                <UserCheck size={16} />
                {activating ? "Activating…" : "Activate"}
              </Button>
            </div>
          </Modal>
          <Modal
            open={Boolean(devicesTarget)}
            title={`Devices · ${devicesTarget?.fullName ?? ""}`}
            eyebrow="Security"
            maxWidthClass="max-w-xl"
            onClose={() => setDevicesTarget(null)}
          >
            {devicesTarget ? <UserDevicesList userId={devicesTarget.id} /> : null}
          </Modal>
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
  { key: "active", header: "Status", value: (row: UserProfile) => row.active ? "Active" : "Inactive" },
  { key: "createdAt", header: "Created Date", value: (row: UserProfile) => formatDateTime(row.createdAt) }
];
