import { useMemo } from 'react'
import { useHeatmap, useSummary, useTraffic } from './api/metrics'
import { Heatmap } from './components/Heatmap'
import { PeriodFilter } from './components/PeriodFilter'
import { SummaryCards } from './components/SummaryCards'
import { TrafficChart } from './components/TrafficChart'
import { missingConfig } from './config'
import { formatRange } from './lib/format'
import { rangeForDays, usePeriodDays } from './lib/period'

export default function App() {
  if (missingConfig.length > 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-stone-900">Painel não configurado</h1>
        <p className="mt-2 text-sm text-stone-600">
          Defina as variáveis {missingConfig.join(' e ')} no ambiente do build (veja web/.env.example).
        </p>
      </main>
    )
  }
  return <Dashboard />
}

function Dashboard() {
  const [days, setDays] = usePeriodDays()
  const range = useMemo(() => rangeForDays(days), [days])

  const summary = useSummary(range)
  const heatmap = useHeatmap(range)
  const traffic = useTraffic(range)

  const store = summary.data?.store ?? heatmap.data?.store ?? traffic.data?.store

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Wi-Fi de visitantes</p>
            <h1 className="text-xl font-semibold text-stone-900">{store?.name ?? 'Painel da loja'}</h1>
            <p className="text-sm text-stone-500">
              {formatRange(range.from, range.to)} · últimos {days} dias completos
            </p>
          </div>
          <PeriodFilter value={days} onChange={setDays} />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
        <SummaryCards query={summary} />
        <Heatmap query={heatmap} timezone={store?.timezone} />
        <TrafficChart query={traffic} />
        <footer className="pb-4 text-center text-xs text-stone-400">
          Visitante = aparelho que se conectou ao Wi-Fi. Os identificadores são guardados apenas como hash (LGPD).
        </footer>
      </main>
    </div>
  )
}
