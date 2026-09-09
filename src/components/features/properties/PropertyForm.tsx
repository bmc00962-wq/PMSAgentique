import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { canUserPerform } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { MOCK_OWNERS } from '@/lib/mockData';
import type { PropertyDisplay, PropertyFormValues } from '@/types/property';

const schema = z.object({
  name: z.string().min(3, 'Minimum 3 caractères'),
  owner_id: z.string().min(1, 'Propriétaire requis'),
  property_type: z.enum(['apartment', 'house', 'villa', 'condo', 'chalet', 'loft', 'studio', 'riad']),
  country: z.string().min(2),
  city: z.string().min(2, 'Ville requise'),
  address: z.string().min(5, 'Adresse requise'),
  postal_code: z.string().default(''),
  total_units: z.coerce.number().int().min(1, 'Au moins 1 unité'),
  default_checkin_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  default_checkout_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  description: z.string().default(''),
});

const inputCls = "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors";

interface Props { property?: PropertyDisplay | null; onClose: () => void; }

const PropertyForm = ({ property, onClose }: Props) => {
  const isEdit = !!property;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PropertyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: property?.name ?? '',
      owner_id: property?.owner_id ?? '',
      property_type: property?.property_type ?? 'apartment',
      country: property?.country ?? 'CA',
      city: property?.city ?? '',
      address: property?.address ?? '',
      postal_code: property?.postal_code ?? '',
      total_units: property?.total_units ?? 1,
      default_checkin_time: property?.default_checkin_time ?? '15:00',
      default_checkout_time: property?.default_checkout_time ?? '11:00',
      description: property?.description ?? '',
    },
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const onSubmit = async (values: PropertyFormValues) => {
    const auth = await canUserPerform({ user_id: 'demo', tenant_id: 'demo', permission: isEdit ? 'property.update' : 'property.create' });
    if (!auth.allowed && auth.reason !== 'STUB_DEVELOPMENT') { toast.error('Action non autorisée'); return; }
    console.log('[PropertyForm] stub save:', values);
    toast.success(isEdit ? 'Propriété mise à jour (démo)' : 'Propriété créée (démo)');
    onClose();
  };

  const Err = ({ msg }: { msg?: string }) => msg ? <p className="text-xs text-red-400 mt-1">{msg}</p> : null;
  const Label = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{children}</p>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-card border-l border-border z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold">{isEdit ? 'Modifier la propriété' : 'Nouvelle propriété'}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Stub actif — persistance après backend setup</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Identité */}
            <div>
              <Label>Identité</Label>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Nom de la propriété *</label>
                  <input {...register('name')} placeholder="Appartement Plateau-Mont-Royal" className={cn(inputCls, 'mt-1.5')} />
                  <Err msg={errors.name?.message} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Propriétaire *</label>
                  <select {...register('owner_id')} className={cn(inputCls, 'mt-1.5')}>
                    <option value="">— Sélectionner —</option>
                    {MOCK_OWNERS.filter(o => o.status !== 'inactive').map(o => (
                      <option key={o.id} value={o.id}>
                        {o.first_name} {o.last_name}{o.company_name ? ` (${o.company_name})` : ''}
                      </option>
                    ))}
                  </select>
                  <Err msg={errors.owner_id?.message} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Type *</label>
                  <select {...register('property_type')} className={cn(inputCls, 'mt-1.5')}>
                    <option value="apartment">Appartement</option>
                    <option value="house">Maison</option>
                    <option value="villa">Villa</option>
                    <option value="condo">Condo</option>
                    <option value="chalet">Chalet</option>
                    <option value="loft">Loft</option>
                    <option value="studio">Studio</option>
                    <option value="riad">Riad</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Localisation */}
            <div>
              <Label>Localisation</Label>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Pays *</label>
                  <select {...register('country')} className={cn(inputCls, 'mt-1.5')}>
                    <option value="CA">🇨🇦 Canada</option>
                    <option value="MA">🇲🇦 Maroc</option>
                    <option value="FR">🇫🇷 France</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Ville *</label>
                  <input {...register('city')} placeholder="Montréal" className={cn(inputCls, 'mt-1.5')} />
                  <Err msg={errors.city?.message} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Adresse *</label>
                  <input {...register('address')} placeholder="3456 Rue Rachel Est" className={cn(inputCls, 'mt-1.5')} />
                  <Err msg={errors.address?.message} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Code postal</label>
                  <input {...register('postal_code')} placeholder="H2H 1X2" className={cn(inputCls, 'mt-1.5')} />
                </div>
              </div>
            </div>

            {/* Configuration */}
            <div>
              <Label>Configuration</Label>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Nombre d'unités *</label>
                  <input {...register('total_units')} type="number" min={1} placeholder="1" className={cn(inputCls, 'mt-1.5')} />
                  <Err msg={errors.total_units?.message} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Check-in *</label>
                    <input {...register('default_checkin_time')} type="time" className={cn(inputCls, 'mt-1.5')} />
                    <Err msg={errors.default_checkin_time?.message} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Check-out *</label>
                    <input {...register('default_checkout_time')} type="time" className={cn(inputCls, 'mt-1.5')} />
                    <Err msg={errors.default_checkout_time?.message} />
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <textarea {...register('description')} rows={3} placeholder="Description de la propriété…" className={cn(inputCls, 'resize-none')} />
            </div>

            <div className="flex items-start gap-2 bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-400">Mode démonstration</p>
                <p className="text-xs text-amber-400/70 mt-0.5">La sauvegarde persistante nécessite le backend Supabase.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm border border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors min-h-[44px]">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors min-h-[44px]">
              {isSubmitting ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer la propriété'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default PropertyForm;
