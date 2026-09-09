import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChannelConnection } from '@/types/channel';
import { CONNECTION_STATUS_LABELS, CONNECTION_STATUS_COLORS, CHANNEL_DISPLAY } from '@/lib/channelMockData';

interface Props { connection: ChannelConnection; }

const Pill = ({ active, label }: { active: boolean; label: string }) => (
  <span className={cn('text-xs px-2 py-0.5 rounded border flex items-center gap-1 flex-shrink-0',
    active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-secondary text-muted-foreground/50 border-border')}>
    {active ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
    {label}
  </span>
);

const ChannelCard = ({ connection: c }: Props) => {
  const navigate = useNavigate();
  const ch = CHANNEL_DISPLAY[c.channel];
  const lastSync = c.last_sync_at
    ? new Date(c.last_sync_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <button
      onClick={() => navigate(`/channels/${c.id}`)}
      className="w-full text-left bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:bg-card/80 transition-all duration-200 group"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0', ch.bg, ch.color)}>
          {ch.name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{ch.name}</p>
          <p className="text-xs text-muted-foreground truncate">{c.display_name}</p>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0', CONNECTION_STATUS_COLORS[c.status])}>
          {CONNECTION_STATUS_LABELS[c.status]}
        </span>
      </div>

      {c.error_message && (
        <div className="flex items-start gap-2 bg-red-500/8 border border-red-500/20 rounded-lg p-2.5 mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400/80 line-clamp-2">{c.error_message}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-secondary/40 rounded-lg p-2.5">
          <p className="text-xs text-muted-foreground">Listings</p>
          <p className="text-xl font-bold text-foreground">{c.listings_count}</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-2.5">
          <p className="text-xs text-muted-foreground">Derniere sync</p>
          <p className="text-xs font-medium text-foreground">{lastSync}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Pill active={c.auto_confirm} label="Auto-confirm" />
        <Pill active={c.sync_availability} label="Dispo" />
        <Pill active={c.sync_rates} label="Tarifs" />
      </div>
    </button>
  );
};

export default ChannelCard;
