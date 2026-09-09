import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, DollarSign, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { canUserPerform } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { MOCK_UNITS } from '@/lib/mockData';
import type { RateFormValues } from '@/types/calendar';

const schema = z.object({
  unit_id: z.string().min(1, 'Unité requise'),
  start_date: z.string().min(10, 'Date requise'),
  end_date: z.string().min(10, 'Date requise'),
  price: z.coerce.number().positive('Prix doit être positif'),
  currency: z.string().min(3),
  reason: z.string().default(''),
}).refine(d => d.end_date >= d.start_date, {
  message: 'La date de fin doit être après la date de début',
  path: ['end_date'],
});

const inputCls = "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors";

interface Props {
  unitId?: string;
  startDate?: string;
  onClose: () => void;
}

const RateForm = ({ unitId, startDate, onClose }: Props) => {
  const selectedUnit = MOCK_UNITS.find(u => u.id === unitId);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      unit_id: unitId ?? '',
      start_date: startDate ?? new Date().toISOString().slice(0, 10),
      end_date: startDate ?? new Date().toISOString().slice(0, 10),
      price: selectedUnit?.base_price ?? 0,
      currency: selectedUnit?.currency ?? 'CAD',
      reason: '',
    },
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const onSubmit = async (values: RateFormValues) => {
    const auth = await canUserPerform({ user_id: 'demo', tenant_id: 'demo', permission: 'calendar.write' });
    if (!auth.allowed && auth.reason !== 'STUB_DEVELOPMENT') { toast.error('Action non autorisée'); return; }
    console.log('[RateForm] stub price override:', values);
    toast.success('Tarif mis à jour (démo — persistance après backend setup)');
    onClose();
  };

  const Err = ({ msg }: { msg?: string }) => msg ? <p className="text-xs text-red-400 mt-1">{msg}</p> : null;
  const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{children}</p>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-card border-l border-border z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Ajustement de tarif
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Écrase le prix de base pour la période sélectionnée</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            <div>
              <Label>Unité</Label>
              <select {...register('unit_id')} className={inputCls}>
                <option value="">— Sélectionner une unité —</option>
                {MOCK_UNITS.filter(u => u.status !== 'inactive').map(u => (
                  <option key={u.id} value={u.id}>{u.name} — base {u.base_price} {u.currency}/n</option>
                ))}
              </select>
              <Err msg={errors.unit_id?.message} />
            </div>

            <div>
              <Label>Période</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Début *</label>
                  <input {...register('start_date')} type="date" className={cn(inputCls, 'mt-1.5')} />
                  <Err msg={errors.start_date?.message} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Fin *</label>
                  <input {...register('end_date')} type="date" className={cn(inputCls, 'mt-1.5')} />
                  <Err msg={errors.end_date?.message} />
                </div>
              </div>
            </div>

            <div>
              <Label>Nouveau tarif / nuit</Label>
              <div className="flex gap-2">
                <input
                  {...register('price')}
                  type="number"
                  min={0}
                  step={1}
                  placeholder="125"
                  className={cn(inputCls, 'flex-1')}
                />
                <select {...register('currency')} className={cn(inputCls, 'w-24 flex-shrink-0')}>
                  <option value="CAD">CAD</option>
                  <option value="MAD">MAD</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <Err msg={errors.price?.message} />
              {selectedUnit && (
                <p className="text-xs text-muted-foreground mt-1">
                  Prix de base actuel : <span className="text-foreground font-mono">{selectedUnit.base_price} {selectedUnit.currency}</span>
                </p>
              )}
            </div>

            <div>
              <Label>Raison</Label>
              <select {...register('reason')} className={inputCls}>
                <option value="">— Motif (optionnel) —</option>
                <option value="high_season">Haute saison</option>
                <option value="low_season">Basse saison</option>
                <option value="last_minute">Last minute</option>
                <option value="early_booking">Early booking</option>
                <option value="event">Événement local</option>
                <option value="weekend">Week-end majoré</option>
                <option value="custom">Tarif personnalisé</option>
              </select>
            </div>

            <div className="flex items-start gap-2 bg-blue-500/8 border border-blue-500/20 rounded-xl p-3">
              <DollarSign className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-400/80">
                Le tarif remplacera le prix de base dans la table <span className="font-mono">calendar_rate_override</span>. Priorité : override {'>'} rate_plan {'>'} base_price.
              </p>
            </div>

            <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80">Mode démonstration — persistance après activation du backend Supabase.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors min-h-[44px]">
              {isSubmitting ? 'Application…' : 'Appliquer le tarif'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default RateForm;
