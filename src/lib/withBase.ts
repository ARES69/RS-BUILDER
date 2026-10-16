/**
 * Injects a <base href> so a hosted multi-file site renders correctly inside
 * a srcdoc iframe: relative css/js/svg resolve against the blob directory.
 */
export function withBaseHtml(html: string, pageUrl?: string | null): string {
  if (!pageUrl) return html
  const dir = pageUrl.replace(/\/[^/]*$/, '/')
  const tag = '<base href="' + dir + '">'
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + tag)
  return tag + html
}
