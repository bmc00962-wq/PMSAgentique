import { cn } from '@/lib/utils';
import type { CalendarDay } from '@/types/calendar';

interface DayCellProps {
  day: CalendarDay;
  isToday: boolean;
  onClick: (day: CalendarDay) => void;
  compact?: boolean;
}

const STATUS_BG: Record<string, string> = {
  available:  'bg-emerald-500/10 hover:bg-emerald-500/25 border-emerald-500/10 text-emerald-400',
  reserved:   'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/20 text-blue-300',
  pending:    'bg-yellow-500/15 hover:bg-yellow-500/25 border-yellow-500/20 text-yellow-400',
  blocked:    'bg-orange-500/15 hover:bg-orange-500/25 border-orange-500/20 text-orange-300',
  checkin:    'bg-emerald-600/30 hover:bg-emerald-600/40 border-emerald-500/30 text-emerald-300',
  checkout:   'bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/20 text-purple-300',
};

const DayCell = ({ day, isToday, onClick, compact = false }: DayCellProps) => {
  const style = STATUS_BG[day.status] ?? STATUS_BG.available;

  return (
    <button
      onClick={() => onClick(day)}
      title={day.details ?? day.status}
      className={cn(
        'w-full border rounded transition-colors text-center overflow-hidden',
        compact ? 'h-7' : 'h-9',
        style,
        isToday && 'ring-1 ring-primary ring-offset-1 ring-offset-background',
      )}
    >
      {day.label && (
        <span className={cn('font-semibold leading-none', compact ? 'text-[9px]' : 'text-[10px]')}>
          {day.label}
        </span>
      )}
    </button>
  );
};

export default DayCell;
