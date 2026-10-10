import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  question: string
  aside?: ReactNode
  children: ReactNode
}

/** Bloco do painel: cada um responde a uma pergunta do dono da loja. */
export function Panel({ title, question, aside, children }: PanelProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          <p className="text-sm text-stone-500">{question}</p>
        </div>
        {aside}
      </header>
      {children}
    </section>
  )
}
