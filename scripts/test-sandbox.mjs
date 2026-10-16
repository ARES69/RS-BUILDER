/**
 * Sandbox v3 tests — the real execution sandbox (server) and the sandbox tab
 * helpers (client). No LLM involved: this proves the machinery the agent
 * drives, including the honest degradation paths.
 *
 * Run: npm run test:sandbox
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
import { build } from 'esbuild'

let ok = true
const check = (good, msg) => {
  console.log((good ? 'PASS' : 'FAIL') + '  ' + msg)
  if (!good) ok = false
}

/* ------------------------------------------------------------------ */
/* A. server sandbox: real fs + real child processes                    */
/* ------------------------------------------------------------------ */

const {
  capabilities,
  createSandbox,
  Sandbox,
  executeInVm,
  sanitizeSeedFiles,
  safeJoin,
  tokenize,
  __resetCapabilities,
} = await import('../server/sandbox.mjs')

const caps = capabilities()
check(caps.tmpWritable === true, 'host has a writable tmpdir for real project directories')
check(caps.real === true && caps.mode === 'full', 'capabilities probe reports a real sandbox → ' + JSON.stringify({ shell: caps.shell, node: caps.node, npm: caps.npm }))

// secrets that must NEVER reach model-generated code
process.env.OPENAI_API_KEY = 'super-secret-key'
process.env.RSB_SESSION_SECRET = 'session-secret'

const sbx = await createSandbox('test-run')
check(sbx.real && existsSync(sbx.root), 'createSandbox made a real project directory → ' + sbx.root)
check(sbx.root.startsWith(tmpdir()), 'project directory lives under tmpdir (never rm outside it)')

sbx.write('index.html', '<!doctype html><title>seeded</title>')
check(readFileSync(join(sbx.root, 'index.html'), 'utf8').includes('seeded'), 'write() lands on the real disk')

const sh = await sbx.shell('mkdir -p site && echo "made-by-shell" > site/note.txt && ls site && cat site/note.txt')
check(sh.ok && sh.mode === 'shell' && /made-by-shell/.test(sh.text), 'run_shell executes in a real /bin/sh with cwd = project → ' + JSON.stringify(sh.text.trim()))
check(existsSync(join(sbx.root, 'site', 'note.txt')), 'files created by the shell exist on disk')

await sbx.shell('mkdir -p gen')
const nodeRun = await sbx.runNode("const fs=require('fs'); fs.writeFileSync('gen/data.json', JSON.stringify({a:1})); console.log('cwd-is-project', process.cwd() === process.env.RSB_PROJECT); fs.readFileSync('gen/data.json','utf8')")
check(nodeRun.ok && /node-cjs/.test(nodeRun.mode), 'run_code executes in a REAL node process (fs write works) → ' + nodeRun.mode)
check(/cwd-is-project true/.test(nodeRun.text), 'the child cwd IS the project directory → ' + nodeRun.text.trim().split('\n')[0])

const completion = await sbx.runNode('const t=[1,2,3]; t.reduce((a,b)=>a+b,0)')
check(completion.ok && /→ 6/.test(completion.text), 'completion value still comes back like the old vm → ' + JSON.stringify(completion.text.trim()))

const esm = await sbx.runNode("import fs from 'node:fs'; fs.writeFileSync('esm.txt','esm-ok'); console.log('esm ran')")
check(esm.ok && /esm ran/.test(esm.text) && readFileSync(join(sbx.root, 'esm.txt'), 'utf8') === 'esm-ok', 'ESM import snippets run as .mjs → ' + esm.mode)

const awaited = await sbx.runNode("const v = await new Promise((r) => setTimeout(() => r('awaited'), 5)); console.log(v)")
check(awaited.ok && /awaited/.test(awaited.text), 'top-level await falls back to module mode instead of failing → ' + awaited.mode)

const secrets = await sbx.runNode('console.log(JSON.stringify({or: process.env.OPENAI_API_KEY ?? null, sess: process.env.RSB_SESSION_SECRET ?? null, keys: Object.keys(process.env).length}))')
check(/"or":null/.test(secrets.text) && /"sess":null/.test(secrets.text), 'ENV IS SCRUBBED: the child sees no provider keys or session secret → ' + secrets.text.trim())
check(!/super-secret-key|session-secret/.test(secrets.text), 'no secret value leaked into the captured output')

