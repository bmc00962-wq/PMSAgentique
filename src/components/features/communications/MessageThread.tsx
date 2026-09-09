import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/communication';
import { CONV_STATUS_LABELS, CONV_STATUS_COLORS, CONV_CHANNEL_DISPLAY } from '@/lib/communicationMockData';

interface Props { conversation: Conversation; }

const SENDER_STYLE: Record<string, string> = {
  guest:  'bg-secondary border border-border text-foreground self-start max-w-[75%]',
  agent:  'bg-primary/15 border border-primary/25 text-foreground self-end max-w-[75%]',
  system: 'bg-yellow-500/8 border border-yellow-500/20 text-yellow-400/80 self-center text-xs italic w-full text-center',
};

const MessageThread = ({ conversation: c }: Props) => {
  const ch = CONV_CHANNEL_DISPLAY[c.channel];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-4 border-b border-border flex-shrink-0 bg-card/50">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{c.guest_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.subject}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={cn('text-xs font-medium', ch?.color)}>{ch?.label}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded border font-medium', CONV_STATUS_COLORS[c.status])}>
              {CONV_STATUS_LABELS[c.status]}
            </span>
          </div>
        </div>
        {c.property_name && (
          <p className="text-xs text-muted-foreground/50 mt-1">📍 {c.property_name}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
        {c.messages.map(m => (
          <div key={m.id} className={cn('rounded-xl p-3 text-xs leading-relaxed', SENDER_STYLE[m.sender])}>
            <div className="flex items-center gap-2 mb-1 opacity-60">
              <span className="font-medium">{m.sender_name}</span>
              <span>·</span>
              <span>{new Date(m.sent_at).toLocaleString('fr-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p>{m.content}</p>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-2 bg-secondary/40 border border-border rounded-xl px-4 py-3 text-xs text-muted-foreground/50">
          <span className="flex-1">Répondre... (stub — Edge Function après backend setup)</span>
        </div>
      </div>
    </div>
  );
};

export default MessageThread;
