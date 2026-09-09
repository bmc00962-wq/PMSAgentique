import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import DayCell from './DayCell';
import type { UnitCalendarRow, CalendarDay } from '@/types/calendar';

interface CalendarGridProps {
  rows: UnitCalendarRow[];
  year: number;
  month: number; // 1-indexed
  onDayClick: (unitId: string, day: CalendarDay) => void;
  onPrev: () => void;
  onNext: () => void;
}

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAY_NAMES = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate(); // month is 1-indexed
}

function getDayOfWeek(year: number, month: number, day: number) {
  const d = new Date(year, month - 1, day).getDay();
  return d === 0 ? 6 : d - 1; // Mon=0 … Sun=6
}

function toKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const CalendarGrid = ({ rows, year, month, onDayClick, onPrev, onNext }: CalendarGridProps) => {
  const daysInMonth = getDaysInMonth(year, month);
  const today = new Date().toISOString().slice(0, 10);

  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Month navigator */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <button
          onClick={onPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-semibold">
          {MONTH_NAMES_FR[month - 1]} {year}
        </h3>
        <button
          onClick={onNext}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${180 + daysInMonth * 32}px` }}>

          {/* Day headers */}
          <div className="flex border-b border-border">
            {/* Unit name column */}
            <div className="w-[180px] flex-shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider border-r border-border">
              Unité
            </div>
            {/* Day columns */}
            <div className="flex flex-1">
              {dayNumbers.map(d => {
                const dow = getDayOfWeek(year, month, d);
                const key = toKey(year, month, d);
                const isWeekend = dow >= 5;
                const isTod = key === today;
                return (
                  <div
                    key={d}
                    className={cn(
                      'flex-1 min-w-[28px] text-center py-1.5 border-r border-border/50 last:border-r-0',
                      isWeekend && 'bg-secondary/30',
                      isTod && 'bg-primary/5'
                    )}
                  >
                    <div className={cn('text-[9px] text-muted-foreground/50', isTod && 'text-primary font-semibold')}>
                      {DAY_NAMES[dow]}
                    </div>
                    <div className={cn('text-xs font-semibold leading-none mt-0.5', isTod && 'text-primary')}>
                      {d}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unit rows */}
          {rows.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4 mr-2" />
              Aucune unité pour cette propriété
            </div>
          ) : (
            rows.map((row, i) => (
              <div
                key={row.unit_id}
                className={cn('flex border-b border-border/50 last:border-b-0', i % 2 === 1 && 'bg-secondary/10')}
              >
                {/* Unit info */}
                <div className="w-[180px] flex-shrink-0 px-3 py-2 border-r border-border flex flex-col justify-center">
                  <p className="text-xs font-semibold text-foreground truncate">{row.unit_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{row.property_name}</p>
                  <p className="text-[10px] text-emerald-400 font-mono">{row.base_price} {row.currency}/nuit</p>
                </div>
                {/* Day cells */}
                <div className="flex flex-1 py-1 px-0.5 gap-0.5">
                  {dayNumbers.map(d => {
                    const key = toKey(year, month, d);
                    const dayData = row.days[key] ?? { date: key, status: 'available' as const };
                    const isWeekend = getDayOfWeek(year, month, d) >= 5;
                    return (
                      <div
                        key={d}
                        className={cn('flex-1 min-w-[28px] px-0.5', isWeekend && 'bg-secondary/20 rounded')}
                      >
                        <DayCell
                          day={dayData}
                          isToday={key === today}
                          onClick={day => onDayClick(row.unit_id, day)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-5 py-3 border-t border-border text-xs text-muted-foreground">
        {[
          { color: 'bg-emerald-500/20 border-emerald-500/20', label: 'Disponible' },
          { color: 'bg-blue-500/20 border-blue-500/20', label: 'Réservé' },
          { color: 'bg-yellow-500/15 border-yellow-500/20', label: 'En attente' },
          { color: 'bg-orange-500/15 border-orange-500/20', label: 'Bloqué' },
          { color: 'bg-emerald-600/30 border-emerald-500/30', label: 'Arrivée' },
          { color: 'bg-purple-500/15 border-purple-500/20', label: 'Départ' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn('w-4 h-3 rounded border', color)} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarGrid;
