export interface Store {
  id: string
  name: string
  timezone: string
}

export interface Period {
  from: string
  to: string
  days: number
}

export interface PeriodTotals {
  sessions: number
  uniqueVisitors: number
  returningVisitors: number
  newVisitors: number
  returningRate: number | null
  medianDwellMinutes: number | null
}

export interface SummaryResponse {
  store: Store
  period: Period
  previousPeriod: Period
  current: PeriodTotals
  previous: PeriodTotals
  change: {
    uniqueVisitorsPct: number | null
    returningRatePoints: number | null
    medianDwellPct: number | null
  }
}

export interface HeatmapCell {
  /** ISO: 1 = segunda … 7 = domingo */
  dayOfWeek: number
  hour: number
  connections: number
  avgConnections: number
}

export interface HeatmapResponse {
  store: Store
  period: Period
  cells: HeatmapCell[]
}

export interface TrafficPoint {
  date: string
  uniqueVisitors: number
  sessions: number
}

export interface TrafficResponse {
  store: Store
  period: Period
  points: TrafficPoint[]
}
