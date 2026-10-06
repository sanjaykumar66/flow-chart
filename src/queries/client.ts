import { QueryClient, type QueryClientConfig } from '@tanstack/vue-query'

/** Query settings from the assignment brief. */
export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      networkMode: 'always',
      staleTime: Infinity,
      gcTime: 60 * 60 * 1000,
    },
    // Same as queries: the fake API lives in the browser, so saving must not wait for "online".
    mutations: {
      networkMode: 'always',
    },
  },
}

export function createAppQueryClient() {
  return new QueryClient(queryClientConfig)
}
