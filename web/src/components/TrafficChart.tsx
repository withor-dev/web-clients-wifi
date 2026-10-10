import type { UseQueryResult } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrafficResponse } from '../api/types'
import { formatNumber, formatShortDate, WEEKDAY_NAMES } from '../lib/format'
import { Panel } from './Panel'
import { QueryState, Skeleton } from './QueryState'

function weekdayName(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return WEEKDAY_NAMES[day === 0 ? 7 : day]
}

export function TrafficChart({ query }: { query: UseQueryResult<TrafficResponse, Error> }) {
  return (
    <Panel title="Visitantes por dia" question="Como o movimento evoluiu no período?">
      <QueryState
        query={query}
        isEmpty={(data) => data.points.every((point) => point.uniqueVisitors === 0)}
        emptyMessage="Nenhum visitante no período selecionado."
        skeleton={<Skeleton className="h-64" />}
      >
        {(data) => (
          <div className="h-64" role="img" aria-label="Gráfico de visitantes únicos por dia">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.points} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f5c4c" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#0f5c4c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e7e5e4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 12, fill: '#78716c' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis tick={{ fontSize: 12, fill: '#78716c' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(label) => `${weekdayName(String(label))}, ${formatShortDate(String(label))}`}
                  formatter={(value) => [formatNumber(Number(value)), 'Visitantes únicos']}
                  contentStyle={{ borderRadius: 12, borderColor: '#e7e5e4', fontSize: 13 }}
                />
                <Area
                  type="monotone"
                  dataKey="uniqueVisitors"
                  stroke="#0f5c4c"
                  strokeWidth={2}
                  fill="url(#visitorsFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </QueryState>
    </Panel>
  )
}