const escape = sbx.write('../../etc/rsb-escape.txt', 'x')
check(escape.ok === false && /escapes/.test(escape.error), 'path guard: writes outside the project are rejected → ' + escape.error)
check(safeJoin(sbx.root, '/etc/passwd') === null && safeJoin(sbx.root, 'a/../../b') === null, 'path guard: absolute paths and .. traversals resolve to null')
check(safeJoin(sbx.root, 'site/deep/ok.txt')?.endsWith('site/deep/ok.txt') === true, 'path guard: normal nested paths pass')
check(sbx.read('/etc/passwd').ok === false, 'read() refuses paths outside the project')

const killed = await sbx.shell('sleep 5', { timeoutMs: 1000 })
check(killed.ok === false && /timeout after 1s/.test(killed.text), 'runaway commands are killed at their timeout → ' + JSON.stringify(killed.text.trim()))

const listing = sbx.list()
check(listing.some((f) => f.path === 'site/note.txt') && listing.every((f) => !f.path.includes('node_modules')), 'list() walks the real tree and skips dependency dirs → ' + listing.length + ' entries')

const files = new Map()
const binaries = new Map()
sbx.syncInto(files, binaries)
check(files.get('site/note.txt') === 'made-by-shell\n', 'syncInto pulls shell-created files into the run workspace')
check(files.has('index.html') && files.has('gen/data.json'), 'syncInto sees everything the tools and code produced → ' + [...files.keys()].sort().join(', '))

