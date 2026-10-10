import type { UseQueryResult } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { ApiError, NetworkError } from '../api/client'

/** Depois desse tempo carregando, assumimos que o servidor gratuito está acordando. */
const SLOW_AFTER_MS = 4000

function useIsSlow(active: boolean): boolean {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS)
    return () => {
      window.clearTimeout(timer)
      setSlow(false)
    }
  }, [active])
  return active && slow
}

interface QueryStateProps<T> {
  query: UseQueryResult<T, Error>
  isEmpty: (data: T) => boolean
  emptyMessage: string
  skeleton: ReactNode
  /** Classes do contêiner dos estados sem dados (útil quando o bloco não está dentro de um Panel). */
  stateClassName?: string
  children: (data: T) => ReactNode
}

/** Estados padronizados de cada bloco: carregando, conectando (cold start), erro, vazio e dados. */
export function QueryState<T>(props: QueryStateProps<T>) {
  const { query, isEmpty, emptyMessage, skeleton, stateClassName, children } = props
  const retryingNetwork = query.isPending && query.failureReason instanceof NetworkError
  const slow = useIsSlow(query.isPending)

  if (query.isPending) {
    if (retryingNetwork || slow) {
      return (
        <div className={stateClassName}>
          <ConnectingState />
        </div>
      )
    }
    return <>{skeleton}</>
  }

  if (query.isError) {
    return (
      <div className={stateClassName}>
        <ErrorState error={query.error} onRetry={() => query.refetch()} retrying={query.isFetching} />
      </div>
    )
  }

  if (isEmpty(query.data)) {
    return (
      <div className={stateClassName}>
        <p className="py-10 text-center text-sm text-stone-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={query.isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {children(query.data)}
    </div>
  )
}

function ConnectingState() {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="size-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
      <p className="text-sm font-medium text-stone-700">Conectando ao servidor…</p>
      <p className="max-w-xs text-xs text-stone-500">
        O servidor fica em espera quando ninguém usa o painel e leva alguns segundos para acordar.
      </p>
    </div>
  )
}

function errorMessage(error: Error): string {
  if (error instanceof NetworkError) {
    return 'Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.'
  }
  if (error instanceof ApiError) {
    if (error.status === 404) return 'Loja não encontrada. Confira a configuração do painel.'
    if (error.status < 500) return error.message
  }
  return 'Algo deu errado ao carregar estes dados.'
}

function ErrorState({ error, onRetry, retrying }: { error: Error; onRetry: () => void; retrying: boolean }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="max-w-sm text-sm text-stone-700">{errorMessage(error)}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-brand-600 disabled:opacity-60"
      >
        {retrying ? 'Tentando…' : 'Tentar de novo'}
      </button>
    </div>
  )
}

export function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-stone-200/70 ${className}`} />
}
