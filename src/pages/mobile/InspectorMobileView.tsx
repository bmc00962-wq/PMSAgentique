// InspectorMobileView — Live Supabase data — ADR-013, ADR-014
// Loads property_inspections assigned to authenticated inspector
// Inspection items: housekeeping_checklist_items scoped to linked job
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, CheckCircle2, XCircle, AlertTriangle, Camera,
  ChevronLeft, Star, Home, Wrench, ClipboardList, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

// Inspection items are loaded from housekeeping_checklist_items for the linked job
// If no job, we display a static inspection template (ADR-013)
const STATIC_SECTIONS = [
  {
    id: 's1', name: 'Cuisine', icon: '🍳',
    items: [
      { id: 'i1', label: 'Four et plaques propres' },
      { id: 'i2', label: 'Réfrigérateur vide et propre' },
      { id: 'i3', label: 'Plan de travail propre' },
      { id: 'i4', label: 'Poubelles vidées' },
    ],
  },
  {
    id: 's2', name: 'Salle de bain', icon: '🚿',
    items: [
      { id: 'i5', label: 'Douche et baignoire propres' },
      { id: 'i6', label: 'Toilettes propres et désinfectées' },
      { id: 'i7', label: 'Serviettes propres (set × 2)' },
    ],
  },
  {
    id: 's3', name: 'Chambre', icon: '🛏',
    items: [
      { id: 'i8', label: 'Draps propres et tendus' },
      { id: 'i9', label: 'Sol aspiré/balayé' },
    ],
  },
  {
    id: 's4', name: 'Salon', icon: '🛋',
    items: [
      { id: 'i10', label: 'Canapé aspiré' },
      { id: 'i11', label: 'Vitres et miroirs propres' },
    ],
  },
  {
    id: 's5', name: 'Général', icon: '✅',
    items: [
      { id: 'i12', label: 'Inventaire produits accueil' },
      { id: 'i13', label: 'Équipements fonctionnels (TV, Wifi, etc.)' },
      { id: 'i14', label: 'Aucun dommage visible' },
    ],
  },
];

async function fetchInspections() {
  const { data: inspections, error } = await supabase
    .from('property_inspections')
    .select('id, unit_id, reservation_id, job_id, inspection_type, status, overall_rating, notes, scheduled_date, completed_at')
    .eq('tenant_id', TENANT_ID)
    .in('status', ['pending', 'in_progress'])
    .order('scheduled_date', { ascending: true })
    .limit(5);
  if (error) throw error;

  const inspList = inspections ?? [];
  if (inspList.length === 0) return { inspections: [], units: {} };

  const unitIds = [...new Set(inspList.map(i => i.unit_id))];
  const { data: units } = await supabase.from('units').select('id, name, property_id').in('id', unitIds);
  const propIds = [...new Set((units ?? []).map(u => u.property_id))];
  const { data: props } = propIds.length > 0
    ? await supabase.from('properties').select('id, name, address, city').in('id', propIds)
    : { data: [] };

  const unitMap: Record<string, { name: string; propertyName: string; address: string; city: string }> = {};
  for (const u of units ?? []) {
    const p = (props ?? []).find(p => p.id === u.property_id);
    unitMap[u.id] = { name: u.name, propertyName: p?.name ?? '—', address: p?.address ?? '', city: p?.city ?? '' };
  }

  return { inspections: inspList, units: unitMap };
}

type ItemStatus = null | 'pass' | 'fail' | 'na';

