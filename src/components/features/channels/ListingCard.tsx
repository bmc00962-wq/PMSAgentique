import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChannelListing } from '@/types/channel';
import { LISTING_STATUS_LABELS, LISTING_STATUS_COLORS, CHANNEL_DISPLAY } from '@/lib/channelMockData';

interface Props { listing: ChannelListing; }

const ListingCard = ({ listing: l }: Props) => {
  const ch = CHANNEL_DISPLAY[l.channel];
  const lastSync = l.last_sync_at
    ? new Date(l.last_sync_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })
    : '—';

  return (
    <div className="bg-secondary/30 border border-border rounded-xl p-4 hover:border-border/80 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground line-clamp-1">{l.title}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{l.external_listing_id}</p>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0', LISTING_STATUS_COLORS[l.status])}>
          {LISTING_STATUS_LABELS[l.status]}
        </span>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        {l.property_name} · <span className="text-foreground/70">{l.unit_name}</span>
      </p>

      <div className="flex items-center gap-3 text-xs mb-2">
        <span className="text-emerald-400 font-bold font-mono">
          {l.base_price.toLocaleString()} {l.currency}/n
        </span>
        <span className="text-muted-foreground">min {l.min_nights}n — max {l.max_nights}n</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
        <Clock className="w-3 h-3 flex-shrink-0" />
        <span>Sync: {lastSync}</span>
        <span className={cn('ml-auto', ch.color)}>{ch.name}</span>
      </div>
    </div>
  );
};

export default ListingCard;
