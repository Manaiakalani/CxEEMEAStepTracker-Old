import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getSessionUser } from "@/lib/auth";

export function RequireAuth() {
  const user = getSessionUser();
  const loc = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return <Outlet />;
}