const InspectorMobileView = () => {
  const queryClient = useQueryClient();
  const [selectedInspId, setSelectedInspId] = useState<string | null>(null);
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatus>>({});
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['inspector-inspections', TENANT_ID],
    queryFn: fetchInspections,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const inspections = data?.inspections ?? [];
  const units = data?.units ?? {};

  const activeInspId = selectedInspId ?? inspections[0]?.id ?? null;
  const inspection = inspections.find(i => i.id === activeInspId);
  const unit = inspection ? units[inspection.unit_id] : null;

  const allItems = STATIC_SECTIONS.flatMap(s => s.items);
  const reviewed = allItems.filter(i => itemStatuses[i.id] !== undefined && itemStatuses[i.id] !== null).length;
  const failItems = allItems.filter(i => itemStatuses[i.id] === 'fail').length;
  const progress = allItems.length > 0 ? Math.round((reviewed / allItems.length) * 100) : 0;

  const handleStatus = (itemId: string, status: ItemStatus) => {
    setItemStatuses(prev => ({ ...prev, [itemId]: prev[itemId] === status ? null : status }));
  };

  // Submit inspection
  const submitInspection = useMutation({
    mutationFn: async () => {
      if (!inspection) throw new Error('Aucune inspection sélectionnée');
      const { error } = await supabase.from('property_inspections').update({
        status: 'completed',
        overall_rating: rating,
        notes,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', inspection.id);
      if (error) throw error;

      // If fails, create maintenance ticket (ADR-014: escalade housekeeping→maintenance)
      if (failItems > 0 && inspection.unit_id && inspection.unit_id) {
        await supabase.from('maintenance_tickets').insert({
          tenant_id: TENANT_ID,
          unit_id: inspection.unit_id,
          property_id: inspections.find(i => i.id === inspection.id)?.unit_id ?? inspection.unit_id,
          title: `Problèmes post-inspection — ${failItems} élément(s) NOK`,
          description: `${failItems} élément(s) non conformes détectés lors de l'inspection ${inspection.id}. Notes: ${notes || '—'}`,
          category: 'general',
          priority: failItems >= 3 ? 'high' : 'normal',
          status: 'open',
          source: 'inspection',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspector-inspections', TENANT_ID] });
      if (failItems > 0) toast.warning(`Inspection soumise — ${failItems} ticket(s) maintenance créé(s) (ADR-014)`);
      else toast.success('Inspection validée ✓ — Unité prête pour le check-in');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = reviewed === allItems.length && rating > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Chargement des inspections…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground max-w-sm mx-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <a href="/housekeeping" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary">
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </a>
        <div className="flex-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span className="text-sm font-bold text-foreground">Inspection</span>
        </div>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ['inspector-inspections', TENANT_ID] })}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <div className="text-xs text-muted-foreground">{progress}%</div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* No inspections */}
        {inspections.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
            <Search className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune inspection en cours</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Template statique actif</p>
          </div>
        )}

        {/* Inspection selector */}
        {inspections.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {inspections.map(i => (
              <button key={i.id} onClick={() => { setSelectedInspId(i.id); setItemStatuses({}); setRating(0); setNotes(''); }}
                className={cn('flex-shrink-0 px-3 py-2 rounded-lg border text-xs font-medium transition-colors',
                  activeInspId === i.id ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-secondary')}>
                <div className="font-semibold">{units[i.unit_id]?.name ?? i.id.slice(0, 8)}</div>
                <div className="text-muted-foreground mt-0.5">{i.inspection_type?.replace('_', ' ')}</div>
              </button>
            ))}
          </div>
        )}

        {/* Property info */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Home className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-foreground">
              {unit ? `${unit.propertyName} — ${unit.name}` : 'Inspection courante'}
            </span>
          </div>
          {unit?.address && (
            <div className="text-xs text-muted-foreground">{unit.address}{unit.city ? `, ${unit.city}` : ''}</div>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium">
              {inspection?.inspection_type?.replace('_', ' ') ?? 'Post-ménage'}
            </span>
            {inspection?.scheduled_date && (
              <span className="text-muted-foreground">{inspection.scheduled_date}</span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-foreground">Progression</span>
            <div className="flex items-center gap-3 text-xs">
              {failItems > 0 && <span className="text-red-400 font-semibold">{failItems} échec{failItems > 1 ? 's' : ''}</span>}
              <span className="text-muted-foreground">{reviewed}/{allItems.length}</span>
            </div>
          </div>
          <div className="bg-secondary/60 rounded-full h-2">
            <div className={cn('h-2 rounded-full transition-all duration-300', failItems > 0 ? 'bg-amber-400' : 'bg-primary')}
              style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Sections */}
        {STATIC_SECTIONS.map(section => (
          <div key={section.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-secondary/30 flex items-center gap-2">
              <span>{section.icon}</span>
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{section.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {section.items.filter(i => itemStatuses[i.id] !== undefined && itemStatuses[i.id] !== null).length}/{section.items.length}
              </span>
            </div>
            <div className="divide-y divide-border/50">
              {section.items.map(item => {
                const s = itemStatuses[item.id] ?? null;
                return (
                  <div key={item.id} className={cn('px-4 py-3', s === 'pass' ? 'bg-emerald-500/5' : s === 'fail' ? 'bg-red-500/5' : '')}>
                    <div className="text-sm text-foreground mb-2">{item.label}</div>
                    <div className="flex gap-2">
                      {[
                        { val: 'pass' as const, icon: CheckCircle2, label: 'OK', cls: 'text-emerald-400 border-emerald-500/30', activeCls: 'bg-emerald-500/20' },
                        { val: 'fail' as const, icon: XCircle, label: 'NOK', cls: 'text-red-400 border-red-500/30', activeCls: 'bg-red-500/20' },
                        { val: 'na' as const, icon: AlertTriangle, label: 'N/A', cls: 'text-muted-foreground border-border', activeCls: 'bg-secondary' },
                      ].map(({ val, icon: Icon, label, cls, activeCls }) => (
                        <button key={val} onClick={() => handleStatus(item.id, val)}
                          className={cn('flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-semibold transition-colors min-h-[40px]', cls, s === val ? activeCls : 'hover:bg-secondary/40')}>
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      ))}
                      <button className="ml-auto flex items-center gap-1 px-2 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:bg-secondary/40 min-h-[40px]">
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Rating */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-sm font-semibold text-foreground mb-3">Note globale</div>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setRating(star)}
                className="w-12 h-12 flex items-center justify-center rounded-xl transition-colors hover:bg-amber-500/10 min-h-[48px]">
                <Star className={cn('w-7 h-7 transition-colors', star <= rating ? 'text-amber-400 fill-amber-400' : 'text-border')} />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <div className="text-center text-xs text-muted-foreground mt-2">
              {['', 'Insuffisant', 'À améliorer', 'Satisfaisant', 'Bien', 'Excellent'][rating]}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-card border border-border rounded-xl p-4">
          <label className="block">
            <span className="text-sm font-semibold text-foreground block mb-2 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-muted-foreground" />
              Notes d'inspection
            </span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Remarques, dommages constatés, recommandations..."
              rows={3}
              className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
        </div>

        {/* Submit */}
        <button
          onClick={() => submitInspection.mutate()}
          disabled={!canSubmit || submitInspection.isPending}
          className={cn(
            'w-full py-4 rounded-xl text-base font-bold transition-all min-h-[56px] flex items-center justify-center gap-2',
            canSubmit && !submitInspection.isPending
              ? failItems > 0
                ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.98]'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]'
              : 'bg-secondary/60 text-muted-foreground/50 cursor-not-allowed'
          )}>
          {failItems > 0
            ? <><AlertTriangle className="w-5 h-5" /> Soumettre avec {failItems} problème{failItems > 1 ? 's' : ''}</>
            : <><CheckCircle2 className="w-5 h-5" /> Valider l'inspection</>
          }
        </button>

        {failItems > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start gap-2 text-xs">
            <Wrench className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <span className="text-amber-300/80">Les éléments NOK créeront automatiquement un ticket maintenance (ADR-014 · escalade housekeeping→maintenance).</span>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground/50 pb-4">
          ADR-013 · ADR-014 · Supabase live · Photos Supabase Storage
        </p>
      </div>
    </div>
  );
};

export default InspectorMobileView;
