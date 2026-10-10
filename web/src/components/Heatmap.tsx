import type { UseQueryResult } from '@tanstack/react-query'
import type { HeatmapCell, HeatmapResponse } from '../api/types'
import { formatDecimal, formatHourRange, WEEKDAY_LABELS, WEEKDAY_NAMES } from '../lib/format'
import { Panel } from './Panel'
import { QueryState, Skeleton } from './QueryState'

const DAYS = [1, 2, 3, 4, 5, 6, 7]

/** Interpola do verde bem claro ao verde escuro da marca conforme a intensidade (0–1). */
function cellColor(intensity: number): string {
  const from = [236, 246, 242]
  const to = [15, 92, 76]
  const mix = from.map((channel, i) => Math.round(channel + (to[i] - channel) * intensity))
  return `rgb(${mix.join(',')})`
}

interface HeatmapGridData {
  hours: number[]
  byKey: Map<string, HeatmapCell>
  max: number
  peak: HeatmapCell
  busiestDay: { day: number; avg: number }
}

function buildGrid(cells: HeatmapCell[]): HeatmapGridData {
  const hoursWithData = cells.map((cell) => cell.hour)
  const firstHour = Math.min(...hoursWithData)
  const lastHour = Math.max(...hoursWithData)
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i)

  const byKey = new Map(cells.map((cell) => [`${cell.dayOfWeek}-${cell.hour}`, cell]))
  const peak = cells.reduce((best, cell) => (cell.avgConnections > best.avgConnections ? cell : best))

  const totalsByDay = DAYS.map((day) => ({
    day,
    avg: cells.filter((cell) => cell.dayOfWeek === day).reduce((sum, cell) => sum + cell.avgConnections, 0),
  }))
  const busiestDay = totalsByDay.reduce((best, item) => (item.avg > best.avg ? item : best))

  return { hours, byKey, max: peak.avgConnections, peak, busiestDay }
}

function HeatmapGrid({ cells }: { cells: HeatmapCell[] }) {
  const { hours, byKey, max, peak, busiestDay } = buildGrid(cells)

  return (
    <div>
      <p className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900">
        Maior movimento: <strong>{WEEKDAY_NAMES[peak.dayOfWeek]}, {formatHourRange(peak.hour)}</strong>, com
        média de {formatDecimal(peak.avgConnections)} chegadas. O dia mais cheio é{' '}
        <strong>{WEEKDAY_NAMES[busiestDay.day]}</strong> (~{Math.round(busiestDay.avg)} chegadas por dia). Reforce a
        equipe nas faixas mais escuras.
      </p>

      <div className="overflow-x-auto pb-1">
        <table className="w-full min-w-[640px] border-separate border-spacing-[3px] text-xs">
          <caption className="sr-only">
            Média de chegadas por dia da semana e hora. Linhas: dias; colunas: horas.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-10" />
              {hours.map((hour) => (
                <th key={hour} scope="col" className="pb-1 text-center font-medium text-stone-500">
                  {hour}h
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <tr key={day}>
                <th scope="row" className="pr-2 text-left font-medium text-stone-600">
                  {WEEKDAY_LABELS[day]}
                </th>
                {hours.map((hour) => {
                  const avg = byKey.get(`${day}-${hour}`)?.avgConnections ?? 0
                  const intensity = max ? avg / max : 0
                  const label = `${WEEKDAY_NAMES[day]}, ${formatHourRange(hour)}: média de ${formatDecimal(avg)} chegadas`
                  return (
                    <td
                      key={hour}
                      title={label}
                      aria-label={label}
                      className="h-9 rounded-md text-center tabular-nums"
                      style={{
                        backgroundColor: cellColor(intensity),
                        color: intensity > 0.55 ? 'white' : 'rgb(68 64 60)',
                      }}
                    >
                      {avg >= 1 ? Math.round(avg) : ''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-stone-500" aria-hidden="true">
        <span>menos</span>
        <span
          className="h-2 w-28 rounded-full"
          style={{ background: `linear-gradient(to right, ${cellColor(0)}, ${cellColor(1)})` }}
        />
        <span>mais chegadas</span>
      </div>
    </div>
  )
}

export function Heatmap({ query, timezone }: { query: UseQueryResult<HeatmapResponse, Error>; timezone?: string }) {
  return (
    <Panel
      title="Movimento por dia e horário"
      question="Quantas pessoas coloco em cada turno? Números = média de chegadas por hora."
      aside={timezone && <span className="text-xs text-stone-400">Horário da loja ({timezone})</span>}
    >
      <QueryState
        query={query}
        isEmpty={(data) => data.cells.length === 0}
        emptyMessage="Sem conexões no período para montar o mapa de movimento."
        skeleton={<Skeleton className="h-72" />}
      >
        {(data) => <HeatmapGrid cells={data.cells} />}
      </QueryState>
    </Panel>
  )
}
