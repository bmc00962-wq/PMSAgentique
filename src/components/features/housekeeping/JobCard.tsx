import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, CheckSquare, AlertTriangle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HousekeepingJob } from '@/types/housekeeping';
import {
  JOB_STATUS_LABELS, JOB_STATUS_COLORS, JOB_TYPE_LABELS,
  JOB_PRIORITY_COLORS, JOB_PRIORITY_LABELS, JOB_PRIORITY_BORDER,
} from '@/lib/housekeepingMockData';

interface Props { job: HousekeepingJob; }

const JobCard = ({ job: j }: Props) => {
  const navigate = useNavigate();
  const done = j.checklist.filter(c => c.is_completed).length;
  const total = j.checklist.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <button
      onClick={() => navigate(`/housekeeping/${j.id}`)}
      className={cn(
        'w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all duration-200 group border-l-4',
        JOB_PRIORITY_BORDER[j.priority]
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground/50 mb-0.5">{JOB_TYPE_LABELS[j.type]}</p>
          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {j.property_name}
          </p>
          <p className="text-xs text-muted-foreground">{j.unit_name}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', JOB_STATUS_COLORS[j.status])}>
            {JOB_STATUS_LABELS[j.status]}
          </span>
          {j.status === 'issue_reported' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
        </div>
      </div>

      {/* Meta */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            {new Date(j.scheduled_date).toLocaleDateString('fr-CA', { month: 'short', day: 'numeric' })}
          </span>
          {j.scheduled_start && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{j.scheduled_start}</span>
          )}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{j.estimated_duration} min</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {j.housekeeper_name ? (
            <>
              <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', j.housekeeper_color)}>
                {j.housekeeper_initials}
              </div>
              <span className="text-muted-foreground truncate flex-1">{j.housekeeper_name}</span>
            </>
          ) : (
            <>
              <User className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
              <span className="text-muted-foreground/40 italic flex-1">Non assigne</span>
            </>
          )}
          <span className={cn('ml-auto text-xs font-medium flex-shrink-0', JOB_PRIORITY_COLORS[j.priority])}>
            {JOB_PRIORITY_LABELS[j.priority]}
          </span>
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-muted-foreground">
              <CheckSquare className="w-3 h-3" />{done}/{total}
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </button>
  );
};

export default JobCard;
