// FinanceStatementsPage — Live Supabase data — ADR-015
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, ArrowLeft, Plus, Send, CheckCircle2, Clock, DollarSign, Download } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import LoadingSpinner from '@/components/features/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  pending_approval: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  sent: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', pending_approval: 'En approbation',
  approved: 'Approuvé', sent: 'Envoyé', paid: 'Payé',
};

async function fetchStatements() {
  const { data, error } = await supabase
    .from('owner_statements')
    .select('id, owner_id, period_start, period_end, total_revenue, total_fees, management_fee, cleaning_fees, maintenance_costs, net_payout, currency, status, sent_at, paid_at, notes, created_at')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const ownerIds = [...new Set((data ?? []).map(s => s.owner_id))];
  const { data: owners } = ownerIds.length > 0
    ? await supabase.from('owners').select('id, first_name, last_name').in('id', ownerIds)
    : { data: [] };
  const ownerMap: Record<string, string> = {};
  for (const o of owners ?? []) ownerMap[o.id] = `${o.first_name} ${o.last_name}`;

  return (data ?? []).map(s => ({ ...s, owner_name: ownerMap[s.owner_id] ?? '—' }));
}

const FinanceStatementsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: statements = [], isLoading } = useQuery({
    queryKey: ['owner-statements', TENANT_ID],
    queryFn: fetchStatements,
    staleTime: 60_000,
  });

  const draft = statements.filter(s => s.status === 'draft').length;
  const sent = statements.filter(s => s.status === 'sent').length;
  const paid = statements.filter(s => s.status === 'paid').length;
  const totalPayout = statements.filter(s => s.status === 'paid').reduce((s, st) => s + Number(st.net_payout), 0);

  const markAsSent = async (stmtId: string) => {
    const { error } = await supabase
      .from('owner_statements')
      .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', stmtId);
    if (error) { console.error('[FinanceStatements]:', error.message); toast.error("Impossible d'enregistrer le relev\u00e9."); return; }
    toast.success('Relevé marqué comme envoyé ✓');
    queryClient.invalidateQueries({ queryKey: ['owner-statements', TENANT_ID] });
  };

  const exportTxt = (stmt: typeof statements[0]) => {
    const lines = [
      `Relevé propriétaire — ${stmt.owner_name}`,
      `Période: ${stmt.period_start} → ${stmt.period_end}`,
      `Revenus totaux: ${Number(stmt.total_revenue).toFixed(2)} ${stmt.currency}`,
      `Frais de gestion: -${Number(stmt.management_fee).toFixed(2)} ${stmt.currency}`,
      `Frais de ménage: -${Number(stmt.cleaning_fees).toFixed(2)} ${stmt.currency}`,
      `Maintenance: -${Number(stmt.maintenance_costs).toFixed(2)} ${stmt.currency}`,
      `Net à verser: ${Number(stmt.net_payout).toFixed(2)} ${stmt.currency}`,
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `releve-${stmt.owner_name.replace(/ /g, '-')}-${stmt.period_start}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4 flex-wrap">
          <button onClick={() => navigate('/finance')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Finance
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Relevés Propriétaires
              <span className="text-sm font-normal bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">{statements.length} relevés</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Générés mensuellement · Révision obligatoire avant envoi (ADR-015)</p>
          </div>
          <button
            onClick={() => navigate('/finance/statements/new')}
            className="flex items-center gap-2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors min-h-[44px]">
            <Plus className="w-3.5 h-3.5" /> Générer relevé
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Brouillons', value: draft, Icon: Clock, color: 'text-slate-400', bg: 'bg-secondary' },
            { label: 'Envoyés', value: sent, Icon: Send, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: 'Payés', value: paid, Icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Total versé', value: `${totalPayout.toLocaleString('fr-CA', { minimumFractionDigits: 2 })} $`, Icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map(({ label, value, Icon, color, bg }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <div>
                <p className={cn('text-xl font-bold', color)}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Statements */}
        {isLoading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : statements.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun relevé généré</p>
            <button onClick={() => navigate('/finance/statements/new')} className="text-xs text-primary mt-2 hover:underline">
              Créer le premier relevé →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {statements.map(stmt => (
              <div key={stmt.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{stmt.owner_name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stmt.period_start} → {stmt.period_end}
                    </p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0', STATUS_COLOR[stmt.status] ?? 'bg-secondary text-muted-foreground border-border')}>
                    {STATUS_LABELS[stmt.status] ?? stmt.status}
                  </span>
                </div>

                {/* Financial breakdown */}
                <div className="space-y-1.5 text-xs">
                  {[
                    { label: 'Revenus totaux', val: stmt.total_revenue, color: 'text-emerald-400' },
                    { label: 'Frais gestion', val: -stmt.management_fee, color: 'text-orange-400' },
                    { label: 'Frais ménage', val: -stmt.cleaning_fees, color: 'text-blue-400' },
                    { label: 'Maintenance', val: -stmt.maintenance_costs, color: 'text-yellow-400' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={cn('font-mono font-medium', color)}>
                        {val >= 0 ? '+' : ''}{Number(val).toLocaleString('fr-CA', { minimumFractionDigits: 2 })} {stmt.currency}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
                    <span className="text-foreground font-semibold">Net à verser</span>
                    <span className="font-bold font-mono text-emerald-400 text-sm">
                      {Number(stmt.net_payout).toLocaleString('fr-CA', { minimumFractionDigits: 2 })} {stmt.currency}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {stmt.status === 'draft' && (
                  <div className="mt-4 pt-3 border-t border-border flex gap-2">
                    <button
                      onClick={() => navigate(`/finance/statements/${stmt.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-secondary border border-border px-3 py-2 rounded-lg hover:bg-secondary/80 transition-colors min-h-[36px]">
                      Voir détails →
                    </button>
                    <button
                      onClick={() => markAsSent(stmt.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors min-h-[36px]">
                      <Send className="w-3 h-3" /> Envoyer
                    </button>
                    <button
                      onClick={() => exportTxt(stmt)}
                      className="flex items-center justify-center gap-1.5 text-xs bg-secondary border border-border px-3 py-2 rounded-lg hover:bg-secondary/80 transition-colors min-h-[36px]">
                      <Download className="w-3 h-3" /> TXT
                    </button>
                  </div>
                )}
                {stmt.sent_at && (
                  <p className="text-xs text-muted-foreground/60 mt-3">
                    Envoyé le {new Date(stmt.sent_at).toLocaleDateString('fr-CA')}
                  </p>
                )}
                {stmt.notes && (
                  <p className="text-xs text-muted-foreground/60 mt-2 border-t border-border/40 pt-2">{stmt.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ADR note */}
        <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 text-xs text-muted-foreground">
          <span className="text-orange-400 font-mono font-semibold">ADR-015 FROZEN</span> — Relevé immutable une fois{' '}
          <span className="font-semibold text-purple-400">envoyé</span> ou{' '}
          <span className="font-semibold text-emerald-400">payé</span>. Correction = nouveau relevé révisé + entrée d'ajustement dans le grand livre (jamais de DELETE).
        </div>
      </div>
    </AppLayout>
  );
};

export default FinanceStatementsPage;
