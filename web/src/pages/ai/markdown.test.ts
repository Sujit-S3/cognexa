import { describe, expect, it } from 'vitest'
import { renderSafeMarkdown } from './markdown'

describe('renderSafeMarkdown', () => {
  it('escapes provider and user HTML before adding supported markdown', () => {
    const html = renderSafeMarkdown(
      '<img src=x onerror="alert(1)"> **safe** `code` & <script>alert(2)</script>'
    )

    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    expect(html).toContain('<strong>safe</strong>')
    expect(html).toContain('<code class="inline-code">code</code>')
    expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
  })
})
