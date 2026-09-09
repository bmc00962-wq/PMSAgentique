import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { TenantSettingsFormValues } from '@/types/settings';
import { TIMEZONE_OPTIONS, LANGUAGE_LABELS, CURRENCY_LABELS } from '@/lib/settingsMockData';

const schema = z.object({
  company_name: z.string().min(2, 'Nom requis (min. 2 caractères)'),
  contact_email: z.string().email('Email invalide'),
  contact_phone: z.string().optional().default(''),
  website: z.string().url('URL invalide').or(z.literal('')).default(''),
  default_language: z.enum(['fr', 'en', 'ar']),
  default_currency: z.enum(['CAD', 'EUR', 'USD', 'MAD']),
  timezone: z.string().min(1, 'Timezone requise'),
  default_check_in_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
  default_check_out_time: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis'),
  minimum_stay_nights: z.number().min(1).max(30),
  management_fee_pct: z.number().min(0).max(50),
  tax_id: z.string().optional().default(''),
});

interface Props {
  defaultValues: TenantSettingsFormValues;
  onSave?: (values: TenantSettingsFormValues) => void;
}

const TenantSettingsForm = ({ defaultValues, onSave }: Props) => {
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<TenantSettingsFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = (values: TenantSettingsFormValues) => {
    console.log('[TenantSettingsForm] save:', values);
    toast.success('Paramètres sauvegardés avec succès');
    onSave?.(values);
  };

  const fieldClass = 'w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50';
  const labelClass = 'block text-xs font-medium text-muted-foreground mb-1.5';
  const errorClass = 'text-xs text-rose-400 mt-1';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

      {/* General */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">Informations générales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nom de l'entreprise *</label>
            <input {...register('company_name')} className={fieldClass} placeholder="Gestion Soleil Inc." />
            {errors.company_name && <p className={errorClass}>{errors.company_name.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Email de contact *</label>
            <input {...register('contact_email')} type="email" className={fieldClass} placeholder="admin@exemple.ca" />
            {errors.contact_email && <p className={errorClass}>{errors.contact_email.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input {...register('contact_phone')} className={fieldClass} placeholder="+1 514 555 0100" />
          </div>
          <div>
            <label className={labelClass}>Site web</label>
            <input {...register('website')} className={fieldClass} placeholder="https://exemple.ca" />
            {errors.website && <p className={errorClass}>{errors.website.message}</p>}
          </div>
        </div>
      </section>

      {/* Localization */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">Localisation</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Langue par défaut *</label>
            <select {...register('default_language')} className={fieldClass}>
              {Object.entries(LANGUAGE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Devise par défaut *</label>
            <select {...register('default_currency')} className={fieldClass}>
              {Object.entries(CURRENCY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Fuseau horaire *</label>
            <select {...register('timezone')} className={fieldClass}>
              {TIMEZONE_OPTIONS.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            {errors.timezone && <p className={errorClass}>{errors.timezone.message}</p>}
          </div>
        </div>
      </section>

      {/* Operations */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">Opérations</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Check-in par défaut *</label>
            <input {...register('default_check_in_time')} className={fieldClass} placeholder="15:00" />
            {errors.default_check_in_time && <p className={errorClass}>{errors.default_check_in_time.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Check-out par défaut *</label>
            <input {...register('default_check_out_time')} className={fieldClass} placeholder="11:00" />
            {errors.default_check_out_time && <p className={errorClass}>{errors.default_check_out_time.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Séjour minimum (nuits) *</label>
            <input {...register('minimum_stay_nights', { valueAsNumber: true })} type="number" min={1} max={30} className={fieldClass} />
            {errors.minimum_stay_nights && <p className={errorClass}>{errors.minimum_stay_nights.message}</p>}
          </div>
        </div>
      </section>

      {/* Finance */}
      <section>
        <h3 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border">Finances</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Frais de gestion (%) *</label>
            <input {...register('management_fee_pct', { valueAsNumber: true })} type="number" step="0.5" min={0} max={50} className={fieldClass} />
            {errors.management_fee_pct && <p className={errorClass}>{errors.management_fee_pct.message}</p>}
            <p className="text-xs text-muted-foreground/60 mt-1">Appliqué sur les relevés propriétaires (ADR-015)</p>
          </div>
          <div>
            <label className={labelClass}>N° fiscal / TPS/TVQ</label>
            <input {...register('tax_id')} className={fieldClass} placeholder="QC-0000000000" />
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={!isDirty}
          className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
        >
          <Save className="w-4 h-4" />
          Sauvegarder les modifications
        </button>
      </div>
    </form>
  );
};

export default TenantSettingsForm;
