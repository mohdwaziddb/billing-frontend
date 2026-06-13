import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { handlePermissionDenied } from "../lib/permissionHandler";

export const PermissionRoute = ({
  menuCode,
  actionCode = "VIEW",
  children
}: {
  menuCode: string;
  actionCode?: string;
  children: JSX.Element;
}) => {
  const { permissions, can, firstAccessibleRoute } = useAuth();
  const location = useLocation();

  const denied = Boolean(permissions && !can(menuCode, actionCode));

  useEffect(() => {
    if (denied) {
      handlePermissionDenied();
    }
  }, [denied, location.pathname]);

  if (!permissions) {
    return null;
  }

  if (denied) {
    const nextRoute = can("DASHBOARD", "VIEW") ? "/dashboard" : firstAccessibleRoute();
    return <Navigate replace to={nextRoute && nextRoute !== location.pathname ? nextRoute : "/no-menu"} />;
  }

  return children;
};
