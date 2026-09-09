import { CheckCircle2, Circle, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChecklistItem, ChecklistCategory } from '@/types/housekeeping';
import { CHECKLIST_CATEGORY_LABELS } from '@/lib/housekeepingMockData';

interface Props { items: ChecklistItem[]; }

const CATEGORIES: ChecklistCategory[] = ['chambre', 'salle_de_bain', 'cuisine', 'salon', 'general'];

const Checklist = ({ items }: Props) => {
  const total = items.length;
  const done = items.filter(i => i.is_completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const grouped = items.reduce<Record<string, ChecklistItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div>
      {/* Global progress */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{done}/{total} taches completees</span>
        <span className="text-xs font-bold text-primary">{pct}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden mb-5">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Grouped by category */}
      <div className="space-y-5">
        {CATEGORIES.filter(cat => grouped[cat]?.length > 0).map(cat => {
          const catItems = grouped[cat];
          const catDone = catItems.filter(i => i.is_completed).length;
          return (
            <div key={cat}>
              <h4 className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2 flex items-center gap-2">
                {CHECKLIST_CATEGORY_LABELS[cat]}
                <span className="font-normal normal-case text-muted-foreground/40">
                  {catDone}/{catItems.length}
                </span>
              </h4>
              <div className="space-y-1.5">
                {catItems.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors',
                      item.is_completed
                        ? 'bg-emerald-500/5 border border-emerald-500/10'
                        : 'bg-secondary/30 border border-transparent'
                    )}
                  >
                    {item.is_completed
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      : <Circle className="w-4 h-4 text-muted-foreground/25 flex-shrink-0" />
                    }
                    <span className={cn(
                      'flex-1 leading-relaxed',
                      item.is_completed ? 'text-foreground/50 line-through' : 'text-foreground'
                    )}>
                      {item.task}
                    </span>
                    {item.photo_required && (
                      <Camera className={cn(
                        'w-3.5 h-3.5 flex-shrink-0',
                        item.is_completed ? 'text-emerald-400' : 'text-muted-foreground/30'
                      )} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Checklist;