sbx.writeBinary('logo.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]))
const files2 = new Map()
const bins2 = new Map()
sbx.syncInto(files2, bins2)
check(bins2.has('logo.png') && !files2.has('logo.png'), 'binary assets sync separately (they become downloads + hosted site assets)')

const root = sbx.root
sbx.dispose()
check(!existsSync(root), 'dispose() removes the project directory')

/* ------------------------------------------------------------------ */
/* B. mini-shell: hosts without /bin/sh                                 */
/* ------------------------------------------------------------------ */

const miniRoot = mkdtempSync(join(tmpdir(), 'rsb-mini-'))
const mini = new Sandbox(miniRoot, { ...caps, shell: null }, 'real')
check(tokenize('echo "hello world" \'a b\'').join('|') === 'echo|hello world|a b', 'tokenizer handles quotes → ' + tokenize('echo "hello world" \'a b\'').join('|'))

const miniEcho = await mini.shell('echo mini-works > notes.txt')
check(miniEcho.ok && miniEcho.mode === 'mini-shell' && readFileSync(join(miniRoot, 'notes.txt'), 'utf8').startsWith('mini-works'), 'mini-shell writes files through redirects → ' + miniEcho.mode)
const miniChain = await mini.shell('mkdir -p site && echo "<h1>hi</h1>" > site/index.html && ls site && cat site/index.html')
check(miniChain.ok && /index\.html/.test(miniChain.text) && /<h1>hi<\/h1>/.test(miniChain.text), 'mini-shell handles && chains, ls and cat → ' + JSON.stringify(miniChain.text.trim()))
const miniHtml = await mini.shell('echo "<h1>hi</h1>" > page.html')
check(miniHtml.ok && readFileSync(join(miniRoot, 'page.html'), 'utf8').trim() === '<h1>hi</h1>', 'redirects survive ">" inside quoted arguments (HTML)')
const miniAppend = await mini.shell('echo second >> notes.txt')
check(miniAppend.ok && /mini-works[\s\S]*second/.test(readFileSync(join(miniRoot, 'notes.txt'), 'utf8')), 'mini-shell appends with >>')
const miniGrep = await mini.shell('grep h1 site/index.html')
check(miniGrep.ok && /<h1>hi<\/h1>/.test(miniGrep.text), 'mini-shell grep works')
const miniNode = await mini.shell('node -e "require(\'fs\').writeFileSync(\'from-node.txt\',\'yes\')"')
check(miniNode.ok && readFileSync(join(miniRoot, 'from-node.txt'), 'utf8') === 'yes', 'mini-shell still spawns real node')
const miniUnknown = await mini.shell('curl http://example.com')
check(miniUnknown.ok === false && /command not found/.test(miniUnknown.text), 'unknown commands fail honestly with the built-in list → ' + miniUnknown.text.slice(0, 60))
const miniPipe = await mini.shell('cat notes.txt | grep second')
check(miniPipe.ok === false && /pipes are not supported/.test(miniPipe.text), 'pipes are rejected with guidance instead of a silent no-op')
const miniEscape = await mini.shell('echo x > ../outside.txt')
check(miniEscape.ok === false && /escapes the project/.test(miniEscape.text), 'mini-shell redirects cannot escape the project')
mini.dispose()

/* ------------------------------------------------------------------ */
/* C. honest degradation: no real sandbox on this host                  */
/* ------------------------------------------------------------------ */

process.env.RSB_SANDBOX = 'vm'
__resetCapabilities()
const vmCaps = capabilities()
check(vmCaps.real === false, 'RSB_SANDBOX=vm → capability probe says "not real"')
const vmBox = await createSandbox('vm-run')
check(vmBox.mode === 'vm' && vmBox.root === null, 'vm sandbox has no project directory (nothing pretends to be a filesystem)')
const vmShell = await vmBox.shell('ls')
check(vmShell.ok === false && /unavailable|disabled/i.test(vmShell.text), 'run_shell degrades with an honest message → ' + vmShell.text.slice(0, 60))
const vmFiles = new Map([['notes.md', '# old']])
const vmRun = await vmBox.runNode("workspace.write('notes.md', '# new'); workspace.list().join(',')", { workspaceFiles: vmFiles })
check(vmRun.ok && vmRun.mode === 'vm' && vmFiles.get('notes.md') === '# new', 'run_code falls back to the in-process vm with the workspace bridge → ' + vmRun.text.trim())
check(executeInVm('1+1').text.includes('→ 2'), 'executeInVm keeps completion-value semantics')
vmBox.dispose()
delete process.env.RSB_SANDBOX
__resetCapabilities()

/* ------------------------------------------------------------------ */
/* D. client-supplied workspace overrides                               */
/* ------------------------------------------------------------------ */

check(sanitizeSeedFiles({ 'index.html': '<h1>edited</h1>', 'styles.css': 'body{}' })?.['index.html'] === '<h1>edited</h1>', 'sanitizeSeedFiles accepts a browser-edited workspace')
check(sanitizeSeedFiles({ '../escape.txt': 'x', 'a/../../b.txt': 'y' }) === null, 'sanitizeSeedFiles rejects paths that escape the project')
check(sanitizeSeedFiles({ 'node_modules/a/b.js': 'z' }) === null, 'sanitizeSeedFiles rejects dependency dirs')
check(sanitizeSeedFiles({ '/etc/passwd': 'y' })?.['etc/passwd'] === 'y', 'browser-absolute paths are normalized INSIDE the project, never to the real /etc → ' + JSON.stringify(sanitizeSeedFiles({ '/etc/passwd': 'y' })))
check(sanitizeSeedFiles({ 'a.txt': 'x'.repeat(200_001) }) === null, 'sanitizeSeedFiles rejects oversized files')
check(sanitizeSeedFiles({ a: 1, b: null, 'c.txt': 'ok' })?.['c.txt'] === 'ok' && Object.keys(sanitizeSeedFiles({ a: 1, 'c.txt': 'ok' }) ?? {}).length === 1, 'sanitizeSeedFiles drops non-string values')
check(sanitizeSeedFiles(null) === null && sanitizeSeedFiles([]) === null, 'sanitizeSeedFiles ignores junk input')
const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => ['f' + i + '.txt', 'x']))
check(Object.keys(sanitizeSeedFiles(many) ?? {}).length === 12, 'sanitizeSeedFiles caps the file count (12)')

/* ------------------------------------------------------------------ */
/* E. client sandbox helpers (real TS, transpiled by esbuild)           */
/* ------------------------------------------------------------------ */

