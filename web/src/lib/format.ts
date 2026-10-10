const numberFormat = new Intl.NumberFormat('pt-BR')
const decimalFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
// Datas da API são dias de calendário (AAAA-MM-DD); formatar em UTC evita "voltar um dia"
const shortDateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })

export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
  7: 'Dom',
}

export const WEEKDAY_NAMES: Record<number, string> = {
  1: 'segunda',
  2: 'terça',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sábado',
  7: 'domingo',
}

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

export function formatDecimal(value: number): string {
  return decimalFormat.format(value)
}

export function formatShortDate(date: string): string {
  return shortDateFormat.format(new Date(`${date}T00:00:00Z`)).replace('.', '')
}

export function formatRange(from: string, to: string): string {
  return `${formatShortDate(from)} – ${formatShortDate(to)}`
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${formatDecimal(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  return rest ? `${hours}h ${rest}min` : `${hours}h`
}

export function formatHourRange(hour: number): string {
  return `${hour}h–${hour + 1}h`
}
