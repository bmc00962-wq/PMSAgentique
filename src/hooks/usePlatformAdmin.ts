import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function usePlatformAdmin() {
  const { isAuthenticated } = useAuth();

  const { data, isPending } = useQuery({
    queryKey: ["platform-admin"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_platform_admin");
      if (error) {
        console.error("[usePlatformAdmin]", error.message);
        return false;
      }
      return data === true;
    },
  });

  return { isPlatformAdmin: data === true, isPending: isAuthenticated && isPending };
}
