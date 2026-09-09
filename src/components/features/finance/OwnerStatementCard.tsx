import { useNavigate } from 'react-router-dom';
import { FileText, Mail, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OwnerStatement } from '@/types/finance';
import {
  STATEMENT_STATUS_LABELS, STATEMENT_STATUS_COLORS, CURRENCY_SYMBOL
} from '@/lib/financeMockData';

interface Props { statement: OwnerStatement; }

const OwnerStatementCard = ({ statement: s }: Props) => {
  const navigate = useNavigate();
  const symbol = CURRENCY_SYMBOL[s.currency] ?? s.currency;

  return (
    <button
      onClick={() => navigate(`/finance/statements/${s.id}`)}
      className="w-full text-left bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              {s.owner_name}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{s.period_month} · {s.property_names.join(' + ')}</p>
        </div>
        <span className={cn('text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0', STATEMENT_STATUS_COLORS[s.status])}>
          {STATEMENT_STATUS_LABELS[s.status]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-secondary/40 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{s.gross_revenue.toLocaleString('fr')} {symbol}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Loyer brut</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-rose-400">{Math.abs(s.total_deductions).toLocaleString('fr')} {symbol}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Déductions</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-primary">{s.net_payout.toLocaleString('fr')} {symbol}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Net propriétaire</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Fee gestion : {(s.management_fee_pct * 100).toFixed(0)}%</span>
        <div className="flex items-center gap-3">
          {s.status === 'sent' && (
            <span className="flex items-center gap-1 text-blue-400">
              <Mail className="w-3 h-3" /> Envoyé {s.sent_at ? new Date(s.sent_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' }) : ''}
            </span>
          )}
          {s.status === 'acknowledged' && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Accusé de réception
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default OwnerStatementCard;
