import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { currentHostname, isLiveHost, isMainHost } from "../lib/hosts";
import { CommonPageLoader } from "./CommonPageLoader";

export const ProtectedRoute = () => {
  const { auth, sessionType } = useAuth();
  const location = useLocation();

  if (!auth?.accessToken || sessionType !== "user") {
    // Live main host has no tenant login — send to landing, not /login.
    const liveMain =
      typeof window !== "undefined" && isLiveHost(currentHostname()) && isMainHost(currentHostname());
    return <Navigate to={liveMain ? "/" : "/login"} replace state={{ from: location }} />;
  }

  return (
    <>
      <Outlet />
      <CommonPageLoader />
    </>
  );
};
