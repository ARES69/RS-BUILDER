/**
 * Client-side sandbox helpers (pure functions, no React — unit tested in
 * scripts/test-sandbox.mjs).
 *
 * The sandbox tab is the visible half of the real sandbox: the agent works in
 * a real project directory on the server, and here the user can open the same
 * files, edit them, watch the live preview with a real browser console, and
 * hand their edited workspace back to the agent as the next run's seed.
 */

export type SandboxFile = { path: string; content: string }
export type SandboxBinary = { name: string; mime: string; base64: string }

/** Chooses the page to preview: explicit entry, else index.html, else any html. */
export function pickEntry(files: SandboxFile[], preferred?: string | null): string | null {
  if (preferred && files.some((f) => f.path === preferred)) return preferred
  const index = files.find((f) => f.path === 'index.html')
  if (index) return index.path
  const anyHtml = files.find((f) => /\.html?$/i.test(f.path))
  if (anyHtml) return anyHtml.path
  return files.length ? files[0].path : null
}

const normalizeRef = (ref: string): string => {
  const clean = String(ref).split('#')[0].split('?')[0].trim()
  return clean.replace(/^\.\//, '').replace(/^\/+/, '')
}

const escapeForTag = (text: string, tag: 'script' | 'style'): string =>
  String(text).replace(new RegExp('</' + tag, 'gi'), (m) => m.slice(0, 2) + '\\' + m.slice(2))

/**
 * Rewrites same-project relative references into inline content so a
 * multi-file project (index.html + styles.css + app.js + logo.png) renders
 * inside a srcdoc iframe without a server.
 */
export function inlineAssets(
  html: string,
  files: SandboxFile[],
  binaries: SandboxBinary[] = [],
  baseDir = '',
): string {
  const byPath = new Map(files.map((f) => [f.path, f.content]))
  const binByPath = new Map(binaries.map((b) => [b.name, b]))
  // references resolve like a browser would: relative to the entry's directory
  const resolve = (ref: string): string | undefined => {
    const clean = normalizeRef(ref)
    if (byPath.has(clean)) return clean
    if (baseDir && byPath.has(baseDir + '/' + clean)) return baseDir + '/' + clean
    return undefined
  }
  const resolveBin = (ref: string): SandboxBinary | undefined => {
    const clean = normalizeRef(ref)
    return binByPath.get(clean) ?? (baseDir ? binByPath.get(baseDir + '/' + clean) : undefined)
  }
  let out = String(html)

  // <link rel="stylesheet" href="styles.css">
  out = out.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) return tag
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]
    if (!href) return tag
    const resolved = resolve(href)
    const css = resolved === undefined ? undefined : byPath.get(resolved)
    return css === undefined ? tag : '<style data-src="' + href + '">\n' + escapeForTag(css, 'style') + '\n</style>'
  })

  // <script src="app.js"></script>
  out = out.replace(/<script\b([^>]*)>\s*<\/script>/gi, (tag, attrs: string) => {
    const src = /src\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]
    if (!src) return tag
    const resolved = resolve(src)
    const js = resolved === undefined ? undefined : byPath.get(resolved)
    return js === undefined ? tag : '<script data-src="' + src + '">\n' + escapeForTag(js, 'script') + '\n</script>'
  })

  // <img src="logo.png"> — only when the run actually delivered that binary
  out = out.replace(/(<img\b[^>]*\bsrc\s*=\s*["'])([^"']+)(["'])/gi, (all, pre, src, post) => {
    const bin = resolveBin(src)
    return bin ? pre + 'data:' + bin.mime + ';base64,' + bin.base64 + post : all
  })

  return out
}

/**
 * Injected into every preview: forwards console.* and uncaught errors to the
 * parent window so the sandbox tab shows a REAL browser console.
 */
export function consoleBridge(): string {
  return [
    '<script>(function(){',
    "  var send=function(level,args){try{parent.postMessage({source:'rsb-sandbox',level:level,text:Array.prototype.slice.call(args).map(function(a){",
    "    try{ if(typeof a==='string')return a; if(a&&a.message)return String(a.message); return JSON.stringify(a)}catch(e){return String(a)}",
    "  }).join(' ')},'*')}catch(e){}};",
    "  ['log','info','warn','error','debug'].forEach(function(m){var orig=console[m];console[m]=function(){send(m,arguments);if(orig)orig.apply(console,arguments)};});",
    "  window.addEventListener('error',function(e){send('error',[e.message+' ('+(e.filename||'preview')+':'+e.lineno+':'+e.colno+')'])});",
    "  window.addEventListener('unhandledrejection',function(e){send('error',['Unhandled rejection: '+((e.reason&&(e.reason.stack||e.reason.message))||e.reason)])});",
    "  send('info',['sandbox preview ready']);",
    '})();</script>',
  ].join('\n')
}

/** Injects the console bridge as early as possible. */
export function injectBridge(html: string): string {
  const bridge = consoleBridge()
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + '\n' + bridge)
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => m + '<head>' + bridge + '</head>')
  return bridge + '\n' + html
}

/** Full preview document for the iframe: entry file + inlined assets + bridge. */
export function buildPreview(files: SandboxFile[], entry: string | null, binaries: SandboxBinary[] = []): string {
  if (!entry) return ''
  const source = files.find((f) => f.path === entry)
  if (!source) return ''
  const baseDir = entry.includes('/') ? entry.slice(0, entry.lastIndexOf('/')) : ''
  const html = /\.html?$/i.test(entry) ? source.content : '<pre>' + source.content.replace(/</g, '&lt;') + '</pre>'
  return injectBridge(inlineAssets(html, files, binaries, baseDir))
}

/* ------------------------------------------------------------------ */
/* Minimal store-only zip writer (no compression, CRC32) — lets the      */
/* browser hand back the whole edited project as workspace.zip.         */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  return table
})()

export function crc32(bytes: Uint8Array): number {
  let c = -1
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

export type ZipEntry = { name: string; data: Uint8Array }

export function zipStore(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  const dosTime = (d = new Date()) => {
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f)
    const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
    return { time, date }
  }
  const { time, date } = dosTime()
  for (const entry of entries) {
    const name = enc.encode(entry.name)
    const crc = crc32(entry.data)
    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0, true)
    lv.setUint16(8, 0, true) // store
    lv.setUint16(10, time, true)
    lv.setUint16(12, date, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, entry.data.length, true)
    lv.setUint32(22, entry.data.length, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, 30)
    chunks.push(local, entry.data)

    const cd = new Uint8Array(46 + name.length)
    const cv = new DataView(cd.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, time, true)
    cv.setUint16(14, date, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, entry.data.length, true)
    cv.setUint32(24, entry.data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    cd.set(name, 46)
    central.push(cd)
    offset += local.length + entry.data.length
  }
  const centralSize = central.reduce((a, c) => a + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  const all = [...chunks, ...central, end]
  const total = all.reduce((a, c) => a + c.length, 0)
  const out = new Uint8Array(total)
  let at = 0
  for (const part of all) { out.set(part, at); at += part.length }
  return out
}

/** Browser download of a text file. */
export function downloadText(name: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  downloadBlob(name, new Blob([text], { type: mime }))
}

export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
