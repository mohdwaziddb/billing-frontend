import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * BizioConsole guard: only tenant super-admin sessions
 * (login via companies.super_admin_username, user.superAdmin === true).
 * Normal OWNER/ADMIN/USER sessions are sent to the dashboard.
 */
export const SuperAdminRoute = () => {
  const { auth, sessionType, user, permissions } = useAuth();
  const location = useLocation();

  if (!auth?.accessToken || sessionType !== "user") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Bootstrap (me/menus) still loading — wait instead of redirecting.
  if (!user && !permissions) {
    return <main className="min-h-screen bg-white" />;
  }

  if (!user?.superAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
