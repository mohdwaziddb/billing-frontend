import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isExplicitLogout, useAuth } from "../context/AuthContext";
import { currentHostname, isLiveHost, isMainHost } from "../lib/hosts";
import { CommonPageLoader } from "./CommonPageLoader";

export const ProtectedRoute = () => {
  const { auth, sessionType } = useAuth();
  const location = useLocation();

  if (!auth?.accessToken || sessionType !== "user") {
    // Live main host has no tenant login — send to landing, not /login.
    const liveMain =
      typeof window !== "undefined" && isLiveHost(currentHostname()) && isMainHost(currentHostname());
    // Session expire / direct link: login ke baad wahi page. Khud Logout kiya ho to nahi
    // (pehle Users page se logout karke login karne par phir Users page hi khulta tha).
    return <Navigate to={liveMain ? "/" : "/login"} replace state={isExplicitLogout() ? undefined : { from: location }} />;
  }

  return (
    <>
      <Outlet />
      <CommonPageLoader />
    </>
  );
};
