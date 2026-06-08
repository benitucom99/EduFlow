import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Session exists but profile failed to load → treat as unauthenticated.
  if (!profile) return <Navigate to="/login" replace />;

  // User com sessão mas sem centro_id → completar onboarding.
  if (profile && !profile.centro_id) return <Navigate to="/onboarding" replace />;

  if (allowedRoles && profile?.role && !allowedRoles.includes(profile.role)) {
    const fallback = profile.role === "explicador" ? "/calendario" : "/dashboard";
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}
