import { cn } from '@/lib/utils';
import type { MessageTemplate } from '@/types/communication';
import {
  TEMPLATE_CATEGORY_LABELS, TEMPLATE_CATEGORY_COLORS, CONV_CHANNEL_DISPLAY,
} from '@/lib/communicationMockData';

interface Props { template: MessageTemplate; }

const TemplateCard = ({ template: t }: Props) => (
  <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors">
    <div className="flex items-center gap-2 mb-3">
      <span className={cn('text-xs px-2 py-0.5 rounded border font-medium flex-shrink-0', TEMPLATE_CATEGORY_COLORS[t.category])}>
        {TEMPLATE_CATEGORY_LABELS[t.category] ?? t.category}
      </span>
      <span className="text-xs text-muted-foreground ml-auto uppercase font-mono">{t.language}</span>
    </div>

    <p className="text-sm font-semibold text-foreground mb-1">{t.name}</p>
    <p className="text-xs text-muted-foreground/60 italic mb-2 truncate">{t.subject}</p>
    <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
      {t.body.replace(/\n/g, ' ')}
    </p>

    <div className="flex items-center gap-3 pt-3 border-t border-border/50">
      <span className="text-xs text-muted-foreground/60">
        {t.variables.length} variable{t.variables.length !== 1 ? 's' : ''}
      </span>
      <div className="flex gap-1.5 ml-auto flex-wrap justify-end">
        {t.channels.map(ch => (
          <span key={ch} className={cn('text-xs font-medium', CONV_CHANNEL_DISPLAY[ch]?.color)}>
            {CONV_CHANNEL_DISPLAY[ch]?.label}
          </span>
        ))}
      </div>
    </div>
  </div>
);

export default TemplateCard;
