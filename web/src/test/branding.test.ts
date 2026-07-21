import { describe, expect, it } from 'vitest'
import html from '../../index.html?raw'
import manifestSource from '../../public/manifest.webmanifest?raw'
import serviceWorkerSource from '../../public/sw.js?raw'

describe('Cognexa public metadata', () => {
  it('uses the official name and tagline in browser and social metadata', () => {
    const retiredBrand = ['nex', 'us'].join('')

    expect(html).toContain('Cognexa — Connecting Knowledge, Empowering Minds.')
    expect(html).toContain('https://cognexa.app/og.png')
    expect(html).toContain('application/ld+json')
    expect(html.toLowerCase()).not.toContain(retiredBrand)
  })

  it('publishes consistent installable-app metadata', () => {
    const manifest = JSON.parse(manifestSource) as {
      name: string
      short_name: string
      description: string
      icons: Array<{ src: string }>
    }

    expect(manifest.name).toBe('Cognexa Learning Platform')
    expect(manifest.short_name).toBe('Cognexa')
    expect(manifest.description).toContain('Connecting Knowledge, Empowering Minds.')
    expect(manifest.icons.map((icon) => icon.src)).toEqual(
      expect.arrayContaining(['/favicon.svg', '/icon-192.png', '/icon-512.png'])
    )
  })

  it('ships a versioned offline application-shell service worker', () => {
    expect(serviceWorkerSource).toContain('cognexa-shell-v1')
    expect(serviceWorkerSource).toContain("request.mode === 'navigate'")
  })
})
