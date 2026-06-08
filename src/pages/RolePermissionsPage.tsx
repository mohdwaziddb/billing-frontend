import { useEffect, useMemo, useState } from "react";
import { getRolePermissionMatrix, getUserPermissionMatrix, saveRolePermissionMatrix, saveUserPermissionMatrix } from "../api/permissions";
import { getCompanyUsers, getRoles } from "../api/users";
import { Button } from "../components/Button";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { useAuth } from "../context/AuthContext";
import { useApiMessage } from "../hooks/useApiFeedback";
import { notificationService } from "../services/notificationService";
import type { ActionPermission, PermissionMatrix, Role, UserProfile } from "../types/api";

const ACTION_COLUMNS = ["VIEW", "ADD", "EDIT", "DELETE", "EXPORT"];
const toRoleOption = (role?: Role | string | null) => {
  const normalized = typeof role === "string" ? role.trim().toUpperCase() : "";
  return {
    label: normalized ? normalized.charAt(0) + normalized.slice(1).toLowerCase() : "Unknown",
    value: normalized
  };
};

export const RolePermissionsPage = () => {
  const { can, refreshPermissions } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>(["OWNER", "ADMIN", "USER"]);
  const [permissionMode, setPermissionMode] = useState<"role" | "user">("role");
  const [selectedRole, setSelectedRole] = useState<Role>("ADMIN");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix | null>(null);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const { message: pageError, clearMessage, setApiError } = useApiMessage();

  useEffect(() => {
    if (can("ROLE_PERMISSIONS", "VIEW")) {
      void Promise.all([getCompanyUsers({ size: 1000 }).then(setUsers), getRoles().then(setRoles)]).catch((err: any) => setApiError(err, "Unable to load permission setup"));
    }
  }, [can]);

  useEffect(() => {
    if (!can("ROLE_PERMISSIONS", "VIEW")) {
      return;
    }
    if (permissionMode === "role") {
      void getRolePermissionMatrix(selectedRole).then(setPermissionMatrix).catch((err: any) => setApiError(err, "Unable to load role permissions"));
      return;
    }
    if (selectedUserId) {
      void getUserPermissionMatrix(Number(selectedUserId)).then(setPermissionMatrix).catch((err: any) => setApiError(err, "Unable to load user permissions"));
    } else {
      setPermissionMatrix(null);
    }
  }, [permissionMode, selectedRole, selectedUserId, can]);

  const filteredPermissionMenus = useMemo(() => {
    const search = permissionSearch.trim().toLowerCase();
    return (permissionMatrix?.menus ?? []).filter((menu) => !search || menu.menuName.toLowerCase().includes(search) || menu.menuCode.toLowerCase().includes(search));
  }, [permissionMatrix, permissionSearch]);

  const setMenuActions = (menuId: number, updater: (actions: ActionPermission[]) => ActionPermission[]) => {
    setPermissionMatrix((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        menus: current.menus.map((menu) => {
          if (menu.id !== menuId) {
            return menu;
          }
          const actions = updater(menu.actions);
          const viewAction = actions.find((action) => action.actionCode === "VIEW");
          return {
            ...menu,
            canView: Boolean(viewAction?.allowed),
            actions
          };
        })
      };
    });
  };

  const writeAction = (action: ActionPermission, checked: boolean): ActionPermission =>
    permissionMode === "role"
      ? { ...action, allowed: checked }
      : { ...action, allowed: checked, overrideAllowed: checked };

  const toggleAction = (menuId: number, actionId: number, checked: boolean) => {
    setMenuActions(menuId, (actions) => actions.map((action) => (action.id === actionId ? writeAction(action, checked) : action)));
  };

  const toggleRow = (menuId: number, checked: boolean) => {
    setMenuActions(menuId, (actions) => actions.map((action) => writeAction(action, checked)));
  };

  const toggleAllMenus = (checked: boolean) => {
    setPermissionMatrix((current) =>
      current
        ? {
            ...current,
            menus: current.menus.map((menu) => ({
              ...menu,
              canView: checked,
              actions: menu.actions.map((action) => writeAction(action, checked))
            }))
          }
        : current
    );
  };

  const toggleColumn = (actionCode: string, checked: boolean) => {
    setPermissionMatrix((current) =>
      current
        ? {
            ...current,
            menus: current.menus.map((menu) => {
              const actions = menu.actions.map((action) => (action.actionCode === actionCode ? writeAction(action, checked) : action));
              const viewAction = actions.find((action) => action.actionCode === "VIEW");
              return { ...menu, canView: Boolean(viewAction?.allowed), actions };
            })
          }
        : current
    );
  };

  const isRowAllSelected = (menuActions: ActionPermission[]) =>
    ACTION_COLUMNS.every((actionCode) => Boolean(menuActions.find((action) => action.actionCode === actionCode)?.allowed));

  const isColumnAllSelected = (actionCode: string) =>
    Boolean(permissionMatrix?.menus.length) && (permissionMatrix?.menus ?? []).every((menu) => Boolean(menu.actions.find((action) => action.actionCode === actionCode)?.allowed));

  const isEverythingSelected = () =>
    Boolean(permissionMatrix?.menus.length) && (permissionMatrix?.menus ?? []).every((menu) => isRowAllSelected(menu.actions));

  const savePermissions = async () => {
    if (!permissionMatrix) {
      return;
    }
    setPermissionsSaving(true);
    try {
      const payload = {
        roleCode: permissionMode === "role" ? selectedRole : undefined,
        userId: permissionMode === "user" ? Number(selectedUserId) : undefined,
        menus: permissionMatrix.menus.map((menu) => ({
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
      await refreshPermissions();
      clearMessage();
      notificationService.showSuccess(permissionMode === "role" ? "Permissions Saved Successfully" : "Role Permissions Updated Successfully");
    } catch (err: any) {
      setApiError(err, "Unable to save permissions");
    } finally {
      setPermissionsSaving(false);
    }
  };

  if (!can("ROLE_PERMISSIONS", "VIEW")) {
    return (
      <div className="space-y-4 pb-6">
        <Header title="Role Permissions" subtitle="Manage company role and user permissions." />
        <GlassCard className="p-6 md:p-7">
          <p className="text-sm text-slate-300">You do not have permission to manage role permissions.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <Header title="Role Permissions" subtitle="Owner-managed company role and user permission assignment." />

      {pageError ? (
        <div className="glass rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">
          {pageError}
        </div>
      ) : null}

      <GlassCard className="p-6 md:p-7">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Permissions</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Role and user access</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={permissionMode === "role" ? "primary" : "secondary"} onClick={() => setPermissionMode("role")}>Role-wise</Button>
            <Button type="button" variant={permissionMode === "user" ? "primary" : "secondary"} onClick={() => setPermissionMode("user")}>User-wise</Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_180px]">
          {permissionMode === "role" ? (
            <Select
              label="Role"
              placeholder={null}
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value as Role)}
              options={roles.map(toRoleOption)}
            />
          ) : (
            <Select
              label="User"
              placeholder="Select User"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              options={users.map((item) => ({ label: `${item.fullName} (${item.role})`, value: item.id }))}
            />
          )}
          <Input label="Search Menus" value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} />
          <div className="flex items-end">
            <Button className="w-full" type="button" disabled={!permissionMatrix || permissionsSaving || (permissionMode === "role" && selectedRole === "OWNER")} onClick={() => void savePermissions()}>
              {permissionsSaving ? "Saving..." : "Bulk save"}
            </Button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto scrollbar-thin">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm text-slate-200/90">
            <thead>
              <tr>
                <th className="whitespace-nowrap border-b border-white/10 px-4 pb-3 pt-1 font-medium text-slate-400 first:pl-0">Menu</th>
                <th className="whitespace-nowrap border-b border-white/10 px-4 pb-3 pt-1 text-center font-medium text-slate-400">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" className="h-4 w-4 accent-sky-400" checked={isEverythingSelected()} disabled={!permissionMatrix || selectedRole === "OWNER"} onChange={(event) => toggleAllMenus(event.target.checked)} />
                    Select All
                  </label>
                </th>
                {ACTION_COLUMNS.map((action) => (
                  <th key={action} className="whitespace-nowrap border-b border-white/10 px-4 pb-3 pt-1 text-center font-medium text-slate-400">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 accent-sky-400" checked={isColumnAllSelected(action)} disabled={!permissionMatrix || selectedRole === "OWNER"} onChange={(event) => toggleColumn(action, event.target.checked)} />
                      {action}
                    </label>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPermissionMenus.length ? filteredPermissionMenus.map((menu) => (
                <tr key={menu.id} className="group">
                  <td className="border-b border-white/5 px-4 py-4 first:pl-0 group-last:border-b-0">
                    <p className="font-semibold text-white">{menu.menuName}</p>
                    <p className="text-xs text-slate-400">{menu.menuCode}</p>
                  </td>
                  <td className="border-b border-white/5 px-4 py-4 text-center group-last:border-b-0">
                    <input type="checkbox" className="h-4 w-4 accent-sky-400" checked={isRowAllSelected(menu.actions)} disabled={selectedRole === "OWNER"} onChange={(event) => toggleRow(menu.id, event.target.checked)} />
                  </td>
                  {ACTION_COLUMNS.map((actionCode) => {
                    const action = menu.actions.find((item) => item.actionCode === actionCode);
                    const checked = Boolean(action?.allowed);
                    return (
                      <td key={actionCode} className="border-b border-white/5 px-4 py-4 text-center group-last:border-b-0">
                        {action ? (
                          <input type="checkbox" className="h-4 w-4 accent-sky-400" checked={checked} disabled={selectedRole === "OWNER"} onChange={(event) => toggleAction(menu.id, action.id, event.target.checked)} />
                        ) : (
                          <span className="text-slate-600">--</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-10 text-center text-slate-400" colSpan={7}>No permission rows found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};