const tmpDir = mkdtempSync(join(tmpdir(), 'rsb-client-'))
const bundlePath = join(tmpDir, 'sandbox-client.mjs')
await build({
  entryPoints: [join(here, '..', 'src', 'lib', 'sandbox.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: bundlePath,
  logLevel: 'silent',
})
const client = await import(bundlePath)

const project = [
  { path: 'index.html', content: '<!doctype html><html><head><link rel="stylesheet" href="styles.css"></head><body><h1>Hi</h1><img src="logo.png"><script src="app.js"></script></body></html>' },
  { path: 'styles.css', content: 'body{background:#111}' },
  { path: 'app.js', content: 'console.log("from app.js"); const x = "</script>";' },
  { path: 'notes.md', content: '# notes' },
]
check(client.pickEntry(project) === 'index.html', 'pickEntry prefers index.html')
check(client.pickEntry([{ path: 'a/page.html' }, { path: 'b.txt' }]) === 'a/page.html', 'pickEntry falls back to any html, then to the first file')

const preview = client.buildPreview(project, 'index.html', [{ name: 'logo.png', mime: 'image/png', base64: 'aGVsbG8=' }])
check(/<style data-src="styles\.css">[\s\S]*background:#111/.test(preview), 'preview inlines the project stylesheet')
check(/<script data-src="app\.js">[\s\S]*from app\.js/.test(preview), 'preview inlines the project script')
check(/src="data:image\/png;base64,aGVsbG8="/.test(preview), 'preview inlines delivered binary assets as data URIs')
check(/rsb-sandbox/.test(preview) && preview.indexOf('rsb-sandbox') < preview.indexOf('from app.js'), 'console bridge is injected BEFORE project scripts so early errors are caught')
check(!/<\/script>";/.test(preview), 'inlined code cannot break out of its script tag')
check(client.buildPreview(project, 'notes.md').includes('<pre>'), 'non-html entries preview as text')
check(client.buildPreview(project, null) === '', 'no entry → empty preview')

const zip = client.zipStore([
  { name: 'index.html', data: new TextEncoder().encode('<h1>zip</h1>') },
  { name: 'site/app.js', data: new TextEncoder().encode('console.log(1)') },
])
check(zip[0] === 0x50 && zip[1] === 0x4b, 'client zip starts with the PK magic')
const unzipped = readStoreZip(zip)
check(unzipped.get('index.html') === '<h1>zip</h1>' && unzipped.get('site/app.js') === 'console.log(1)', 'client zip round-trips (parsed back with an independent reader) → ' + [...unzipped.keys()].join(', '))
check(client.crc32(new TextEncoder().encode('123456789')) === 0xcbf43926, 'crc32 matches the reference check value')

rmSync(tmpDir, { recursive: true, force: true })

/** Independent store-zip reader: proves the writer produces a valid archive. */
function readStoreZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let eocd = -1
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('no EOCD')
  const count = view.getUint16(eocd + 10, true)
  let at = view.getUint32(eocd + 16, true)
  const out = new Map()
  for (let n = 0; n < count; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error('bad central directory at ' + at)
    const nameLen = view.getUint16(at + 28, true)
    const extraLen = view.getUint16(at + 30, true)
    const commentLen = view.getUint16(at + 32, true)
    const localOffset = view.getUint32(at + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen))
    const lNameLen = view.getUint16(localOffset + 26, true)
    const lExtraLen = view.getUint16(localOffset + 28, true)
    const size = view.getUint32(localOffset + 18, true)
    const start = localOffset + 30 + lNameLen + lExtraLen
    out.set(name, new TextDecoder().decode(bytes.subarray(start, start + size)))
    at += 46 + nameLen + extraLen + commentLen
  }
  return out
}

/* ------------------------------------------------------------------ */
/* F. workspace.zip from the orchestrator is a valid archive too        */
/* ------------------------------------------------------------------ */

const probeDir = mkdtempSync(join(tmpdir(), 'rsb-zipfile-'))
const probeZip = join(probeDir, 'probe.zip')
writeFileSync(probeZip, Buffer.from(zip))
const unzipCli = spawnSync('unzip', ['-l', probeZip], { encoding: 'utf8' })
if (unzipCli.status === 0) {
  check(/index\.html/.test(unzipCli.stdout) && /site\/app\.js/.test(unzipCli.stdout), 'system unzip accepts the archive we generate')
} else {
  console.log('SKIP  system unzip not available (the built-in reader above already validated the archive)')
}
rmSync(probeDir, { recursive: true, force: true })

console.log(ok ? '\nSANDBOX OK' : '\nSANDBOX FAILED')
process.exit(ok ? 0 : 1)
