import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { config } from '../config'
import type { DateRange } from '../lib/period'
import { apiGet } from './client'
import type { HeatmapResponse, SummaryResponse, TrafficResponse } from './types'

type Metric = 'summary' | 'heatmap' | 'traffic'

function useMetric<T>(metric: Metric, range: DateRange) {
  return useQuery({
    queryKey: ['metrics', metric, config.storeId, range.from, range.to],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ from: range.from, to: range.to })
      return apiGet<T>(`/stores/${config.storeId}/metrics/${metric}?${params}`, signal)
    },
    // Ao trocar o período, mantém os dados antigos (esmaecidos) até os novos chegarem
    placeholderData: keepPreviousData,
  })
}

export const useSummary = (range: DateRange) => useMetric<SummaryResponse>('summary', range)
export const useHeatmap = (range: DateRange) => useMetric<HeatmapResponse>('heatmap', range)
export const useTraffic = (range: DateRange) => useMetric<TrafficResponse>('traffic', range)
