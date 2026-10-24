import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { MenuCodeProvider } from "../context/MenuContext";
import { findMenuTrailByRoute } from "../lib/menu";
import { notificationService } from "../services/notificationService";

/**
 * Generic route (jaise /data-port/:module): menu code URL se menus me dhoondo,
 * taaki har naye module ke liye yahan route/menu code hardcode na karna pade.
 */
export const RouteMenuPermission = ({ fallbackMenuCode, children }: { fallbackMenuCode: string; children: JSX.Element }) => {
  const { permissions } = useAuth();
  const location = useLocation();
  const menuCode = findMenuTrailByRoute(permissions?.menus ?? [], location.pathname)?.menu.menuCode ?? fallbackMenuCode;
  return <PermissionRoute menuCode={menuCode}>{children}</PermissionRoute>;
};

export const PermissionRoute = ({
  menuCode,
  actionCode = "VIEW",
  children
}: {
  menuCode: string;
  actionCode?: string;
  children: JSX.Element;
}) => {
  const { permissions, can, firstAccessibleRoute, bootstrapFailed, retryBootstrap } = useAuth();
  const location = useLocation();

  const denied = Boolean(permissions && !can(menuCode, actionCode));

  useEffect(() => {
    if (denied) {
      notificationService.handlePermissionDenied();
    }
  }, [denied, location.pathname]);

  if (!permissions) {
    if (bootstrapFailed) {
      // Pehle yahan blank screen reh jati thi (koi message / retry nahi).
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm font-semibold text-slate-700">Unable to load your workspace. Please check your connection.</p>
          <button
            type="button"
            onClick={retryBootstrap}
            className="rounded-lg bg-[var(--theme-color)] px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      );
    }
    return null;
  }

  if (denied) {
    const nextRoute = can("DASHBOARD", "VIEW") ? "/dashboard" : firstAccessibleRoute();
    return <Navigate replace to={nextRoute && nextRoute !== location.pathname ? nextRoute : "/no-menu"} />;
  }

  return <MenuCodeProvider value={menuCode}>{children}</MenuCodeProvider>;
};
