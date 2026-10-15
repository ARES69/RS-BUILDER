/**
 * Real server-side tools for the orchestrator. No mock data anywhere:
 *  - zipStore()      : dependency-free ZIP (store method) writer
 *  - buildPptx()     : a genuine .pptx package (OOXML) PowerPoint/LibreOffice open
 *  - searchWeb()     : keyless web search (DuckDuckGo lite) with result parsing
 *  - httpSession()   : cookie-jar HTTP operator: GET/POST sequences against real sites
 *  - buildSrt()      : real SubRip captions
 * All of them are pure Node, serverless-safe, timeout-bounded.
 */

/* ------------------------------------------------------------------ */
/* ZIP (store, no compression)                                         */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function zipStore(entries) {
  const encoder = new TextEncoder()
  const locals = []
  const central = []
  let offset = 0

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const data = typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data
    const crc = crc32(data)

    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0, true)
    lv.setUint16(8, 0, true) // store
    lv.setUint16(10, 0, true)
    lv.setUint16(12, 0x542e, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, name.length, true)
    lv.setUint16(28, 0, true)
    local.set(name, 30)
    locals.push(local, data)

    central.push({ name, crc, size: data.length, offset })
    offset += local.length + data.length
  }

  const centralChunks = []
  let centralSize = 0
  for (const c of central) {
    const record = new Uint8Array(46 + c.name.length)
    const dv = new DataView(record.buffer)
    dv.setUint32(0, 0x02014b50, true)
    dv.setUint16(4, 20, true)
    dv.setUint16(6, 20, true)
    dv.setUint16(8, 0, true)
    dv.setUint16(10, 0, true)
    dv.setUint16(12, 0, true)
    dv.setUint16(14, 0x542e, true)
    dv.setUint32(16, c.crc, true)
    dv.setUint32(20, c.size, true)
    dv.setUint32(24, c.size, true)
    dv.setUint16(28, c.name.length, true)
    record.set(c.name, 46)
    dv.setUint32(42, c.offset, true)
    centralChunks.push(record)
    centralSize += record.length
  }

  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, central.length, true)
  ev.setUint16(10, central.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  const total = offset + centralSize + 22
  const out = new Uint8Array(total)
  let pos = 0
  for (const chunk of [...locals, ...centralChunks, eocd]) {
    out.set(chunk, pos)
    pos += chunk.length
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Real PPTX                                                           */
/* ------------------------------------------------------------------ */

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function slideXml(slide) {
  const bullets = (slide.bullets ?? [])
    .map((b) => '<a:p><a:r><a:rPr lang="en-US" sz="1800"/><a:t>' + esc(b) + '</a:t></a:r></a:p>')
    .join('')
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>' +
    '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="457200" y="365125"/><a:ext cx="8229600" cy="1325563"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>' +
    '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="3200" b="1"/><a:t>' + esc(slide.title ?? '') + '</a:t></a:r></a:p></p:txBody></p:sp>' +
    '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>' +
    '<p:spPr><a:xfrm><a:off x="457200" y="1825625"/><a:ext cx="8229600" cy="4351338"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>' +
    '<p:txBody><a:bodyPr/><a:lstStyle/>' + (bullets || '<a:p><a:endParaRPr/></a:p>') + '</p:txBody></p:sp>' +
    '</p:spTree></p:cSld><p:clrMapOvr><a:overrideClrMapping/></p:clrMapOvr></p:sld>'
  )
}

export function buildPptx(title, slides) {
  const n = slides.length
  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    slides.map((_, i) => '<Override PartName="/ppt/slides/slide' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>').join('') +
    '</Types>'

  const rootRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
    '</Relationships>'

  const sldIds = slides.map((_, i) => '<p:sldId id="' + (256 + i) + '" r:id="rId' + (i + 2) + '"/>').join('')
  const presentation =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    '<p:sldIdLst>' + sldIds + '</p:sldIdLst>' +
    '<p:sldSz cx="9144000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/>' +
    '</p:presentation>'

  const presRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' +
    slides.map((_, i) => '<Relationship Id="rId' + (i + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + (i + 1) + '.xml"/>').join('') +
    '<Relationship Id="rId' + (n + 2) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>' +
    '</Relationships>'

  const master =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>' +
    '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>'
  const masterRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>' +
    '</Relationships>'

  const layout =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="titleOnly">' +
    '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld>' +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>'
  const layoutRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
    '</Relationships>'

  const theme =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="RSB">' +
    '<a:themeElements><a:clrScheme name="RSB"><a:dk1><a:srgbClr val="101014"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="17171F"/></a:dk2><a:lt2><a:srgbClr val="F4F4F1"/></a:lt2>' +
    ['C8F751', '8B7BFF', '35E0D6', 'FF7A90', 'FFB454', '6A56FF'].map((c) => '<a:accent' + (['C8F751', '8B7BFF', '35E0D6', 'FF7A90', 'FFB454', '6A56FF'].indexOf(c) + 1) + '><a:srgbClr val="' + c + '"/></a:accent' + (['C8F751', '8B7BFF', '35E0D6', 'FF7A90', 'FFB454', '6A56FF'].indexOf(c) + 1) + '>').join('') +
    '<a:hlink><a:srgbClr val="6A56FF"/></a:hlink><a:folHlink><a:srgbClr val="8B7BFF"/></a:folHlink></a:clrScheme>' +
    '<a:fontScheme name="RSB"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>' +
    '<a:fmtScheme name="RSB"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
    '<a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>' +
    '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>' +
    '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>' +
    '</a:themeElements></a:theme>'

  const entries = [
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rootRels },
    { name: 'ppt/presentation.xml', data: presentation },
    { name: 'ppt/_rels/presentation.xml.rels', data: presRels },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: master },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: masterRels },
    { name: 'ppt/slideLayouts/slideLayout1.xml', data: layout },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: layoutRels },
    { name: 'ppt/theme/theme1.xml', data: theme },
  ]
  slides.forEach((slide, i) => {
    entries.push({ name: 'ppt/slides/slide' + (i + 1) + '.xml', data: slideXml(slide) })
    entries.push({
      name: 'ppt/slides/_rels/slide' + (i + 1) + '.xml.rels',
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
        '</Relationships>',
    })
  })

  return zipStore(entries)
}

