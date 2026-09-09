import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, BookOpen, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { canUserPerform } from '@/lib/auth';
import { MOCK_UNITS } from '@/lib/mockData';
import type { ReservationFormValues } from '@/types/reservation';

const schema = z.object({
  unit_id:             z.string().min(1, 'Unité requise'),
  check_in:            z.string().min(10, 'Date requise'),
  check_out:           z.string().min(10, 'Date requise'),
  adults:              z.coerce.number().int().min(1, 'Minimum 1 adulte'),
  children:            z.coerce.number().int().min(0).default(0),
  guest_first_name:    z.string().min(1, 'Prénom requis'),
  guest_last_name:     z.string().min(1, 'Nom requis'),
  guest_email:         z.string().email('Email invalide'),
  guest_phone:         z.string().default(''),
  guest_country:       z.string().min(2, 'Pays requis'),
  channel:             z.enum(['airbnb', 'booking', 'vrbo', 'direct', 'manual']),
  special_requests:    z.string().default(''),
  internal_notes:      z.string().default(''),
  cancellation_policy: z.enum(['flexible', 'moderate', 'strict', 'non_refundable']),
}).refine(d => d.check_out > d.check_in, {
  message: "Date de départ doit être après l'arrivée", path: ['check_out'],
});

const inp = 'w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors';
const Err = ({ msg }: { msg?: string }) => msg ? <p className="text-xs text-red-400 mt-1">{msg}</p> : null;
const Label = ({ t }: { t: string }) => <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t}</p>;
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><label className="text-xs font-medium text-foreground">{label}</label><div className="mt-1.5">{children}</div></div>
);

interface Props { onClose: () => void; }

const ReservationForm = ({ onClose }: Props) => {
  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ReservationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { channel: 'direct', adults: 1, children: 0, cancellation_policy: 'moderate', check_in: today, check_out: today, guest_country: 'CA' },
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const onSubmit = async (values: ReservationFormValues) => {
    const auth = await canUserPerform({ user_id: 'demo', tenant_id: 'demo', permission: 'reservation.create' });
    if (!auth.allowed && auth.reason !== 'STUB_DEVELOPMENT') { toast.error('Action non autorisée'); return; }
    console.log('[ReservationForm] stub create:', values);
    toast.success('Réservation créée (démo — persistance après backend setup)');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-card border-l border-border z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Nouvelle réservation
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Stub actif — persistance après backend setup</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            <div>
              <Label t="Unité & Dates" />
              <div className="space-y-3">
                <div>
                  <select {...register('unit_id')} className={inp}>
                    <option value="">— Sélectionner une unité —</option>
                    {MOCK_UNITS.filter(u => u.status === 'active').map(u => (
                      <option key={u.id} value={u.id}>{u.name} — {u.base_price} {u.currency}/n</option>
                    ))}
                  </select>
                  <Err msg={errors.unit_id?.message} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Arrivée *"><input {...register('check_in')} type="date" className={inp} /><Err msg={errors.check_in?.message} /></Field>
                  <Field label="Départ *"><input {...register('check_out')} type="date" className={inp} /><Err msg={errors.check_out?.message} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Adultes *"><input {...register('adults')} type="number" min={1} max={20} className={inp} /><Err msg={errors.adults?.message} /></Field>
                  <Field label="Enfants"><input {...register('children')} type="number" min={0} max={10} className={inp} /></Field>
                </div>
              </div>
            </div>

            <div>
              <Label t="Voyageur" />
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prénom *"><input {...register('guest_first_name')} placeholder="Marie" className={inp} /><Err msg={errors.guest_first_name?.message} /></Field>
                  <Field label="Nom *"><input {...register('guest_last_name')} placeholder="Côté" className={inp} /><Err msg={errors.guest_last_name?.message} /></Field>
                </div>
                <Field label="Email *"><input {...register('guest_email')} type="email" placeholder="marie@email.com" className={inp} /><Err msg={errors.guest_email?.message} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Téléphone"><input {...register('guest_phone')} placeholder="+1 514…" className={inp} /></Field>
                  <Field label="Pays *">
                    <select {...register('guest_country')} className={inp}>
                      {[['CA','🇨🇦 Canada'],['MA','🇲🇦 Maroc'],['FR','🇫🇷 France'],['US','🇺🇸 États-Unis'],
                        ['DZ','🇩🇿 Algérie'],['BE','🇧🇪 Belgique'],['CH','🇨🇭 Suisse'],
                        ['MX','🇲🇽 Mexique'],['JP','🇯🇵 Japon'],['GB','🇬🇧 Royaume-Uni']].map(([v,l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <Err msg={errors.guest_country?.message} />
                  </Field>
                </div>
              </div>
            </div>

            <div>
              <Label t="Paramètres" />
              <div className="space-y-3">
                <Field label="Canal de réservation">
                  <select {...register('channel')} className={inp}>
                    <option value="direct">Direct</option>
                    <option value="manual">Manuel (hors ligne)</option>
                    <option value="airbnb">Airbnb</option>
                    <option value="booking">Booking.com</option>
                    <option value="vrbo">Vrbo</option>
                  </select>
                </Field>
                <Field label="Politique d'annulation">
                  <select {...register('cancellation_policy')} className={inp}>
                    <option value="flexible">Flexible — remboursement complet jusqu'à 24h</option>
                    <option value="moderate">Modérée — 50% si {'>'} 5j</option>
                    <option value="strict">Stricte — 50% si {'>'} 7j, 0% sinon</option>
                    <option value="non_refundable">Non remboursable</option>
                  </select>
                </Field>
                <Field label="Demandes spéciales">
                  <textarea {...register('special_requests')} rows={2} placeholder="Arrivée tardive, lit bébé…" className={cn(inp, 'resize-none')} />
                </Field>
                <Field label="Notes internes">
                  <textarea {...register('internal_notes')} rows={2} placeholder="Note visible par l'équipe uniquement…" className={cn(inp, 'resize-none')} />
                </Field>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80">
                Mode démonstration — disponibilité vérifiée via <span className="font-mono">calendar_availability</span> SELECT FOR UPDATE après backend setup (ADR-009).
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[44px]">
              {isSubmitting ? 'Création…' : 'Créer la réservation'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ReservationForm;
