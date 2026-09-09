import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Globe, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { canUserPerform } from '@/lib/auth';
import type { ChannelFormValues } from '@/types/channel';

const schema = z.object({
  channel:           z.enum(['airbnb', 'booking', 'vrbo', 'ical', 'direct']),
  display_name:      z.string().min(2, 'Nom requis'),
  api_key:           z.string().min(8, 'Cle API invalide (min 8 cars)'),
  auto_confirm:      z.boolean().default(false),
  sync_availability: z.boolean().default(true),
  sync_rates:        z.boolean().default(false),
});

const inp = 'w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors';
const Err = ({ msg }: { msg?: string }) => msg ? <p className="text-xs text-red-400 mt-1">{msg}</p> : null;
const Sect = ({ t }: { t: string }) => <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t}</p>;
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="text-xs font-medium text-foreground">{label}</label><div className="mt-1.5">{children}</div></div>
);

interface Props { onClose: () => void; }

const ChannelForm = ({ onClose }: Props) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ChannelFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { channel: 'airbnb', auto_confirm: false, sync_availability: true, sync_rates: false },
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const onSubmit = async (values: ChannelFormValues) => {
    const auth = await canUserPerform({ user_id: 'demo', tenant_id: 'demo', permission: 'channel.connect' });
    if (!auth.allowed && auth.reason !== 'STUB_DEVELOPMENT') { toast.error('Action non autorisee'); return; }
    console.log('[ChannelForm] stub connect:', values);
    toast.success('Canal connecte (demo — IChannelAdapter active apres backend setup)');
    onClose();
  };

  const Toggle = ({ name, label, desc }: {
    name: keyof Pick<ChannelFormValues, 'auto_confirm' | 'sync_availability' | 'sync_rates'>;
    label: string; desc: string;
  }) => (
    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors">
      <input {...register(name)} type="checkbox" className="mt-0.5 w-4 h-4 rounded accent-primary flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </label>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-card border-l border-border z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Connecter un canal OTA
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Stub actif — IChannelAdapter active apres backend setup</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <Sect t="Plateforme" />
              <div className="space-y-3">
                <Field label="Canal *">
                  <select {...register('channel')} className={inp}>
                    <option value="airbnb">Airbnb</option>
                    <option value="booking">Booking.com</option>
                    <option value="vrbo">Vrbo</option>
                    <option value="ical">iCal (Holidu, HomeAway)</option>
                    <option value="direct">Direct (site web)</option>
                  </select>
                </Field>
                <Field label="Nom d'affichage *">
                  <input {...register('display_name')} placeholder="ex: Airbnb — Portefeuille QC" className={inp} />
                  <Err msg={errors.display_name?.message} />
                </Field>
                <Field label="Cle API *">
                  <input {...register('api_key')} type="password" placeholder="Votre cle secrete OTA" className={inp} />
                  <Err msg={errors.api_key?.message} />
                </Field>
              </div>
            </div>

            <div>
              <Sect t="Options de synchronisation" />
              <div className="space-y-2">
                <Toggle name="sync_availability" label="Synchroniser la disponibilite" desc="Pousser les dates disponibles/bloquees vers l'OTA" />
                <Toggle name="sync_rates" label="Synchroniser les tarifs" desc="Pousser les prix de base et overrides vers l'OTA" />
                <Toggle name="auto_confirm" label="Confirmation automatique" desc="Confirmer directement les reservations OTA sans validation manuelle" />
              </div>
            </div>

            <div className={cn('flex items-start gap-2 rounded-xl p-3', 'bg-amber-500/8 border border-amber-500/20')}>
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80">
                ADR-011 : Le PMS est source de verite. L'OTA ne peut pas modifier directement une reservation <span className="font-mono">confirmed</span>. Import via idempotency_key.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[44px]">
              {isSubmitting ? 'Connexion...' : 'Connecter le canal'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ChannelForm;
