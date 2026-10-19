import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '@/lib/auth';
import type { LoginCopy } from '@/constants/loginLabels';
import type { LoginFields, LoginMode } from '@/types/login';

export function useLoginActions(labels: LoginCopy) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>('login');
  const [otpSent, setOtpSent] = useState(false);
  const mutation = useMutation({
    mutationFn: async (fields: LoginFields) => {
      if (mode === 'login') {
        await authService.signInWithPassword(fields.email, fields.password);
        return 'login' as const;
      }
      if (!otpSent) {
        await authService.sendOtp(fields.email);
        return 'otp' as const;
      }
      await authService.verifyOtpAndSetPassword(fields.email, fields.otp, fields.password);
      return 'register' as const;
    },
    onSuccess: (result, fields) => {
      if (result === 'otp') {
        setOtpSent(true);
        toast.success(labels.codeSent(fields.email));
      } else navigate(result === 'login' ? '/dashboard' : '/onboarding');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const changeMode = (next: LoginMode) => {
    if (mutation.isPending) return;
    setMode(next);
    setOtpSent(false);
    mutation.reset();
  };
  return { mode, otpSent, changeMode, loading: mutation.isPending, submit: mutation.mutate };
}
