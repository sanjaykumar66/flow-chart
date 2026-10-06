import { describe, expect, it } from 'vitest'
import { createAppQueryClient, queryClientConfig } from '@/queries/client'

describe('createAppQueryClient', () => {
  it('applies the brief’s settings to queries and mutations', () => {
    const client = createAppQueryClient()
    expect(client.getDefaultOptions()).toEqual(queryClientConfig.defaultOptions)
    expect(client.getDefaultOptions().mutations?.networkMode).toBe('always')
  })
})
