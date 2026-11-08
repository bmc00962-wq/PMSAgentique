import { Archive, Download, ShieldCheck, Info } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { useMigrationExport } from '@/hooks/useMigrationExport';
import { MIGRATION_COPY } from '@/constants/migrationCopy';

export default function MigrationExportPanel() {
  const { membership, isLoading } = useAuth();
  const { language } = useI18n();
  const copy = MIGRATION_COPY[language];
  const migration = useMigrationExport();
  const permitted = membership?.role === 'platform_super_admin';
  // UI visibility is not authorization: the server independently verifies the role.
  if (isLoading || !permitted) return null;
  return (
    <section aria-labelledby="migration-title" className="rounded-2xl border border-border border-s-4 border-s-primary bg-card p-6 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-primary"><Archive size={18} aria-hidden="true" />{copy.eyebrow}</p>
          <h2 id="migration-title" className="text-xl font-bold text-foreground">{copy.title}</h2>
          <p className="text-base leading-relaxed text-muted-foreground">{copy.description}</p>
          <button type="button" onClick={() => migration.mutate()} disabled={migration.isPending}
            aria-busy={migration.isPending}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-[transform,opacity] duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.99] disabled:cursor-wait disabled:opacity-50 sm:w-auto">
            <Download size={18} aria-hidden="true" />{migration.isPending ? copy.loading : copy.action}
          </button>
          {migration.data && <p role="status" className="break-all text-sm text-muted-foreground">{migration.data.filename}</p>}
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-secondary/40 p-5">
          <p className="flex items-center gap-2 text-base font-semibold text-foreground"><ShieldCheck size={18} className="text-primary" aria-hidden="true" />{copy.included}</p>
          <p className="text-base leading-relaxed text-foreground">{copy.scope}</p>
          <p className="text-base leading-relaxed text-muted-foreground">{copy.excluded}</p>
          <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"><Info size={16} className="mt-1 shrink-0 text-primary" aria-hidden="true" />{copy.review}</p>
        </div>
      </div>
    </section>
  );
}
