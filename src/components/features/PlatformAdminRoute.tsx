import { Navigate } from "react-router-dom";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import LoadingSpinner from "@/components/features/LoadingSpinner";

const PlatformAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isPlatformAdmin, isPending } = usePlatformAdmin();

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default PlatformAdminRoute;
