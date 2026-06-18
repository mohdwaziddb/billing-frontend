import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const PlatformAdminRoute = () => {
  const { auth, sessionType } = useAuth();
  const location = useLocation();

  if (!auth?.accessToken || sessionType !== "platform-admin") {
    return <Navigate to="/platform-admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};
