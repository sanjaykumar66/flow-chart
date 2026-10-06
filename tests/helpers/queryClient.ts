import { QueryClient } from '@tanstack/vue-query'
import { queryClientConfig } from '@/queries/client'

/** The app's query settings, without retries so failures show up immediately in tests. */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      ...queryClientConfig.defaultOptions,
      queries: { ...queryClientConfig.defaultOptions?.queries, retry: false },
    },
  })
}
