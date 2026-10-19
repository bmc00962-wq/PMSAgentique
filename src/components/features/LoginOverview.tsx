import { Building2, CheckCircle2 } from 'lucide-react';
import LoginPricingSummary from '@/components/features/LoginPricingSummary';
import type { Language } from '@/lib/i18n';

interface LoginOverviewProps {
  language: Language;
  labels: { welcome: string; subtitle: string; features: { label: string; desc: string }[] };
}
const LoginOverview = ({ language, labels }: LoginOverviewProps) => (
  <aside className="hidden flex-shrink-0 flex-col border-e border-border bg-accent/50 p-8 lg:flex lg:w-[42%] xl:w-[38%] xl:p-12">
    <div className="mb-8 flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-card text-primary shadow-card"><Building2 className="h-5 w-5" /></div>
      <div><p className="text-base font-bold text-foreground">PMS SaaS</p><p className="text-sm text-muted-foreground">Agentique</p></div>
    </div>
    <div className="flex-1">
      <h2 className="mb-2 text-3xl font-semibold text-foreground">{labels.welcome}</h2>
      <p className="mb-6 text-base text-muted-foreground">{labels.subtitle}</p>
      <div className="mb-8 space-y-4">
        {labels.features.map(({ label, desc }) => (
          <div key={label} className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
            <div><p className="text-sm font-semibold text-foreground">{label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p></div>
          </div>
        ))}
      </div>
      <LoginPricingSummary language={language} />
    </div>
    <p className="mt-6 border-t border-primary/15 pt-4 text-sm text-muted-foreground">{language === 'ar' ? 'كندا · المغرب · أوروبا' : language === 'en' ? 'Canada · Morocco · Europe' : 'Canada · Maroc · Europe'}</p>
  </aside>
);
export default LoginOverview;
