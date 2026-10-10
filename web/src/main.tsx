import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApiError, NetworkError } from './api/client'
import App from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      // Falha de rede costuma ser o servidor acordando: insiste por ~1 min antes de mostrar erro.
      // Erros 4xx são definitivos; 5xx ganham uma nova tentativa.
      retry: (failureCount, error) => {
        if (error instanceof NetworkError) return failureCount < 6
        if (error instanceof ApiError) return error.status >= 500 && failureCount < 1
        return false
      },
      retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 15_000),
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
