import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, Crown, LayoutGrid, Minus, RotateCcw, Save, Search, ShieldCheck, UserRound, Users } from "lucide-react";
import { getRolePermissionMatrix, getUserPermissionMatrix, saveRolePermissionMatrix, saveUserPermissionMatrix } from "../api/permissions";
import { getCompanyUsers, getRoles } from "../api/users";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { InfoNote } from "../components/InfoNote";
import { Select } from "../components/Select";
import { resolveMenuIcon } from "../config/menuIcons";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { notificationService } from "../services/notificationService";
import type { ActionPermission, PermissionMatrix, Role, UserProfile } from "../types/api";

type MenuRow = PermissionMatrix["menus"][number];
type CheckState = "on" | "off" | "mixed";

const ACTION_COLUMNS = ["VIEW", "ADD", "EDIT", "DELETE", "EXPORT", "LOGS", "EMAIL_SEND", "SMS_SEND"];
const ACTION_LABELS: Record<string, string> = {
  VIEW: "View",
  ADD: "Add",
  EDIT: "Edit",
  DELETE: "Delete",
  EXPORT: "Export",
  LOGS: "Logs",
  EMAIL_SEND: "Email",
  SMS_SEND: "SMS"
};

// Role cards ka chhota parichay (client ko turant samajh aaye kaun kya kar sakta hai).
const ROLE_META: Record<string, { title: string; description: string; icon: typeof Crown }> = {
  OWNER: { title: "Owner", description: "Full control of the business. Always has every permission.", icon: Crown },
  ADMIN: { title: "Admin", description: "Runs day-to-day work — billing, stock, reports and setup.", icon: ShieldCheck },
  USER: { title: "User", description: "Counter / billing staff with limited access.", icon: UserRound }
};

const LEGACY_PLATFORM_ADMIN_MENU_CODE_PREFIX = "SUPER" + "_ADMIN_";

const isLegacySuperAdminMenu = (menu: MenuRow) =>
  menu.menuCode.startsWith(LEGACY_PLATFORM_ADMIN_MENU_CODE_PREFIX) || menu.menuRoute.startsWith("/super-admin") || menu.menuRoute.startsWith("/platform-admin");

const toRoleOption = (role?: Role | string | null) => {
  const normalized = typeof role === "string" ? role.trim().toUpperCase() : "";
  return {
    label: normalized ? normalized.charAt(0) + normalized.slice(1).toLowerCase() : "Unknown",
    value: normalized
  };
};

const visibleActions = (menu: MenuRow) => menu.actions.filter((action) => ACTION_COLUMNS.includes(action.actionCode));

const stateOf = (actions: ActionPermission[]): CheckState => {
  if (!actions.length) {
    return "off";
  }
  const allowed = actions.filter((action) => action.allowed).length;
  return allowed === actions.length ? "on" : allowed === 0 ? "off" : "mixed";
};

type MenuGroup = { key: string; title: string; icon: string | null; menus: MenuRow[] };

/**
 * Menus ko sidebar jaisa sections me baanto: jin top-level menus ke children
 * hain (Inventory, DataPort, Reports, Setup...) unka apna section; baaki
 * akele menus (Dashboard, Invoices...) "Main" section me.
 */
const groupMenus = (menus: MenuRow[]): MenuGroup[] => {
  const parents = new Set(menus.map((menu) => menu.parentMenuCode).filter(Boolean) as string[]);
  const main: MenuGroup = { key: "__main", title: "Main", icon: "LayoutDashboard", menus: [] };
  const sections = new Map<string, MenuGroup>();
  for (const menu of menus) {
    if (!menu.parentMenuCode && parents.has(menu.menuCode)) {
      sections.set(menu.menuCode, { key: menu.menuCode, title: menu.menuName, icon: menu.menuIcon, menus: [menu, ...(sections.get(menu.menuCode)?.menus ?? [])] });
    }
  }
  for (const menu of menus) {
    if (menu.parentMenuCode) {
      const section = sections.get(menu.parentMenuCode) ?? { key: menu.parentMenuCode, title: menu.parentMenuCode, icon: null, menus: [] };
      section.menus.push(menu);
      sections.set(menu.parentMenuCode, section);
    } else if (!parents.has(menu.menuCode)) {
      main.menus.push(menu);
    }
  }
  return [main, ...sections.values()].filter((group) => group.menus.length);
};

