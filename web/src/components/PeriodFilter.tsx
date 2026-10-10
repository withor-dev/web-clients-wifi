import { PERIOD_OPTIONS, type PeriodDays } from '../lib/period'

interface PeriodFilterProps {
  value: PeriodDays
  onChange: (days: PeriodDays) => void
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div role="radiogroup" aria-label="Período" className="inline-flex rounded-xl bg-stone-100 p-1">
      {PERIOD_OPTIONS.map((days) => {
        const selected = days === value
        return (
          <button
            key={days}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(days)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-600 ${
              selected ? 'bg-white text-brand-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {days} dias
          </button>
        )
      })}
    </div>
  )
}
