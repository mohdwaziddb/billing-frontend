import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const DefaultRoute = () => {
  const { auth, permissions, firstAccessibleRoute, sessionType } = useAuth();

  if (!auth?.accessToken) {
    return <Navigate replace to="/" />;
  }

  if (sessionType === "platform-admin") {
    return <Navigate replace to="/platform-admin/dashboard" />;
  }

  if (!permissions) {
    return null;
  }

  return <Navigate replace to={firstAccessibleRoute() ?? "/no-menu"} />;
};
