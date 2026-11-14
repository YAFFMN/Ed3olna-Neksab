import { LineChart as LineChartIcon, Activity, Heart } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fixed, formatChartTime, num } from '../utils/format.js';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-[#1d2836] bg-[#070b14]/95 p-3 shadow-2xl backdrop-blur-xl">
      <p className="mb-2 font-mono text-[9px] font-semibold text-[#8fa0b4]">
        {formatChartTime(label)} UTC
      </p>
      {payload.map((item) => {
        const isRate = item.dataKey === 'rate';
        return (
          <div key={item.dataKey} className="flex items-center justify-between gap-4 font-mono text-[10px]">
            <span style={{ color: item.color }}>
              {isRate ? 'RADIATION' : 'HEART RATE'}:
            </span>
            <span className="font-bold text-white tabular-nums">
              {fixed(item.value, isRate ? 1 : 0)} {isRate ? 'µSv/hr' : 'bpm'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function TrendChart({ history = [], latestReading }) {
  const source = history.length ? history : (latestReading ? [latestReading] : []);

  const chartData = source.map((item, index) => ({
    time: item.recorded_at || new Date(Date.now() - (source.length - index) * 2500).toISOString(),
    rate: num(item.radiation_rate_usv_hr),
    heart: num(item.heart_rate_bpm),
  }));

  const maxRate = Math.max(1000, ...chartData.map((d) => d.rate ?? 0));
  const domainMax = Math.ceil((maxRate * 1.15) / 100) * 100;

  return (
    <div className="rcpt-panel p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1d2836] pb-3">
        <div className="flex items-center gap-2">
          <LineChartIcon size={16} className="text-[#17a9f0]" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">Telemetry Trend Window</h3>
            <p className="font-mono text-[9px] text-[#8fa0b4]">RADIATION RATE & CREW VITALS</p>
          </div>
        </div>

        <div className="flex items-center gap-4 font-mono text-[9px]">
          <span className="flex items-center gap-1.5 text-[#17a9f0]">
            <span className="h-2 w-2 rounded-full bg-[#17a9f0]" />
            DOSE RATE (µSv/hr)
          </span>
          <span className="flex items-center gap-1.5 text-[#35d08a]">
            <span className="h-2 w-2 rounded-full bg-[#35d08a]" />
            HEART RATE (bpm)
          </span>
        </div>
      </div>

      <div className="mt-4 h-[260px] w-full">
        {chartData.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-[#8fa0b4]">
            <Activity size={28} className="text-[#1d2836]" />
            <p className="mt-2 text-xs">Waiting for telemetry readings...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={formatChartTime}
                stroke="#8fa0b4"
                tick={{ fill: '#8fa0b4', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={{ stroke: '#1d2836' }}
              />
              <YAxis
                yAxisId="rate"
                domain={[0, domainMax]}
                stroke="#8fa0b4"
                tick={{ fill: '#8fa0b4', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <YAxis
                yAxisId="heart"
                orientation="right"
                domain={[40, 160]}
                stroke="#8fa0b4"
                tick={{ fill: '#8fa0b4', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                yAxisId="rate"
                y={250}
                stroke="#ffb224"
                strokeDasharray="4 4"
                label={{ value: '250 WARNING', fill: '#ffb224', fontSize: 8, position: 'insideTopLeft' }}
              />
              <ReferenceLine
                yAxisId="rate"
                y={1000}
                stroke="#ff5d4d"
                strokeDasharray="4 4"
                label={{ value: '1000 CRITICAL SPE', fill: '#ff5d4d', fontSize: 8, position: 'insideTopLeft' }}
              />
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="rate"
                stroke="#17a9f0"
                strokeWidth={2}
                dot={{ r: 2, fill: '#17a9f0' }}
                activeDot={{ r: 5, fill: '#fff', stroke: '#17a9f0', strokeWidth: 2 }}
                animationDuration={300}
              />
              <Line
                yAxisId="heart"
                type="monotone"
                dataKey="heart"
                stroke="#35d08a"
                strokeWidth={1.5}
                strokeDasharray="3 2"
                dot={{ r: 2, fill: '#35d08a' }}
                activeDot={{ r: 4, fill: '#fff', stroke: '#35d08a', strokeWidth: 2 }}
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
