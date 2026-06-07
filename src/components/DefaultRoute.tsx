import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const DefaultRoute = () => {
  const { auth, permissions, firstAccessibleRoute } = useAuth();

  if (!auth?.accessToken) {
    return <Navigate replace to="/login" />;
  }

  if (!permissions) {
    return null;
  }

  return <Navigate replace to={firstAccessibleRoute() ?? "/no-menu"} />;
};