/** Ek role ka summary: kitne modules dikhte hain. */
const accessSummary = (matrix: PermissionMatrix | null | undefined) => {
  const menus = (matrix?.menus ?? []).filter((menu) => !isLegacySuperAdminMenu(menu));
  const visible = menus.filter((menu) => menu.actions.find((action) => action.actionCode === "VIEW")?.allowed).length;
  return { visible, total: menus.length };
};

const matrixKey = (matrix: PermissionMatrix | null) =>
  JSON.stringify((matrix?.menus ?? []).map((menu) => [menu.id, menu.actions.map((action) => [action.id, action.allowed])]));

export const RolePermissionsPage = () => {
  const { can, refreshPermissions, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>(["OWNER", "ADMIN", "USER"]);
  const [permissionMode, setPermissionMode] = useState<"role" | "user">("role");
  const [selectedRole, setSelectedRole] = useState<Role>("ADMIN");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix | null>(null);
  // Load / save ke waqt ka snapshot: isse "unsaved changes" aur Discard.
  const [savedMatrix, setSavedMatrix] = useState<PermissionMatrix | null>(null);
  const [roleMatrices, setRoleMatrices] = useState<Record<string, PermissionMatrix>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const { clearMessage, setApiError } = useApiMessage();

  const canView = can("ROLE_PERMISSIONS", "VIEW");

  useEffect(() => {
    if (canView) {
      void Promise.all([getCompanyUsers({ size: 1000 }).then(setUsers), getRoles().then(setRoles)]).catch((err: any) => setApiError(err, "Unable to load permission setup"));
    }
  }, [canView]);

  // Har role ki matrix sirf ek baar server se: cards ka access % aur selected role dono isi cache se.
  // (Pehle getRoles aane par saare roles dobara aur selected role alag se fetch hota tha.)
  const roleMatrixRequests = useRef(new Map<Role, Promise<PermissionMatrix>>());
  const loadRoleMatrix = (role: Role) => {
    let request = roleMatrixRequests.current.get(role);
    if (!request) {
      request = getRolePermissionMatrix(role);
      roleMatrixRequests.current.set(role, request);
      request.catch(() => roleMatrixRequests.current.delete(role));
    }
    return request;
  };

  // Role cards par har role ka access % dikhane ke liye saare roles ek baar load.
  useEffect(() => {
    if (!canView) {
      return;
    }
    roles.forEach((role) => {
      void loadRoleMatrix(role)
        .then((matrix) => setRoleMatrices((current) => ({ ...current, [role]: matrix })))
        .catch(() => undefined);
    });
  }, [canView, roles]);

  useEffect(() => {
    if (!canView) {
      return;
    }
    const apply = (matrix: PermissionMatrix | null) => {
      setPermissionMatrix(matrix);
      setSavedMatrix(matrix);
    };
    if (permissionMode === "role") {
      setLoadingMatrix(true);
      void loadRoleMatrix(selectedRole)
        .then(apply)
        .catch((err: any) => setApiError(err, "Unable to load role permissions"))
        .finally(() => setLoadingMatrix(false));
      return;
    }
    if (selectedUserId) {
      setLoadingMatrix(true);
      void getUserPermissionMatrix(Number(selectedUserId))
        .then(apply)
        .catch((err: any) => setApiError(err, "Unable to load user permissions"))
        .finally(() => setLoadingMatrix(false));
    } else {
      apply(null);
    }
  }, [permissionMode, selectedRole, selectedUserId, canView]);

  const filteredPermissionMenus = useMemo(() => {
    const search = permissionSearch.trim().toLowerCase();
    return (permissionMatrix?.menus ?? [])
      .filter((menu) => !isLegacySuperAdminMenu(menu))
      .filter((menu) => !search || menu.menuName.toLowerCase().includes(search) || menu.menuCode.toLowerCase().includes(search));
  }, [permissionMatrix, permissionSearch]);

  const groups = useMemo(() => groupMenus(filteredPermissionMenus), [filteredPermissionMenus]);

  // Select All / column / section toggle sirf dikh rahi (search filtered) rows par lage — chhupi rows chupke se na badle.
  const visibleMenuIds = useMemo(() => new Set(filteredPermissionMenus.map((menu) => menu.id)), [filteredPermissionMenus]);

  const changeCount = useMemo(() => {
    if (!permissionMatrix || !savedMatrix) {
      return 0;
    }
    const before = new Map(savedMatrix.menus.flatMap((menu) => menu.actions.map((action) => [`${menu.id}:${action.id}`, action.allowed] as const)));
    return permissionMatrix.menus.reduce(
      (count, menu) => count + menu.actions.filter((action) => before.get(`${menu.id}:${action.id}`) !== action.allowed).length,
      0
    );
  }, [permissionMatrix, savedMatrix]);
  const dirty = changeCount > 0 && matrixKey(permissionMatrix) !== matrixKey(savedMatrix);

  const writeAction = (action: ActionPermission, checked: boolean): ActionPermission =>
    permissionMode === "role"
      ? { ...action, allowed: checked }
      : { ...action, allowed: checked, overrideAllowed: checked };

  // Ek jagah se saare toggles: kaunsi menus + kaunse action codes badalne hain.
  const updateMenus = (menuIds: Set<number>, actionCodes: string[] | null, checked: boolean) => {
    setPermissionMatrix((current) =>
      current
        ? {
            ...current,
            menus: current.menus.map((menu) => {
              if (!menuIds.has(menu.id)) {
                return menu;
              }
              const actions = menu.actions.map((action) =>
                actionCodes === null || actionCodes.includes(action.actionCode) ? writeAction(action, checked) : action
              );
              return { ...menu, canView: Boolean(actions.find((action) => action.actionCode === "VIEW")?.allowed), actions };
            })
          }
        : current
    );
  };

  const toggleAction = (menuId: number, actionCode: string, checked: boolean) => updateMenus(new Set([menuId]), [actionCode], checked);
  // Row toggle: dikhne wale 8 actions ke saath chhupe (Restore, Preview...) bhi — "full access" ka matlab poora.
  const toggleRow = (menuId: number, checked: boolean) => updateMenus(new Set([menuId]), null, checked);
  const toggleGroup = (group: MenuGroup, checked: boolean) => updateMenus(new Set(group.menus.map((menu) => menu.id)), null, checked);
  const toggleColumn = (actionCode: string, checked: boolean) => updateMenus(visibleMenuIds, [actionCode], checked);
  const toggleAllMenus = (checked: boolean) => updateMenus(visibleMenuIds, null, checked);

  const columnState = (actionCode: string): CheckState =>
    stateOf(filteredPermissionMenus.map((menu) => menu.actions.find((action) => action.actionCode === actionCode)).filter((action): action is ActionPermission => Boolean(action)));
  const groupState = (group: MenuGroup): CheckState => stateOf(group.menus.flatMap(visibleActions));
  const everythingState = stateOf(filteredPermissionMenus.flatMap(visibleActions));

  // Owner ke rights fixed hain; EDIT permission na ho to sirf dekh sakte hain.
  const canEditPermissions = can("ROLE_PERMISSIONS", "EDIT");
  const ownerRoleLocked = permissionMode === "role" && selectedRole === "OWNER";
  const matrixReadOnly = ownerRoleLocked || !canEditPermissions || !permissionMatrix;

  const selectedUser = users.find((item) => String(item.id) === selectedUserId) ?? null;
  const overrideCount = permissionMode === "user"
    ? (permissionMatrix?.menus ?? []).reduce((count, menu) => count + menu.actions.filter((action) => action.overrideAllowed !== null && action.overrideAllowed !== undefined).length, 0)
    : 0;

  const switchMode = (mode: "role" | "user") => {
    if (mode === permissionMode) {
      return;
    }
    if (dirty && !window.confirm("You have unsaved permission changes. Discard them?")) {
      return;
    }
    setPermissionMode(mode);
  };

  const selectRole = (role: Role) => {
    if (role === selectedRole) {
      return;
    }
    if (dirty && !window.confirm("You have unsaved permission changes. Discard them?")) {
      return;
    }
    setSelectedRole(role);
  };

  const savePermissions = async () => {
    if (!permissionMatrix) {
      return;
    }
    setPermissionsSaving(true);
    try {
      const payload = {
        roleCode: permissionMode === "role" ? selectedRole : undefined,
        userId: permissionMode === "user" ? Number(selectedUserId) : undefined,
        menus: permissionMatrix.menus
          .filter((menu) => !isLegacySuperAdminMenu(menu))
          .map((menu) => ({
            menuId: menu.id,
            canView: menu.canView,
            actions: menu.actions.map((action) => ({
              actionId: action.id,
              allowed: action.allowed,
              overrideAllowed: permissionMode === "user" ? action.overrideAllowed ?? false : undefined
            }))
          }))
      };
      const nextMatrix = permissionMode === "role" ? await saveRolePermissionMatrix(payload) : await saveUserPermissionMatrix(payload);
      setPermissionMatrix(nextMatrix);
      setSavedMatrix(nextMatrix);
      if (permissionMode === "role") {
        roleMatrixRequests.current.set(selectedRole, Promise.resolve(nextMatrix));
        setRoleMatrices((current) => ({ ...current, [selectedRole]: nextMatrix }));
      }
      await refreshPermissions();
      clearMessage();
      notificationService.showSuccess(permissionMode === "role" ? "Role Permissions Saved Successfully" : "User Permissions Saved Successfully");
    } catch (err: any) {
      setApiError(err, "Unable to save permissions");
    } finally {
      setPermissionsSaving(false);
    }
  };

  if (!canView) {
    return (
      <div className="space-y-4 pb-6">
        <Header title="Roles & Permissions" subtitle="Manage company role and user permissions." />
        <GlassCard className="p-6 md:p-7">
          <p className="text-sm text-slate-500">You do not have permission to manage role permissions.</p>
        </GlassCard>
      </div>
    );
  }

  const colSpan = ACTION_COLUMNS.length + 2;

  return (
    <div className={clsx("space-y-4", dirty ? "pb-28" : "pb-6")}>
      <Header title="Roles & Permissions" subtitle="Decide who can see and do what — by role, or fine-tune a single user." />

      <GlassCard className="p-4 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Segmented switch: Role-wise / User-wise */}
          <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 sm:w-auto" role="tablist" aria-label="Permission mode">
            {([
              { mode: "role" as const, label: "Role-wise", icon: Users },
              { mode: "user" as const, label: "User-wise", icon: UserRound }
            ]).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={permissionMode === mode}
                onClick={() => switchMode(mode)}
                className={clsx(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none",
                  permissionMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Icon size={16} className={permissionMode === mode ? "text-[var(--theme-color)]" : undefined} />
                {label}
              </button>
            ))}
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <label className="relative block w-full sm:w-72">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={permissionSearch}
                onChange={(event) => setPermissionSearch(event.target.value)}
                placeholder="Search menus…"
                aria-label="Search menus"
                className="h-10 w-full rounded-[var(--radius-control)] border border-slate-200 bg-white pl-9 pr-3 fs-13 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-color)] focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]"
              />
            </label>
            {canEditPermissions ? (
              <Button type="button" disabled={!dirty || permissionsSaving || ownerRoleLocked} onClick={() => void savePermissions()}>
                <Save size={16} />
                {permissionsSaving ? "Saving…" : "Save"}
              </Button>
            ) : null}
          </div>
        </div>

        {permissionMode === "role" ? (
          // Compact cards (ek line): pehle bade cards ki wajah se permission table pehli screen me nahi aati thi.
          <div className="mt-4 grid gap-2.5 md:grid-cols-3">
            {roles.map((role) => {
              const meta = ROLE_META[role] ?? { title: toRoleOption(role).label, description: "", icon: ShieldCheck };
              const Icon = meta.icon;
              const summary = accessSummary(role === selectedRole ? permissionMatrix : roleMatrices[role]);
              const percent = summary.total ? Math.round((summary.visible / summary.total) * 100) : 0;
              const memberCount = users.filter((item) => String(item.role).toUpperCase() === role && item.active !== false).length;
              const selected = role === selectedRole;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => selectRole(role)}
                  aria-pressed={selected}
                  title={meta.description}
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
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-slate-900">{meta.title}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                        {memberCount} {memberCount === 1 ? "user" : "users"} · {summary.total ? `${summary.visible}/${summary.total}` : "—"}
                      </span>
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-[var(--theme-color)] transition-all duration-500" style={{ width: `${percent}%` }} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-end">
            <Select
              label="User"
              placeholder="Select User"
              searchable
              value={selectedUserId}
              onChange={(event) => {
                if (dirty && !window.confirm("You have unsaved permission changes. Discard them?")) {
                  return;
                }
                setSelectedUserId(event.target.value);
              }}
              options={users.map((item) => ({ label: `${item.fullName} (${toRoleOption(item.role).label})`, value: item.id }))}
            />
            {selectedUser ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--theme-color)_12%,white)] text-sm font-bold text-[var(--theme-color)]">
                  {selectedUser.fullName.split(/\s+/).map((part) => part.charAt(0)).join("").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{selectedUser.fullName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {toRoleOption(selectedUser.role).label} role · {overrideCount ? `${overrideCount} custom permission${overrideCount === 1 ? "" : "s"}` : "follows role permissions"}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {ownerRoleLocked ? (
          <InfoNote className="mt-4">Owner always has full access. Owner permissions cannot be changed.</InfoNote>
        ) : !canEditPermissions ? (
          <InfoNote className="mt-4">You can view permissions, but you do not have rights to change them.</InfoNote>
        ) : permissionMode === "user" ? (
          <InfoNote className="mt-4">Changes here apply only to the selected user and override their role. Cells with a dot are custom for this user.</InfoNote>
        ) : null}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-2"><PermissionCheck state="on" disabled label="" /> Allowed</span>
          <span className="inline-flex items-center gap-2"><PermissionCheck state="off" disabled label="" /> Not allowed</span>
          <span className="inline-flex items-center gap-2"><PermissionCheck state="mixed" disabled label="" /> Partly allowed</span>
          {permissionMode === "user" ? (
            <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Custom for this user</span>
          ) : null}
        </div>

        {/* Header sticky (andar scroll) + Menu column sticky (side scroll). */}
        <div className="scrollbar-thin mt-3 max-h-[68vh] overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-700">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 min-w-[170px] sm:min-w-[220px] border-b border-slate-200 bg-slate-50 px-4 py-3 fs-11 font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Module
                </th>
                <th className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-2 py-3 text-center">
                  <HeaderCheck label="All" state={everythingState} disabled={matrixReadOnly || !filteredPermissionMenus.length} onChange={toggleAllMenus} />
                </th>
                {ACTION_COLUMNS.map((action) => (
                  <th key={action} className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50 px-2 py-3 text-center">
                    <HeaderCheck label={ACTION_LABELS[action] ?? action} state={columnState(action)} disabled={matrixReadOnly || !filteredPermissionMenus.length} onChange={(checked) => toggleColumn(action, checked)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingMatrix && !permissionMatrix ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={colSpan} className="border-b border-slate-100 px-4 py-3">
                      <div className="h-6 animate-pulse rounded-md bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : groups.length ? groups.map((group) => {
                const isCollapsed = Boolean(collapsed[group.key]) && !permissionSearch.trim();
                const allowedCount = group.menus.filter((menu) => menu.actions.find((action) => action.actionCode === "VIEW")?.allowed).length;
                const GroupIcon = resolveMenuIcon(group.icon);
                return (
                  <GroupRows key={group.key}>
                    <tr className="bg-white">
                      <td className="sticky left-0 z-10 border-b border-slate-200 bg-[color:color-mix(in_srgb,var(--theme-color)_5%,white)] px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => setCollapsed((current) => ({ ...current, [group.key]: !current[group.key] }))}
                          className="flex w-full items-center gap-2.5 text-left"
                          aria-expanded={!isCollapsed}
                        >
                          <ChevronDown size={16} className={clsx("shrink-0 text-slate-400 transition", isCollapsed && "-rotate-90")} />
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--theme-color)] shadow-sm ring-1 ring-slate-200">
                            <GroupIcon size={15} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-slate-900">{group.title}</span>
                            <span className="block text-[11px] font-medium text-slate-500">{allowedCount}/{group.menus.length} visible</span>
                          </span>
                        </button>
                      </td>
                      <td className="border-b border-slate-200 bg-[color:color-mix(in_srgb,var(--theme-color)_5%,white)] px-2 py-2.5 text-center">
                        <PermissionCheck state={groupState(group)} disabled={matrixReadOnly} label={`All permissions in ${group.title}`} onChange={(checked) => toggleGroup(group, checked)} />
                      </td>
                      {/* Section ke andar ek column (jaise sab "Edit") ek click me. */}
                      {ACTION_COLUMNS.map((actionCode) => {
                        const sectionActions = group.menus
                          .map((menu) => menu.actions.find((action) => action.actionCode === actionCode))
                          .filter((action): action is ActionPermission => Boolean(action));
                        return (
                          <td key={actionCode} className="border-b border-slate-200 bg-[color:color-mix(in_srgb,var(--theme-color)_5%,white)] px-2 py-2.5 text-center">
                            {sectionActions.length ? (
                              <PermissionCheck
                                state={stateOf(sectionActions)}
                                disabled={matrixReadOnly}
                                label={`${ACTION_LABELS[actionCode] ?? actionCode} for all of ${group.title}`}
                                onChange={(checked) => updateMenus(new Set(group.menus.map((menu) => menu.id)), [actionCode], checked)}
                              />
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                    {isCollapsed ? null : group.menus.map((menu) => {
                      const MenuIcon = resolveMenuIcon(menu.menuIcon);
                      const rowState = stateOf(visibleActions(menu));
                      return (
                        <tr key={menu.id} className="group/row bg-white transition-colors hover:bg-slate-50">
                          <td className="sticky left-0 z-10 border-b border-slate-100 bg-inherit px-4 py-2.5">
                            <div className="flex items-center gap-2.5 pl-6">
                              <MenuIcon size={15} className={rowState === "off" ? "shrink-0 text-slate-300" : "shrink-0 text-slate-500"} />
                              <div className="min-w-0">
                                <p className={clsx("truncate font-semibold", rowState === "off" ? "text-slate-400" : "text-slate-900")}>{menu.menuName}</p>
                                <p className="truncate text-[10px] uppercase tracking-wide text-slate-300">{menu.menuCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="border-b border-slate-100 px-2 py-2.5 text-center">
                            <PermissionCheck state={rowState} disabled={matrixReadOnly} label={`All actions for ${menu.menuName}`} onChange={(checked) => toggleRow(menu.id, checked)} />
                          </td>
                          {ACTION_COLUMNS.map((actionCode) => {
                            const action = menu.actions.find((item) => item.actionCode === actionCode);
                            const custom = permissionMode === "user" && action && action.overrideAllowed !== null && action.overrideAllowed !== undefined;
                            return (
                              <td key={actionCode} className="relative border-b border-slate-100 px-2 py-2.5 text-center">
                                {action ? (
                                  <>
                                    <PermissionCheck
                                      state={action.allowed ? "on" : "off"}
                                      disabled={matrixReadOnly}
                                      label={`${ACTION_LABELS[actionCode] ?? actionCode} - ${menu.menuName}`}
                                      onChange={(checked) => toggleAction(menu.id, actionCode, checked)}
                                    />
                                    {custom ? <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-500" title="Custom for this user" /> : null}
                                  </>
                                ) : (
                                  <span className="text-slate-200">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </GroupRows>
                );
              }) : (
                <tr>
                  <td className="px-4 py-2" colSpan={colSpan}>
                    <EmptyState
                      title={permissionMode === "user" && !selectedUserId ? "Select a user to view their permissions." : permissionSearch.trim() ? "No menus match your search." : "No permission rows found."}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
          <LayoutGrid size={12} /> Turning off “View” hides the module from the sidebar for this {permissionMode === "role" ? "role" : "user"}.
        </p>
      </GlassCard>

      {/* Unsaved changes bar: badlav karke page chhodne / bhoolne se bacho. */}
      {dirty && canEditPermissions && !ownerRoleLocked ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:pl-[260px]">
          <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35)] backdrop-blur">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Save size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {changeCount} unsaved change{changeCount === 1 ? "" : "s"}
              </p>
              <p className="truncate text-xs text-slate-500">
                {permissionMode === "role" ? `${toRoleOption(selectedRole).label} role` : selectedUser?.fullName ?? "Selected user"}
                {permissionMode === "user" && selectedUser && String(selectedUser.id) === String(currentUser?.id) ? " (you)" : ""}
              </p>
            </div>
            <Button type="button" variant="ghost" disabled={permissionsSaving} onClick={() => setPermissionMatrix(savedMatrix)}>
              <RotateCcw size={15} />
              Discard
            </Button>
            <Button type="button" disabled={permissionsSaving} onClick={() => void savePermissions()}>
              <Save size={16} />
              {permissionsSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const GroupRows = ({ children }: { children: React.ReactNode }) => <>{children}</>;

/** Custom checkbox: on / off / mixed (aadha) — native checkbox se saaf aur theme rang me. */
const PermissionCheck = ({
  state,
  disabled,
  label,
  onChange
}: {
  state: CheckState;
  disabled?: boolean;
  label: string;
  onChange?: (checked: boolean) => void;
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={state === "mixed" ? "mixed" : state === "on"}
    aria-label={label || undefined}
    disabled={disabled}
    onClick={() => onChange?.(state !== "on")}
    className={clsx(
      "inline-flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border transition",
      state === "off"
        ? "border-slate-300 bg-white text-transparent"
        : "border-[var(--theme-color)] bg-[var(--theme-color)] text-[var(--theme-contrast)]",
      disabled ? "cursor-default" : "cursor-pointer hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_srgb,var(--theme-color)_35%,transparent)]",
      disabled && state === "off" && label !== "" && "bg-slate-50"
    )}
  >
    {state === "mixed" ? <Minus size={12} strokeWidth={3.5} /> : <Check size={12} strokeWidth={3.5} />}
  </button>
);

const HeaderCheck = ({ label, state, disabled, onChange }: { label: string; state: CheckState; disabled: boolean; onChange: (checked: boolean) => void }) => (
  <span className="inline-flex flex-col items-center gap-1.5">
    <PermissionCheck state={state} disabled={disabled} label={`${label} — select all`} onChange={onChange} />
    <span className="whitespace-nowrap fs-11 font-semibold uppercase tracking-wide text-slate-500">{label}</span>
  </span>
);
