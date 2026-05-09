import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getPermissionsForRole, type AdminPermission } from "@/lib/permissions";

// ---------------------------------------------------------------------------
// Mostra spinner enquanto a sessão é carregada
// ---------------------------------------------------------------------------

function AuthLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Verificando sessão…</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProtectedRoute — redireciona para /login se não autenticado
// ---------------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePermission?: AdminPermission;
};

export function ProtectedRoute({ children, requireAdmin = false, requirePermission }: Props) {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoader />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/cursos" replace />;
  }

  if (requirePermission) {
    const role = user?.role ?? "student";
    const perms = getPermissionsForRole(role);
    if (!perms[requirePermission]) {
      return <Navigate to="/cursos" replace />;
    }
  }

  return <>{children}</>;
}
