// Guards against javascript:/data: URIs in user- or API-supplied content (lesson URLs, uploaded
// attachment links) executing in the viewer's authenticated session when clicked/rendered as an
// href/src. Only http(s) URLs are considered safe to render as a live link or media source.
export function isSafeContentUrl(url: string | undefined): url is string {
  if (!url) return false
  try {
    return ['http:', 'https:'].includes(new URL(url, window.location.origin).protocol)
  } catch {
    return false
  }
}
