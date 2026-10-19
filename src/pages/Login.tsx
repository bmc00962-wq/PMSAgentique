import { Link } from 'react-router-dom';
import { Building2, Globe, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUPPORTED_LANGUAGES, isRTL } from '@/lib/i18n';
import { LOGIN_LABELS } from '@/constants/loginLabels';
import { useI18n } from '@/hooks/useI18n';
import { useLoginActions } from '@/hooks/useLoginActions';
import LoginOverview from '@/components/features/LoginOverview';
import LoginInformation from '@/components/features/LoginInformation';
import LoginCredentialsForm from '@/components/forms/LoginCredentialsForm';

const Login = () => {
  const { language, changeLanguage } = useI18n();
  const l = LOGIN_LABELS[language];
  const { mode, otpSent, loading, changeMode, submit } = useLoginActions(l);
  return (
    <div className="flex min-h-screen bg-background" dir={isRTL(language) ? 'rtl' : 'ltr'}>
      <LoginOverview language={language} labels={l} />
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:p-8 lg:px-12">
        <div className="w-full max-w-[440px] rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <div className="mb-6 flex justify-end">
            <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-1">
              <Globe className="mx-2 h-4 w-4 text-muted-foreground" />
              {SUPPORTED_LANGUAGES.map(({ code, label }) => (
                <button key={code} type="button" aria-label={label} aria-pressed={language === code} onClick={() => changeLanguage(code)} className={cn('min-h-[44px] rounded-lg px-3 text-sm font-medium transition-opacity hover:opacity-80', language === code ? 'bg-accent text-primary' : 'text-muted-foreground')}>{code.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div className="mb-6 flex items-center gap-3 lg:hidden"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary"><Building2 className="h-5 w-5" /></div><p className="text-base font-semibold text-foreground">PMS SaaS Agentique</p></div>
          <h1 className="mb-2 text-2xl font-semibold text-foreground">{mode === 'login' ? l.signin : l.createAccount}</h1>
          <p className="mb-6 text-base text-muted-foreground">{l.subtitle}</p>
          <div className="mb-6 flex rounded-xl border border-border bg-background p-1">
            <button type="button" disabled={loading} aria-pressed={mode === 'login'} onClick={() => changeMode('login')} className={cn('min-h-[44px] flex-1 rounded-lg px-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50', mode === 'login' ? 'bg-accent text-primary' : 'text-muted-foreground')}>{l.signin}</button>
            <button type="button" disabled={loading} aria-pressed={mode === 'register'} onClick={() => changeMode('register')} className={cn('flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50', mode === 'register' ? 'bg-accent text-primary' : 'text-muted-foreground')}><UserPlus className="h-4 w-4" />{l.createAccount}</button>
          </div>
          <LoginCredentialsForm labels={l} mode={mode} otpSent={otpSent} loading={loading} onSubmit={submit} />
          <div className="mt-4 text-center"><button type="button" disabled={loading} onClick={() => changeMode(mode === 'login' ? 'register' : 'login')} className="min-h-[44px] text-sm font-medium text-primary hover:underline disabled:opacity-50">{mode === 'login' ? l.switchToRegister : l.switchToLogin}</button></div>
          <LoginInformation labels={l} />
          <div className="mt-4 text-center"><Link to="/architecture" className="inline-flex min-h-[44px] items-center text-xs text-muted-foreground hover:text-primary">{l.architecture}</Link></div>
          <p className="text-center text-xs text-muted-foreground">Supabase Auth · JWT · RLS · RBAC · ADR-005</p>
        </div>
      </main>
    </div>
  );
};
export default Login;
