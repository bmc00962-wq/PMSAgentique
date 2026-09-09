import { cn } from '@/lib/utils';
import type { LedgerEntry } from '@/types/finance';
import {
  ENTRY_TYPE_LABELS, ENTRY_TYPE_COLORS, ENTRY_STATUS_LABELS, CURRENCY_SYMBOL
} from '@/lib/financeMockData';

interface Props { entry: LedgerEntry; }

const LedgerEntryRow = ({ entry: e }: Props) => {
  const isPositive = e.amount > 0;
  const symbol = CURRENCY_SYMBOL[e.currency] ?? e.currency;
  return (
    <tr className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
      <td className="py-3 px-4 text-xs text-muted-foreground font-mono">{e.entry_date}</td>
      <td className="py-3 px-4">
        <div className="text-xs font-medium text-foreground leading-tight">{e.label}</div>
        {e.property_name && <div className="text-xs text-muted-foreground mt-0.5">{e.property_name}{e.unit_name ? ` · ${e.unit_name}` : ''}</div>}
      </td>
      <td className="py-3 px-4">
        <span className={cn('text-xs font-medium', ENTRY_TYPE_COLORS[e.entry_type])}>
          {ENTRY_TYPE_LABELS[e.entry_type]}
        </span>
      </td>
      <td className="py-3 px-4">
        {e.channel && (
          <span className="text-xs bg-secondary border border-border px-2 py-0.5 rounded-full capitalize">
            {e.channel}
          </span>
        )}
      </td>
      <td className="py-3 px-4">
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full border',
          e.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : e.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        )}>
          {ENTRY_STATUS_LABELS[e.status]}
        </span>
      </td>
      <td className={cn(
        'py-3 px-4 text-right text-sm font-bold font-mono',
        isPositive ? 'text-emerald-400' : 'text-rose-400'
      )}>
        {isPositive ? '+' : ''}{e.amount.toFixed(2)} {symbol}
      </td>
    </tr>
  );
};

export default LedgerEntryRow;
