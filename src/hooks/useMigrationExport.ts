import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/useI18n';
import { MIGRATION_COPY } from '@/constants/migrationCopy';

export function useMigrationExport() {
  const { language } = useI18n();
  const copy = MIGRATION_COPY[language];
  return useMutation({
    mutationFn: async () => {
      // Load ZIP generation and raw Edge Function sources only when explicitly requested.
      const { downloadMigrationPackage } = await import('@/lib/migrationExport');
      return downloadMigrationPackage();
    },
    onSuccess: () => toast.success(copy.success),
    onError: (error: Error) => toast.error(error.message || copy.error),
    retry: false,
  });
}
