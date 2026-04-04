import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function PortalProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated || user?.role !== "encarregado") {
    return <Navigate to="/portal/login" replace />;
  }
  return <>{children}</>;
}
