import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { canUserPerform } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { OwnerDisplay, OwnerFormValues } from '@/types/owner';

const schema = z.object({
  first_name: z.string().min(2, 'Minimum 2 caractères'),
  last_name: z.string().min(2, 'Minimum 2 caractères'),
  company_name: z.string().default(''),
  email: z.string().email('Email invalide'),
  phone: z.string().default(''),
  language: z.enum(['fr', 'en', 'ar']),
  country: z.string().min(2),
  city: z.string().min(2, 'Ville requise'),
  address: z.string().default(''),
  postal_code: z.string().default(''),
  tax_number: z.string().default(''),
  notes: z.string().default(''),
});

const inputCls = "w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors";

interface Props { owner?: OwnerDisplay | null; onClose: () => void; }

const OwnerForm = ({ owner, onClose }: Props) => {
  const isEdit = !!owner;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<OwnerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: owner?.first_name ?? '', last_name: owner?.last_name ?? '',
      company_name: owner?.company_name ?? '', email: owner?.email ?? '',
      phone: owner?.phone ?? '', language: owner?.language ?? 'fr',
      country: owner?.country ?? 'CA', city: owner?.city ?? '',
      address: owner?.address ?? '', postal_code: owner?.postal_code ?? '',
      tax_number: owner?.tax_number ?? '', notes: owner?.notes ?? '',
    },
  });

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const onSubmit = async (values: OwnerFormValues) => {
    const auth = await canUserPerform({ user_id: 'demo', tenant_id: 'demo', permission: isEdit ? 'owner.update' : 'owner.create' });
    if (!auth.allowed && auth.reason !== 'STUB_DEVELOPMENT') { toast.error('Action non autorisée'); return; }
    console.log('[OwnerForm] stub save:', values);
    toast.success(isEdit ? 'Propriétaire mis à jour (démo)' : 'Propriétaire créé (démo)');
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
            <h2 className="text-base font-semibold">{isEdit ? 'Modifier le propriétaire' : 'Nouveau propriétaire'}</h2>
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
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Prénom *</label>
                  <input {...register('first_name')} placeholder="Jean" className={cn(inputCls, 'mt-1.5')} />
                  <Err msg={errors.first_name?.message} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Nom *</label>
                  <input {...register('last_name')} placeholder="Dupont" className={cn(inputCls, 'mt-1.5')} />
                  <Err msg={errors.last_name?.message} />
                </div>
              </div>
              <label className="text-xs font-medium text-foreground">Société</label>
              <input {...register('company_name')} placeholder="Gestion ABC Inc." className={cn(inputCls, 'mt-1.5')} />
            </div>

            {/* Contact */}
            <div>
              <Label>Contact</Label>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Email *</label>
                  <input {...register('email')} type="email" placeholder="proprietaire@example.com" className={cn(inputCls, 'mt-1.5')} />
                  <Err msg={errors.email?.message} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Téléphone</label>
                  <input {...register('phone')} placeholder="+1 514 555 0100" className={cn(inputCls, 'mt-1.5')} />
                </div>
              </div>
            </div>

            {/* Localisation */}
            <div>
              <Label>Localisation</Label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Pays *</label>
                    <select {...register('country')} className={cn(inputCls, 'mt-1.5')}>
                      <option value="CA">🇨🇦 Canada</option>
                      <option value="MA">🇲🇦 Maroc</option>
                      <option value="FR">🇫🇷 France</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Langue</label>
                    <select {...register('language')} className={cn(inputCls, 'mt-1.5')}>
                      <option value="fr">🇫🇷 Français</option>
                      <option value="en">🇺🇸 English</option>
                      <option value="ar">🇲🇦 العربية</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Ville *</label>
                  <input {...register('city')} placeholder="Montréal" className={cn(inputCls, 'mt-1.5')} />
                  <Err msg={errors.city?.message} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Adresse</label>
                  <input {...register('address')} placeholder="1234 Rue Principale" className={cn(inputCls, 'mt-1.5')} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">Code postal</label>
                  <input {...register('postal_code')} placeholder="H3G 1M8" className={cn(inputCls, 'mt-1.5')} />
                </div>
              </div>
            </div>

            {/* Fiscal */}
            <div>
              <Label>Informations fiscales</Label>
              <label className="text-xs font-medium text-foreground">N° fiscal / TPS</label>
              <input {...register('tax_number')} placeholder="QC-1234567" className={cn(inputCls, 'mt-1.5')} />
            </div>

            {/* Notes */}
            <div>
              <Label>Notes internes</Label>
              <textarea {...register('notes')} rows={3} placeholder="Préférences, instructions spéciales…" className={cn(inputCls, 'resize-none')} />
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
              {isSubmitting ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer le propriétaire'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default OwnerForm;
