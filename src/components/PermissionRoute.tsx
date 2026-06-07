import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const PermissionRoute = ({
  menuCode,
  actionCode = "VIEW",
  children
}: {
  menuCode: string;
  actionCode?: string;
  children: JSX.Element;
}) => {
  const { permissions, can, firstAccessibleRoute, refreshPermissions } = useAuth();
  const location = useLocation();
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setValidating(true);
    refreshPermissions()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setValidating(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (!permissions || validating) {
    return null;
  }

  if (!can(menuCode, actionCode)) {
    const nextRoute = firstAccessibleRoute();
    return <Navigate replace to={nextRoute && nextRoute !== location.pathname ? nextRoute : "/no-menu"} />;
  }

  return children;
};
