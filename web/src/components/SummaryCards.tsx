import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { SummaryResponse } from '../api/types'
import { formatDecimal, formatMinutes, formatNumber, formatRange } from '../lib/format'
import { QueryState, Skeleton } from './QueryState'

interface ChangeBadgeProps {
  value: number | null
  unit: '%' | 'p.p.'
}

function ChangeBadge({ value, unit }: ChangeBadgeProps) {
  if (value === null) {
    return <span className="text-xs text-stone-500">sem dados do período anterior para comparar</span>
  }
  const rounded = Math.round(value * 10) / 10
  const tone =
    rounded > 0 ? 'bg-emerald-50 text-emerald-700' : rounded < 0 ? 'bg-rose-50 text-rose-700' : 'bg-stone-100 text-stone-600'
  const arrow = rounded > 0 ? '▲' : rounded < 0 ? '▼' : '■'
  const sign = rounded > 0 ? '+' : ''
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${tone}`}>
      <span aria-hidden="true" className="text-[0.6rem]">
        {arrow}
      </span>
      {sign}
      {formatDecimal(rounded)}
      {unit === '%' ? '%' : ' p.p.'}
    </span>
  )
}

interface StatCardProps {
  label: string
  question: string
  value: string
  change: ReactNode
  /** Período de comparação; omitido quando não há base (o badge já explica). */
  comparison?: string
  footnote?: ReactNode
}

function StatCard({ label, question, value, change, comparison, footnote }: StatCardProps) {
  return (
    <article className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-medium text-stone-600">{label}</h2>
      <p className="text-xs text-stone-400">{question}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 tabular-nums">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {change}
        {comparison && <span className="text-xs text-stone-500">{comparison}</span>}
      </div>
      {footnote && <div className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">{footnote}</div>}
    </article>
  )
}

function NewVsReturningBar({ newVisitors, returningVisitors }: { newVisitors: number; returningVisitors: number }) {
  const total = newVisitors + returningVisitors
  const returningShare = total ? (returningVisitors / total) * 100 : 0
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-brand-100" aria-hidden="true">
        <div className="bg-brand-600" style={{ width: `${returningShare}%` }} />
      </div>
      <div className="mt-2 flex justify-between">
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-brand-600" />
          {formatNumber(returningVisitors)} voltaram
        </span>
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-brand-100" />
          {formatNumber(newVisitors)} novos
        </span>
      </div>
    </div>
  )
}

const CARD_SKELETON = (
  <div className="grid gap-4 md:grid-cols-3">
    {[0, 1, 2].map((key) => (
      <Skeleton key={key} className="h-44" />
    ))}
  </div>
)

export function SummaryCards({ query }: { query: UseQueryResult<SummaryResponse, Error> }) {
  return (
    <QueryState
      query={query}
      isEmpty={(data) => data.current.uniqueVisitors === 0 && data.previous.uniqueVisitors === 0}
      emptyMessage="Nenhum acesso ao Wi-Fi registrado neste período."
      skeleton={CARD_SKELETON}
      stateClassName="rounded-2xl border border-stone-200 bg-white shadow-sm"
    >
      {(data) => {
        const { current, change, previousPeriod } = data
        const range = `vs. ${formatRange(previousPeriod.from, previousPeriod.to)}`
        const comparison = (value: number | null) => (value === null ? undefined : range)
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Visitantes únicos"
              question="Minha loja está crescendo?"
              value={formatNumber(current.uniqueVisitors)}
              change={<ChangeBadge value={change.uniqueVisitorsPct} unit="%" />}
              comparison={comparison(change.uniqueVisitorsPct)}
              footnote={`${formatNumber(current.sessions)} conexões no total — cada aparelho conta uma vez.`}
            />
            <StatCard
              label="Clientes que voltaram"
              question="Os clientes voltam?"
              value={current.returningRate === null ? '—' : `${formatDecimal(current.returningRate)}%`}
              change={<ChangeBadge value={change.returningRatePoints} unit="p.p." />}
              comparison={comparison(change.returningRatePoints)}
              footnote={
                <NewVsReturningBar newVisitors={current.newVisitors} returningVisitors={current.returningVisitors} />
              }
            />
            <StatCard
              label="Permanência típica"
              question="O cliente fica ou só passa?"
              value={current.medianDwellMinutes === null ? '—' : formatMinutes(current.medianDwellMinutes)}
              change={<ChangeBadge value={change.medianDwellPct} unit="%" />}
              comparison={comparison(change.medianDwellPct)}
              footnote="Mediana: metade das visitas dura até esse tempo. Não usamos média porque funcionários e acompanhantes conectados por horas a distorceriam."
            />
          </div>
        )
      }}
    </QueryState>
  )
}
