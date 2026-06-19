import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const PlatformAdminRoute = () => {
  const { auth, sessionType, isPlatformAdmin } = useAuth();
  const location = useLocation();

  if (auth?.accessToken && sessionType === "user") {
    return <Navigate to="/dashboard" replace />;
  }

  if (!auth?.accessToken || !isPlatformAdmin) {
    return <Navigate to="/platform-admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
