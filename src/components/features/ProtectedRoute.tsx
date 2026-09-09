// ProtectedRoute — ADR-005, ADR-008
// Layer 1: Auth check — redirects to /login if not authenticated
// Layer 2: RBAC check (optional) — calls canUserPerform() Edge Function if requiredPermission provided
// RULE: Frontend NEVER makes the authorization decision — always delegates to server (ADR-005)

import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCanUserPerform } from "@/hooks/useCanUserPerform";
import LoadingSpinner from "@/components/features/LoadingSpinner";
import { ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Optional RBAC check — format: "resource.action" e.g. "reservation.read" */
  requiredPermission?: string;
  /** If true, redirect to /dashboard instead of showing Unauthorized page */
  redirectOnDenied?: boolean;
}

const UnauthorizedPage = ({ permission }: { permission: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="text-center space-y-4 max-w-md">
      <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto">
        <ShieldAlert className="w-8 h-8 text-rose-400" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-foreground mb-2">Accès refusé</h1>
        <p className="text-sm text-muted-foreground">
          Vous n'avez pas la permission <code className="text-rose-400 font-mono bg-rose-500/5 px-1.5 py-0.5 rounded">{permission}</code> requise pour cette page.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-2">
          Contactez votre administrateur tenant pour obtenir les droits nécessaires.
        </p>
      </div>
      <div className="flex gap-3 justify-center">
        <a href="/dashboard"
          className="text-sm text-primary border border-primary/25 px-4 py-2.5 rounded-xl hover:bg-primary/5 transition-colors min-h-[44px] flex items-center">
          ← Tableau de bord
        </a>
      </div>
      <p className="text-xs text-muted-foreground/40 font-mono">
        ADR-005 · canUserPerform() · RBAC server-side
      </p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, requiredPermission, redirectOnDenied = false }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, membership } = useAuth();
  const location = useLocation();
  const canDo = useCanUserPerform();

  const [rbacState, setRbacState] = useState<'idle' | 'checking' | 'allowed' | 'denied'>('idle');

  // RBAC check — runs only if requiredPermission is set and user is authenticated
  useEffect(() => {
    if (!requiredPermission || !isAuthenticated || isLoading) return;

    const [resource, action] = requiredPermission.split('.');
    if (!resource || !action) {
      console.warn('[ProtectedRoute] Invalid requiredPermission format. Expected "resource.action".');
      setRbacState('allowed');
      return;
    }

    setRbacState('checking');

    canDo({
      action,
      resource,
      tenantId: membership?.tenant_id,
    }).then(result => {
      console.log(`[ProtectedRoute] RBAC ${resource}.${action} → ${result.allowed ? 'ALLOWED' : 'DENIED'} (${result.reason})`);
      setRbacState(result.allowed ? 'allowed' : 'denied');
    }).catch(err => {
      console.error('[ProtectedRoute] RBAC check failed:', err);
      // Fail-open in development — fail-closed in production
      setRbacState(process.env.NODE_ENV === 'production' ? 'denied' : 'allowed');
    });
  }, [requiredPermission, isAuthenticated, isLoading, membership?.tenant_id]);

  // ── Layer 1: Auth loading ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-muted-foreground">Vérification session…</p>
        </div>
      </div>
    );
  }

  // ── Layer 2: Not authenticated → /login ───────────────────────────────────
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Layer 3: RBAC check (if requiredPermission set) ───────────────────────
  if (requiredPermission) {
    if (rbacState === 'idle' || rbacState === 'checking') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-xs text-muted-foreground">Vérification des permissions…</p>
          </div>
        </div>
      );
    }

    if (rbacState === 'denied') {
      if (redirectOnDenied) {
        return <Navigate to="/dashboard" replace />;
      }
      return <UnauthorizedPage permission={requiredPermission} />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
