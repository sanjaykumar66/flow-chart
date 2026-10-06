import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { useOpenedOnce } from '@/composables/useOpenedOnce'

describe('useOpenedOnce', () => {
  it('turns true on the first open and stays true after closing', async () => {
    const open = ref(false)
    const opened = useOpenedOnce(open)
    expect(opened.value).toBe(false)
    open.value = true
    await nextTick()
    expect(opened.value).toBe(true)
    open.value = false
    await nextTick()
    expect(opened.value).toBe(true)
  })

  it('is true straight away when it starts open', () => {
    expect(useOpenedOnce(ref(true)).value).toBe(true)
  })
})
