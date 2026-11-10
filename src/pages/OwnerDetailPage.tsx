// OwnerDetailPage — Live Supabase data — ADR-004
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard as Edit, Mail, Phone, MapPin, Globe, Building2, DollarSign, FileText, CalendarDays } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};
const STATUS_LABEL: Record<string, string> = { active: 'Actif', inactive: 'Inactif', pending: 'En attente' };

async function fetchOwnerDetail(id: string, tenantId: string) {
  const [ownerRes, propsRes] = await Promise.all([
    supabase.from('owners').select('*').eq('id', id).eq('tenant_id', tenantId).single(),
    supabase.from('properties').select('id, name, city, country, status, property_type').eq('owner_id', id).eq('tenant_id', tenantId).is('deleted_at', null),
  ]);
  if (ownerRes.error) throw ownerRes.error;

  const props = propsRes.data ?? [];
  const propIds = props.map(p => p.id);

  // Count units per property
  const { data: units } = propIds.length > 0
    ? await supabase.from('units').select('id, property_id').in('property_id', propIds).is('deleted_at', null)
    : { data: [] };
  const unitCount: Record<string, number> = {};
  for (const u of units ?? []) unitCount[u.property_id] = (unitCount[u.property_id] ?? 0) + 1;

  // Statements
  const { data: statements } = await supabase
    .from('owner_statements')
    .select('id, period_start, period_end, total_revenue, net_payout, status, currency, created_at')
    .eq('owner_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  return {
    owner: ownerRes.data,
    properties: props.map(p => ({ ...p, units_count: unitCount[p.id] ?? 0 })),
    statements: statements ?? [],
  };
}

const OwnerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { membership } = useAuth();
  const tenantId = membership?.tenant_id ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['owner-detail', id, tenantId],
    queryFn: () => fetchOwnerDetail(id!, tenantId),
    enabled: !!id && !!tenantId,
    staleTime: 60_000,
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div></AppLayout>;

  if (!data?.owner) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground mb-3">Propriétaire introuvable</p>
          <button onClick={() => navigate('/owners')} className="text-primary text-sm hover:underline">← Retour</button>
        </div>
      </AppLayout>
    );
  }

  const o = data.owner;
  const initials = `${o.first_name[0]}${o.last_name[0]}`;
  const totalRevenue = data.statements.reduce((s, st) => s + Number(st.total_revenue), 0);
  const totalNet = data.statements.reduce((s, st) => s + Number(st.net_payout), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <button onClick={() => navigate('/owners')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Propriétaires
        </button>

        {/* Hero */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-foreground">{o.first_name} {o.last_name}</h1>
                <span className={cn('text-xs px-2.5 py-1 rounded-full border', STATUS_STYLE[o.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {data.properties.length} propriété{data.properties.length !== 1 ? 's' : ''} · {data.statements.length} relevé{data.statements.length !== 1 ? 's' : ''} · Lang : {o.language?.toUpperCase()}
              </p>
            </div>
            <button onClick={() => navigate(`/owners/${id}/edit`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors min-h-[44px]">
              <Edit className="w-3.5 h-3.5" /> Modifier
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Propriétés', value: data.properties.length, color: 'text-blue-400' },
            { label: 'Relevés', value: data.statements.length, color: 'text-purple-400' },
            { label: 'Rev. bruts', value: `${totalRevenue.toFixed(0)} CAD`, color: 'text-emerald-400' },
            { label: 'Net versé', value: `${totalNet.toFixed(0)} CAD`, color: 'text-amber-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className={cn('text-xl font-bold', color)}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Contact</h3>
              <div className="space-y-3">
                {o.email && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <a href={`mailto:${o.email}`} className="text-xs text-primary hover:underline truncate">{o.email}</a>
                  </div>
                )}
                {o.phone && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-foreground">{o.phone}</span>
                  </div>
                )}
                {(o.city || o.country) && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-foreground">{o.city}{o.city && o.country ? ', ' : ''}{o.country}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-foreground">{o.language === 'fr' ? 'Français' : o.language === 'en' ? 'English' : 'العربية'}</span>
                </div>
              </div>
            </div>
            {o.notes && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notes</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{o.notes}</p>
              </div>
            )}
          </div>

          {/* Properties + Statements */}
          <div className="lg:col-span-2 space-y-4">
            {/* Properties */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5" /> Propriétés ({data.properties.length})
                </h3>
                <button onClick={() => navigate('/properties')} className="text-xs text-primary hover:underline">Voir toutes →</button>
              </div>
              {data.properties.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Aucune propriété</p>
              ) : (
                <div className="space-y-2">
                  {data.properties.map(p => (
                    <button key={p.id} onClick={() => navigate(`/properties/${p.id}`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-all text-left">
                      <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.city} · {p.units_count} unité{p.units_count !== 1 ? 's' : ''}</p>
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border flex-shrink-0',
                        p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-secondary text-muted-foreground border-border'
                      )}>{p.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Statements */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5" /> Relevés propriétaire ({data.statements.length})
                </h3>
                <button onClick={() => navigate('/finance/statements')} className="text-xs text-primary hover:underline">Voir tous →</button>
              </div>
              {data.statements.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Aucun relevé généré</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.statements.slice(0, 5).map(s => (
                    <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                      <CalendarDays className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground">{s.period_start} → {s.period_end}</p>
                      </div>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border flex-shrink-0', {
                        draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                        sent: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                        paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                      }[s.status] ?? 'bg-secondary text-muted-foreground border-border')}>{s.status}</span>
                      <span className="text-xs font-bold font-mono text-emerald-400 flex-shrink-0">
                        {Number(s.net_payout).toFixed(0)} {s.currency}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </AppLayout>
  );
};

export default OwnerDetailPage;
