import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Lock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { canUserPerform } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { MOCK_UNITS } from '@/lib/mockData';
import type { BlockFormValues } from '@/types/calendar';

const schema = z.object({
  unit_id: z.string().min(1, 'Unité requise'),
  block_type: z.enum(['owner_block', 'maintenance', 'gap_block', 'preparation']),
  start_date: z.string().min(10, 'Date requise'),
  end_date: z.string().min(10, 'Date requise'),
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

const BLOCK_TYPES = [
  { value: 'owner_block', label: '🏠 Réservé propriétaire', desc: 'Usage personnel du propriétaire' },
  { value: 'maintenance', label: '🔧 Maintenance', desc: 'Travaux, réparations, entretien' },
  { value: 'preparation', label: '✨ Préparation', desc: 'Nettoyage profond, setup' },
  { value: 'gap_block', label: '⛔ Blocage manuel', desc: 'Blocage arbitraire' },
];

const BlockForm = ({ unitId, startDate, onClose }: Props) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BlockFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      unit_id: unitId ?? '',
      block_type: 'owner_block',
      start_date: startDate ?? new Date().toISOString().slice(0, 10),
      end_date: startDate ?? new Date().toISOString().slice(0, 10),
      reason: '',
    },
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const onSubmit = async (values: BlockFormValues) => {
    const auth = await canUserPerform({ user_id: 'demo', tenant_id: 'demo', permission: 'calendar.block' });
    if (!auth.allowed && auth.reason !== 'STUB_DEVELOPMENT') { toast.error('Action non autorisée'); return; }
    console.log('[BlockForm] stub create block:', values);
    toast.success('Blocage créé (démo — persistance après backend setup)');
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
              <Lock className="w-4 h-4 text-orange-400" /> Nouveau blocage
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
              <Label>Unité</Label>
              <select {...register('unit_id')} className={inputCls}>
                <option value="">— Sélectionner une unité —</option>
                {MOCK_UNITS.filter(u => u.status !== 'inactive').map(u => (
                  <option key={u.id} value={u.id}>{u.name} (prop. {u.property_id.replace('prop-', '#')})</option>
                ))}
              </select>
              <Err msg={errors.unit_id?.message} />
            </div>

            <div>
              <Label>Type de blocage</Label>
              <div className="space-y-2">
                {BLOCK_TYPES.map(({ value, label, desc }) => (
                  <label key={value} className="flex items-start gap-3 cursor-pointer group">
                    <input type="radio" {...register('block_type')} value={value} className="mt-1 accent-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <Err msg={errors.block_type?.message} />
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
              <Label>Raison / Note interne</Label>
              <textarea {...register('reason')} rows={3} placeholder="Motif du blocage…" className={cn(inputCls, 'resize-none')} />
            </div>

            <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400/80">La sauvegarde persistante nécessite le backend Supabase. Contrôle de concurrence via <span className="font-mono">calendar_availability</span> table + pessimistic lock.</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors min-h-[44px]">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-semibold bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors min-h-[44px]">
              {isSubmitting ? 'Création…' : 'Créer le blocage'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default BlockForm;
