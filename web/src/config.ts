const apiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')
const storeId = import.meta.env.VITE_STORE_ID

/** Variáveis obrigatórias que faltaram no build (exibidas na tela em vez de quebrar em silêncio). */
export const missingConfig = [!apiUrl && 'VITE_API_URL', !storeId && 'VITE_STORE_ID'].filter(
  (name): name is string => Boolean(name),
)

export const config = {
  apiUrl: apiUrl ?? '',
  storeId: storeId ?? '',
}
