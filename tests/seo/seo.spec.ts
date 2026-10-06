import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Lighthouse SEO checks that a unit test can guard: the page head and the crawler files.
const read = (path: string) => readFileSync(resolve(__dirname, '../..', path), 'utf8')

describe('SEO', () => {
  const html = new DOMParser().parseFromString(read('index.html'), 'text/html')
  const meta = (selector: string) => html.querySelector(selector)?.getAttribute('content') ?? ''

  it('has a descriptive title and meta description', () => {
    expect(html.title).toMatch(/^Flow Builder/)
    expect(meta('meta[name="description"]').length).toBeGreaterThanOrEqual(50)
    expect(meta('meta[name="description"]').length).toBeLessThanOrEqual(160)
  })

  it('declares the language, viewport and canonical URL', () => {
    expect(html.documentElement.lang).toBe('en')
    expect(meta('meta[name="viewport"]')).toContain('width=device-width')
    expect(html.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://flow-chart-tau.vercel.app/',
    )
  })

  it('has link-preview tags', () => {
    expect(meta('meta[property="og:title"]')).toBe('Flow Builder')
    expect(meta('meta[property="og:description"]')).not.toBe('')
  })

  it('ships a valid robots.txt that allows crawling and points to the sitemap', () => {
    const lines = read('public/robots.txt')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
    // Every rule is a "Field: value" line, which is what crawlers (and Lighthouse) parse.
    for (const line of lines) expect(line).toMatch(/^(User-agent|Allow|Disallow|Sitemap):\s*\S+/i)
    expect(lines).toContain('User-agent: *')
    expect(lines).toContain('Allow: /')
    expect(lines).toContain('Sitemap: https://flow-chart-tau.vercel.app/sitemap.xml')
  })

  it('ships a sitemap listing the app', () => {
    const sitemap = new DOMParser().parseFromString(read('public/sitemap.xml'), 'application/xml')
    expect(Array.from(sitemap.querySelectorAll('loc'), (loc) => loc.textContent)).toEqual([
      'https://flow-chart-tau.vercel.app/',
    ])
  })
})
