import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/communication';
import { CONV_CHANNEL_DISPLAY } from '@/lib/communicationMockData';

interface Props {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const ConversationCard = ({ conversation: c, isSelected, onClick }: Props) => {
  const ch = CONV_CHANNEL_DISPLAY[c.channel];
  const time = new Date(c.last_message_at).toLocaleString('fr-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border/50 transition-colors last:border-b-0',
        isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
          {c.guest_initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-xs font-semibold text-foreground truncate">{c.guest_name}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {c.unread_count > 0 && (
                <span className="w-4 h-4 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center leading-none">
                  {c.unread_count}
                </span>
              )}
              <span className="text-xs text-muted-foreground/50">{time}</span>
            </div>
          </div>
          <p className="text-xs font-medium text-foreground/70 truncate mb-1">{c.subject}</p>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">{c.last_message}</p>
          <div className="flex items-center gap-2">
            <span className={cn('text-xs font-medium', ch?.color)}>{ch?.label}</span>
            {c.property_name && (
              <span className="text-xs text-muted-foreground/40 truncate">· {c.property_name}</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

export default ConversationCard;
