import { ShieldCheck, Users, Building2 } from 'lucide-react';
import type { LoginCopy } from '@/constants/loginLabels';

interface LoginInformationProps { labels: LoginCopy }
const LoginInformation = ({ labels: l }: LoginInformationProps) => (
  <div className="mt-6 space-y-3">
    <section className="rounded-xl border border-primary/15 bg-accent/40 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Building2 className="h-4 w-4 text-primary" />{l.howItWorksTitle}</h3>
      <ol className="space-y-2">
        {l.howItWorksSteps.map((step, index) => <li key={step} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">{index + 1}</span>{step}</li>)}
      </ol>
      <p className="mt-3 border-t border-primary/15 pt-3 text-xs leading-relaxed text-muted-foreground">{l.howItWorksFooter}</p>
    </section>
    <section className="rounded-xl border border-border bg-background p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Users className="h-4 w-4 text-primary" />{l.rolesTitle}</h3>
      <div className="grid grid-cols-2 gap-2">{l.roleLabels.map(role => <span key={role} className="rounded-lg border border-primary/15 bg-accent/50 px-2 py-2 text-xs font-medium text-primary">{role}</span>)}</div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{l.rolesFooter}</p>
    </section>
    <section className="rounded-xl border border-border bg-secondary/40 p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldCheck className="h-4 w-4 text-primary" />{l.superAdminTitle}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">{l.superAdminDesc}</p>
      <p className="mt-1 text-xs text-muted-foreground">platform_super_admin</p>
    </section>
  </div>
);
export default LoginInformation;
