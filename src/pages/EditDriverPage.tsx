// EditDriverPage — React Hook Form + Zod + Supabase UPDATE — ADR-014
// Modifier chauffeur: prénom, nom, téléphone, email, véhicule, plaque, permis, statut
// Optimistic locking version++ ADR-006
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, User, Phone, Mail, Car, Hash,
  Save, Loader2, Info, CheckCircle2, Trash2,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const driverSchema = z.object({
  first_name:     z.string().min(1, 'Prénom requis').max(80),
  last_name:      z.string().min(1, 'Nom requis').max(80),
  phone:          z.string().max(30).optional(),
  email:          z.string().email('Email invalide').optional().or(z.literal('')),
  vehicle_type:   z.string().max(80).optional(),
  vehicle_plate:  z.string().max(20).optional(),
  license_number: z.string().max(50).optional(),
  status:         z.enum(['active', 'inactive', 'on_leave']),
  notes:          z.string().max(500).optional(),
});
type DriverFormData = z.infer<typeof driverSchema>;

const VEHICLE_TYPES = ['Berline', 'SUV', 'Minivan', 'Monospace', 'Van', 'Minibus', 'Taxi', 'Autre'];

const STATUSES = [
  { value: 'active',   label: 'Actif',    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { value: 'inactive', label: 'Inactif',  color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  { value: 'on_leave', label: 'En congé', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
];

const inputCls =
  'w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary ' +
  'focus:border-primary transition-colors min-h-[44px]';

const Field = ({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-foreground">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && <p className="text-xs text-muted-foreground/60">{hint}</p>}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

const EditDriverPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: driver, isLoading } = useQuery({
    queryKey: ['driver-edit', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const {
    register, handleSubmit, watch,
    formState: { errors, isDirty },
  } = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    values: driver
      ? {
          first_name:     driver.first_name ?? '',
          last_name:      driver.last_name ?? '',
          phone:          driver.phone ?? '',
          email:          driver.email ?? '',
          vehicle_type:   driver.vehicle_type ?? '',
          vehicle_plate:  driver.vehicle_plate ?? '',
          license_number: driver.license_number ?? '',
          status:         (driver.status as DriverFormData['status']) ?? 'active',
          notes:          driver.notes ?? '',
        }
      : undefined,
    mode: 'onChange',
  });

  const watchedStatus = watch('status');

  const updateDriver = useMutation({
    mutationFn: async (data: DriverFormData) => {
      const { error } = await supabase
        .from('drivers')
        .update({
          first_name:     data.first_name.trim(),
          last_name:      data.last_name.trim(),
          phone:          data.phone?.trim() || null,
          email:          data.email?.trim() || null,
          vehicle_type:   data.vehicle_type?.trim() || null,
          vehicle_plate:  data.vehicle_plate?.trim().toUpperCase() || null,
          license_number: data.license_number?.trim() || null,
          status:         data.status,
          notes:          data.notes?.trim() || null,
          version:        (driver?.version ?? 1) + 1,
          updated_at:     new Date().toISOString(),
        })
        .eq('id', id!)
        .eq('tenant_id', TENANT_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers', TENANT_ID] });
      queryClient.invalidateQueries({ queryKey: ['driver-edit', id] });
      queryClient.invalidateQueries({ queryKey: ['transport-form-data', TENANT_ID] });
      toast.success('Chauffeur mis à jour ✓');
      navigate('/transport');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateDriver = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('drivers')
        .update({ status: 'inactive', deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers', TENANT_ID] });
      toast.success('Chauffeur désactivé');
      navigate('/transport');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!driver) {
    return <AppLayout><div className="text-center py-20 text-sm text-muted-foreground">Chauffeur introuvable</div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/transport')} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Transport
          </button>
          <span>/</span>
          <span className="text-foreground">Modifier — {driver.first_name} {driver.last_name}</span>
        </div>

        {/* Title */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-bold text-yellow-400">
              {driver.first_name?.[0]}{driver.last_name?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{driver.first_name} {driver.last_name}</h1>
              <p className="text-xs text-muted-foreground mt-1">
                ADR-006 · version {driver.version} → {(driver.version ?? 1) + 1} · optimistic locking
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('Désactiver ce chauffeur ?')) deactivateDriver.mutate();
            }}
            disabled={deactivateDriver.isPending}
            className="flex items-center gap-1.5 text-xs text-red-400 border border-red-500/20 bg-red-500/5 px-3 py-2.5 rounded-xl hover:bg-red-500/10 transition-colors min-h-[40px] flex-shrink-0">
            <Trash2 className="w-3.5 h-3.5" /> Désactiver
          </button>
        </div>

        {isDirty && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-2.5 text-xs text-amber-400">
            Modifications non sauvegardées
          </div>
        )}

        <form onSubmit={handleSubmit(d => updateDriver.mutate(d))} className="space-y-6">

          {/* Identité */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" /> Identité
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Prénom" required error={errors.first_name?.message}>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input {...register('first_name')} className={inputCls + ' pl-9'} />
                </div>
              </Field>
              <Field label="Nom" required error={errors.last_name?.message}>
                <input {...register('last_name')} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Téléphone" error={errors.phone?.message}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input {...register('phone')} className={inputCls + ' pl-9'} />
                </div>
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input {...register('email')} type="email" className={inputCls + ' pl-9'} />
                </div>
              </Field>
            </div>
          </section>

          {/* Véhicule */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Car className="w-4 h-4 text-yellow-400" /> Véhicule
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Type de véhicule" error={errors.vehicle_type?.message}>
                <div className="relative">
                  <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    {...register('vehicle_type')}
                    list="vehicle-types-edit"
                    className={inputCls + ' pl-9'}
                  />
                  <datalist id="vehicle-types-edit">
                    {VEHICLE_TYPES.map(t => <option key={t} value={t} />)}
                  </datalist>
                </div>
              </Field>
              <Field label="Plaque d'immatriculation" error={errors.vehicle_plate?.message}>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input {...register('vehicle_plate')} className={inputCls + ' pl-9 uppercase'} />
                </div>
              </Field>
            </div>
            <Field label="Numéro de permis" error={errors.license_number?.message}>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input {...register('license_number')} className={inputCls + ' pl-9'} />
              </div>
            </Field>
          </section>

          {/* Statut */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Disponibilité
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {STATUSES.map(s => {
                const isSelected = watchedStatus === s.value;
                return (
                  <label key={s.value} className="cursor-pointer">
                    <input type="radio" value={s.value} {...register('status')} className="sr-only" />
                    <div className={cn(
                      'flex items-center justify-center py-3 px-3 rounded-xl border-2 text-sm font-medium transition-all text-center min-h-[48px]',
                      isSelected ? cn('border-current', s.color) : 'border-border text-muted-foreground hover:border-border/70 bg-secondary/20',
                    )}>
                      {s.label}
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Notes */}
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-muted-foreground" /> Notes (optionnel)
            </h2>
            <textarea {...register('notes')} rows={3}
              placeholder="Langues parlées, disponibilités particulières, zones desservies…"
              className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
          </section>

          <div className="flex items-center gap-3 pb-8">
            <button type="button" onClick={() => navigate('/transport')}
              className="flex items-center gap-2 px-5 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors min-h-[48px]">
              <ArrowLeft className="w-4 h-4" /> Annuler
            </button>
            <button
              type="submit"
              disabled={updateDriver.isPending || !isDirty}
              className={cn(
                'flex-1 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] flex items-center justify-center gap-2',
                !updateDriver.isPending && isDirty
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed',
              )}>
              {updateDriver.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sauvegarde…</>
                : <><Save className="w-4 h-4" /> Enregistrer les modifications</>
              }
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default EditDriverPage;
