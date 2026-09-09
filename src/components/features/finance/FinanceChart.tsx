import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { MonthlyChannelRevenue } from '@/types/finance';

interface Props { data: MonthlyChannelRevenue[]; }

const MONTH_LABELS: Record<string, string> = {
  '2026-03': 'Mars', '2026-04': 'Avr', '2026-05': 'Mai',
  '2026-06': 'Juin', '2026-07': 'Juil', '2026-08': 'Aoûtet',
};

const CHANNEL_COLORS = {
  airbnb: '#f43f5e',
  booking: '#3b82f6',
  vrbo: '#8b5cf6',
  direct: '#10b981',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-foreground mb-2">{MONTH_LABELS[label] ?? label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-muted-foreground capitalize">{p.name}</span>
          </span>
          <span className="font-mono font-semibold text-foreground">{(p.value ?? 0).toLocaleString('fr')} CA$</span>
        </div>
      ))}
      <div className="border-t border-border mt-2 pt-1.5 flex justify-between font-semibold">
        <span className="text-muted-foreground">Total</span>
        <span className="text-foreground">{total.toLocaleString('fr')} CA$</span>
      </div>
    </div>
  );
};

const FinanceChart = ({ data }: Props) => (
  <div className="w-full h-64">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="period"
          tickFormatter={(v) => MONTH_LABELS[v] ?? v}
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.45)' }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          axisLine={false} tickLine={false} width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Legend
          iconType="circle" iconSize={8}
          formatter={(v) => <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }} className="capitalize">{v}</span>}
        />
        <Bar dataKey="airbnb" name="Airbnb" fill={CHANNEL_COLORS.airbnb} radius={[3, 3, 0, 0]} stackId="a" />
        <Bar dataKey="booking" name="Booking" fill={CHANNEL_COLORS.booking} radius={[0, 0, 0, 0]} stackId="a" />
        <Bar dataKey="vrbo" name="Vrbo" fill={CHANNEL_COLORS.vrbo} radius={[0, 0, 0, 0]} stackId="a" />
        <Bar dataKey="direct" name="Direct" fill={CHANNEL_COLORS.direct} radius={[3, 3, 0, 0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default FinanceChart;
