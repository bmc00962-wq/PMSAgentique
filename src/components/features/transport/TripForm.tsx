import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type { TripFormValues } from '@/types/transport';
import { MOCK_DRIVERS, TRIP_TYPE_LABELS } from '@/lib/transportMockData';
import { canUserPerform } from '@/lib/auth';

const schema = z.object({
  guest_name: z.string().min(2, 'Nom requis'),
  guest_phone: z.string(),
  guest_count: z.number().min(1).max(20),
  property_id: z.string().min(1, 'Propriete requise'),
  type: z.enum(['airport_pickup','airport_dropoff','transfer','activity','custom']),
  scheduled_date: z.string().min(1, 'Date requise'),
  scheduled_time: z.string().min(1, 'Heure requise'),
  pickup_address: z.string().min(3, 'Adresse requise'),
  dropoff_address: z.string().min(3, 'Adresse requise'),
  driver_id: z.string(),
  flight_number: z.string(),
  price_eur: z.number().min(0),
  notes: z.string(),
  reservation_id: z.string(),
});

const PROPERTIES = [
  'Le Loft Mile-End','Maison Plateau Familiale','Studio Cote-des-Neiges',
  'Chalet Mont-Tremblant','Dar Zitoun Marrakech','Villa Hassan II Marrakech',
];

const CLS = "w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary";
const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-medium text-foreground/80 mb-1">{label}</label>
    {children}
    {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
  </div>
);

interface Props { open: boolean; onClose: () => void; }

const TripForm = ({ open, onClose }: Props) => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TripFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'airport_pickup', guest_count: 1, price_eur: 0, notes: '', driver_id: '', flight_number: '', reservation_id: '' },
  });

  useEffect(() => {
    if (!open) { reset(); return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, reset]);

  const onSubmit = async (data: TripFormValues) => {
    const auth = await canUserPerform({ user_id: 'demo', tenant_id: 'demo', permission: 'transport.create' });
    if (!auth.allowed && auth.reason !== 'STUB_DEVELOPMENT') { toast.error('Permission refusee'); return; }
    console.log('[TripForm] submit', data);
    await new Promise(r => setTimeout(r, 500));
    toast.success('Trajet cree (demo — Supabase requis)');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full max-w-md bg-card border-l border-border flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground">Nouveau trajet</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Planifier un transfert voyageur</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <p className="text-xs text-amber-400">Mode demo — donnees non persistees</p>
          </div>
          <Field label="Nom du voyageur *" error={errors.guest_name?.message}>
            <input {...register('guest_name')} placeholder="Marie Cote" className={CLS} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telephone">
              <input {...register('guest_phone')} placeholder="+1 514..." className={CLS} />
            </Field>
            <Field label="Nb personnes" error={errors.guest_count?.message}>
              <input type="number" {...register('guest_count', { valueAsNumber: true })} className={CLS} />
            </Field>
          </div>
          <Field label="Propriete *" error={errors.property_id?.message}>
            <select {...register('property_id')} className={CLS}>
              <option value="">Selectionner...</option>
              {PROPERTIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Type de trajet" error={errors.type?.message}>
            <select {...register('type')} className={CLS}>
              {Object.entries(TRIP_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *" error={errors.scheduled_date?.message}>
              <input type="date" {...register('scheduled_date')} className={CLS} />
            </Field>
            <Field label="Heure *" error={errors.scheduled_time?.message}>
              <input type="time" {...register('scheduled_time')} className={CLS} />
            </Field>
          </div>
          <Field label="Adresse de prise en charge *" error={errors.pickup_address?.message}>
            <input {...register('pickup_address')} placeholder="Aeroport YUL T3" className={CLS} />
          </Field>
          <Field label="Adresse de depose *" error={errors.dropoff_address?.message}>
            <input {...register('dropoff_address')} placeholder="87 rue Bernard..." className={CLS} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="N° de vol">
              <input {...register('flight_number')} placeholder="AC 892" className={CLS} />
            </Field>
            <Field label="Prix (EUR)">
              <input type="number" {...register('price_eur', { valueAsNumber: true })} className={CLS} />
            </Field>
          </div>
          <Field label="Chauffeur">
            <select {...register('driver_id')} className={CLS}>
              <option value="">Non assigne</option>
              {MOCK_DRIVERS.filter(d => d.is_active).map(d => (
                <option key={d.id} value={d.id}>{d.first_name} {d.last_name} — {d.vehicle_model}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <textarea rows={2} {...register('notes')} placeholder="Instructions..." className={`${CLS} resize-none`} />
          </Field>
        </form>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors min-h-[44px]">
            Annuler
          </button>
          <button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}
            className="px-4 py-2.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 min-h-[44px]">
            {isSubmitting ? 'Creation...' : 'Creer le trajet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripForm;
