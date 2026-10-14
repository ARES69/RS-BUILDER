/**
 * Safe scroll helpers. `Element.scrollIntoView` is missing in some embedded
 * environments (jsdom, a few webviews), so every call goes through here.
 */
export function scrollToNode(node: Element | null | undefined, options?: ScrollIntoViewOptions) {
  if (!node || typeof node.scrollIntoView !== 'function') return
  try {
    node.scrollIntoView(options ?? { behavior: 'smooth', block: 'start' })
  } catch {
    /* environment without smooth scrolling support */
  }
}

export function scrollToTop() {
  try {
    if (typeof window.scrollTo === 'function') window.scrollTo({ top: 0, behavior: 'auto' })
  } catch {
    /* ignore */
  }
}
