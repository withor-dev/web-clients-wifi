import { useCallback, useEffect, useState } from 'react'

export const PERIOD_OPTIONS = [7, 30, 90] as const
export type PeriodDays = (typeof PERIOD_OPTIONS)[number]

const DEFAULT_DAYS: PeriodDays = 30
const URL_PARAM = 'dias'

export interface DateRange {
  from: string
  to: string
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Últimos N dias completos, terminando ontem. O dia de hoje fica de fora porque ainda está
 * pela metade e puxaria para baixo a tendência e a comparação com o período anterior.
 */
export function rangeForDays(days: PeriodDays, today = new Date()): DateRange {
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - (days - 1))
  return { from: toLocalDateString(from), to: toLocalDateString(to) }
}

function readDaysFromUrl(): PeriodDays {
  const value = Number(new URLSearchParams(window.location.search).get(URL_PARAM))
  return PERIOD_OPTIONS.find((option) => option === value) ?? DEFAULT_DAYS
}

/** Período selecionado, sincronizado com a URL (?dias=30) para o link poder ser compartilhado. */
export function usePeriodDays(): [PeriodDays, (days: PeriodDays) => void] {
  const [days, setDaysState] = useState<PeriodDays>(readDaysFromUrl)

  useEffect(() => {
    const onPopState = () => setDaysState(readDaysFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const setDays = useCallback((next: PeriodDays) => {
    const url = new URL(window.location.href)
    url.searchParams.set(URL_PARAM, String(next))
    window.history.pushState(null, '', url)
    setDaysState(next)
  }, [])

  return [days, setDays]
}