/* ------------------------------------------------------------------ */
/* Keyless web search                                                  */
/* ------------------------------------------------------------------ */

/** DuckDuckGo wraps results in /l/?uddg=… redirects — unwrap to the real URL. */
function unwrapRedirect(href) {
  let out = href
  if (out.startsWith('//')) out = 'https:' + out
  try {
    const u = new URL(out)
    const uddg = u.searchParams.get('uddg')
    if (uddg) return uddg
  } catch {
    /* keep as-is */
  }
  return out
}

export async function searchWeb(query, { limit = 8, signal, timeoutMs = 12000 } = {}) {
  const url = 'https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(query)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
      },
    })
    if (!response.ok) return { ok: false, text: 'search HTTP ' + response.status, results: [] }
    const html = await response.text()

    // attribute-order-agnostic parsing
    const results = []
    const anchorRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
    let m
    while ((m = anchorRe.exec(html)) && results.length < limit) {
      const attrs = m[1]
      if (!/result-link/i.test(attrs)) continue
      let href = /href="([^"]+)"/i.exec(attrs)?.[1]
      const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (href) href = unwrapRedirect(href)
      if (href && title) results.push({ url: href, title })
    }
    const cellRe = /<td\b([^>]*)>([\s\S]*?)<\/td>/gi
    const snippets = []
    while ((m = cellRe.exec(html))) {
      if (/result-snippet/i.test(m[1])) snippets.push(m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    }
    results.forEach((r, i) => (r.snippet = snippets[i] ?? ''))

    if (!results.length) {
      const generic = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi
      while ((m = generic.exec(html)) && results.length < limit) {
        let href = /href="([^"]+)"/i.exec(m[1])?.[1]
        const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        if (href) href = unwrapRedirect(href)
        if (href && /^https?:/i.test(href) && title.length > 12 && !/duckduckgo\.com/i.test(href)) results.push({ url: href, title })
      }
    }
    if (!results.length) {
      // rate-limited egress fallback: Wikipedia REST search (keyless, stable)
      try {
        const wUrl = 'https://en.wikipedia.org/w/rest.php/v1/search/page?q=' + encodeURIComponent(query) + '&limit=' + limit
        const wRes = await fetch(wUrl, { signal: controller.signal, headers: { accept: 'application/json', 'user-agent': 'RSBuilderResearch/1.0 (https://rs-builder-sigma.vercel.app; lookastarik@gmail.com)' } })
        if (wRes.ok) {
          const wj = await wRes.json()
          for (const p of wj.pages ?? []) {
            results.push({
              url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(String(p.title ?? '').replace(/ /g, '_')),
              title: String(p.title ?? ''),
              snippet: String(p.description ?? p.excerpt ?? '').replace(/<[^>]+>/g, '').slice(0, 160),
            })
          }
        }
      } catch {
        /* keep the duckduckgo verdict */
      }
    }
    return { ok: results.length > 0, text: results.length + ' results', results }
  } catch (error) {
    return { ok: false, text: 'search failed: ' + error.message, results: [] }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/* ------------------------------------------------------------------ */
/* Cookie-jar HTTP operator                                            */
/* ------------------------------------------------------------------ */

export async function httpSession(actions, { signal, timeoutMs = 15000 } = {}) {
  const jar = new Map()
  const log = []
  for (const action of (actions ?? []).slice(0, 8)) {
    let url
    try {
      url = new URL(action.url)
    } catch {
      log.push({ ok: false, step: action.method ?? 'GET', url: String(action.url), note: 'invalid URL' })
      continue
    }
    const privateHost = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]|0\.0\.0\.0)/i.test(url.hostname)
    if (privateHost && process.env.RSB_ALLOW_PRIVATE_HTTP !== '1') {
      log.push({ ok: false, step: action.method ?? 'GET', url: url.href, note: 'private address blocked' })
      continue
    }
    const cookies = [...jar.entries()].filter(([d]) => url.hostname.endsWith(d)).map(([, c]) => c).join('; ')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        method: (action.method ?? 'GET').toUpperCase(),
        headers: {
          'user-agent': 'RS-BUILDER browser-operator/1.0',
          ...(cookies ? { cookie: cookies } : {}),
          ...(action.body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
        },
        body: action.body ? new URLSearchParams(action.body).toString() : undefined,
        redirect: 'follow',
        signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
      })
      for (const setCookie of response.headers.getSetCookie?.() ?? []) {
        const [pair] = setCookie.split(';')
        const eq = pair.indexOf('=')
        if (eq > 0) jar.set(url.hostname, pair.slice(0, eq).trim() + '=' + pair.slice(eq + 1).trim())
      }
      const html = await response.text()
      const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 90)
      log.push({ ok: response.ok, step: (action.method ?? 'GET').toUpperCase(), url: url.href, status: response.status, title })
    } catch (error) {
      log.push({ ok: false, step: (action.method ?? 'GET').toUpperCase(), url: url.href, note: error.message })
    } finally {
      clearTimeout(timer)
    }
  }
  return { ok: log.some((l) => l.ok), log }
}

/* ------------------------------------------------------------------ */
/* Real SubRip captions                                                */
/* ------------------------------------------------------------------ */

export function buildSrt(lines) {
  const stamp = (seconds) => {
    const ms = Math.max(0, Math.round((seconds % 1) * 1000))
    const s = Math.floor(seconds) % 60
    const m = Math.floor(seconds / 60) % 60
    const h = Math.floor(seconds / 3600)
    const pad = (n, w = 2) => String(n).padStart(w, '0')
    return pad(h) + ':' + pad(m) + ':' + pad(s) + ',' + pad(ms, 3)
  }
  return (lines ?? [])
    .map((line, i) => (i + 1) + '\n' + stamp(line.from ?? i * 3) + ' --> ' + stamp(line.to ?? i * 3 + 2.5) + '\n' + String(line.text ?? '') + '\n')
    .join('\n')
}
