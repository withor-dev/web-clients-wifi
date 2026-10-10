import { PeriodTotals } from './metrics.repository';

/** Arredonda para 1 casa decimal (evita 33.33333 no JSON). */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Percentual de recorrentes, ou null sem visitantes (0 de 0 não é 0%). */
export function returningRate(totals: Pick<PeriodTotals, 'uniqueVisitors' | 'returningVisitors'>): number | null {
  if (totals.uniqueVisitors === 0) return null;
  return round1((totals.returningVisitors / totals.uniqueVisitors) * 100);
}

/** Variação percentual; null quando não há base de comparação (anterior nulo ou zero). */
export function percentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return round1(((current - previous) / previous) * 100);
}

/** Diferença em pontos percentuais entre duas taxas. */
export function pointsChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return round1(current - previous);
}
