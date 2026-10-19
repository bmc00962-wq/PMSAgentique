import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, AlertCircle, KeyRound } from 'lucide-react';
import type { LoginCopy } from '@/constants/loginLabels';
import type { LoginFields, LoginMode } from '@/types/login';

interface LoginCredentialsFormProps {
  labels: LoginCopy; mode: LoginMode; otpSent: boolean; loading: boolean;
  onSubmit: (fields: LoginFields) => void;
}
const LoginCredentialsForm = ({ labels: l, mode, otpSent, loading, onSubmit }: LoginCredentialsFormProps) => {
  const needsPassword = mode === 'login' || otpSent;
  const schema = useMemo(() => z.object({
    email: z.string().trim().email(l.invalidEmail),
    password: needsPassword ? z.string().min(6, l.invalidPassword) : z.string(),
    otp: mode === 'register' && otpSent ? z.string().regex(/^\d{4}$/, l.invalidOtp) : z.string(),
  }), [mode, otpSent, needsPassword, l]);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFields>({
    resolver: zodResolver(schema), defaultValues: { email: '', password: '', otp: '' },
  });
  useEffect(() => { setValue('password', ''); setValue('otp', ''); }, [mode, setValue]);
  const inputClass = 'w-full min-h-[48px] rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary disabled:opacity-60';
  const actionLabel = mode === 'login' ? (loading ? l.signinLoading : l.signin) : otpSent ? (loading ? l.creatingLoading : l.createAccount) : (loading ? l.sending : l.sendCode);
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label htmlFor="login-email" className="text-sm font-medium text-foreground">{l.email}</label>
        <input id="login-email" type="email" autoComplete="email" placeholder="vous@exemple.com" readOnly={mode === 'register' && otpSent} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'login-email-error' : undefined} className={inputClass} {...register('email')} />
        {errors.email && <p id="login-email-error" role="alert" className="flex items-center gap-2 text-sm text-danger"><AlertCircle className="h-4 w-4 shrink-0" />{errors.email.message}</p>}
      </div>
      {mode === 'register' && otpSent && (
        <div className="space-y-4">
          <p className="rounded-xl border border-primary/15 bg-accent/60 p-3 text-sm text-primary">{l.otpHint}</p>
          <div className="space-y-2">
            <label htmlFor="login-otp" className="text-sm font-medium text-foreground">{l.otp}</label>
            <input id="login-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={4} placeholder="_ _ _ _" aria-invalid={!!errors.otp} aria-describedby={errors.otp ? 'login-otp-error' : undefined} className={`${inputClass} text-center tracking-[0.5em]`} {...register('otp', { onChange: event => setValue('otp', String(event.target.value).replace(/\D/g, '').slice(0, 4)) })} />
            {errors.otp && <p id="login-otp-error" role="alert" className="flex items-center gap-2 text-sm text-danger"><AlertCircle className="h-4 w-4 shrink-0" />{errors.otp.message}</p>}
          </div>
        </div>
      )}
      {needsPassword && (
        <div className="space-y-2">
          <label htmlFor="login-password" className="text-sm font-medium text-foreground">{mode === 'login' ? l.password : l.newPassword}</label>
          <input id="login-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="••••••••" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'login-password-error' : undefined} className={inputClass} {...register('password')} />
          {errors.password && <p id="login-password-error" role="alert" className="flex items-center gap-2 text-sm text-danger"><AlertCircle className="h-4 w-4 shrink-0" />{errors.password.message}</p>}
        </div>
      )}
      <button type="submit" disabled={loading} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-base font-semibold text-primary-foreground transition-transform duration-150 hover:opacity-90 active:scale-[0.99] disabled:opacity-60">
        {mode === 'register' && !otpSent && <KeyRound className="h-4 w-4" />}{actionLabel}{!loading && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
};
export default LoginCredentialsForm;
