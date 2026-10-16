/**
 * Sandbox v3 — the real thing.
 *
 * Until now the "sandbox" was a `node:vm` context: no filesystem, no network,
 * no npm, no shell. The product promise ("you write a line, the agent builds
 * the thing in its sandbox") needs the same surface an agent normally gets:
 *
 *   • a REAL project directory on disk (cwd for every tool)
 *   • run_code  → a real Node child process (fs, net, require/import, npm deps)
 *   • run_shell → a real /bin/sh child process (or a built-in mini-shell when
 *                 the platform has no shell binary — Vercel/Lambda insurance)
 *   • every file tool reads/writes that directory, and the directory is
 *     synced back into the run workspace so artifacts/zip/hosting keep working
 *
 * Boundary model (honest): the isolation is the platform's (Lambda microVM /
 * container), the ephemeral /tmp filesystem, and a SCRUBBED ENV — the child
 * never sees provider keys or RSB_SESSION_SECRET. It is not a path jail: in
 * `full` mode the model can read the machine like any shell user could.
 *
 * Modes (`RSB_SANDBOX`):
 *   full (default) → real fs + shell/node child processes
 *   fs             → real fs, no child processes (run_code falls back to vm)
 *   vm             → in-process vm only (legacy behaviour)
 *   off            → same as vm, and run_shell reports itself unavailable
 */
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'
import vm from 'node:vm'

const CODE_TIMEOUT_MS = Number(process.env.RSB_CODE_TIMEOUT_MS || 20_000)
const SHELL_TIMEOUT_MS = Number(process.env.RSB_SHELL_TIMEOUT_MS || 20_000)
const HARD_TIMEOUT_MS = 60_000 // never let one tool call eat the function budget
const MAX_OUTPUT = 24_000 // chars returned to the model per execution
const MAX_FILES = 60 // workspace sync caps (node_modules must never be synced)
const MAX_TEXT_FILE = 200_000
const MAX_BIN_FILE = 400_000
const MAX_BIN_FILES = 8
const SKIP_DIRS = new Set(['node_modules', '.git', '.rsb', '.cache', '.next', 'dist-cache'])

const TEXT_EXT = new Set([
  'html', 'htm', 'css', 'scss', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'json', 'svg', 'md',
  'markdown', 'txt', 'csv', 'tsv', 'srt', 'vtt', 'xml', 'yml', 'yaml', 'toml', 'ini', 'sh',
  'py', 'rb', 'go', 'rs', 'php', 'sql', 'env', 'gitignore', 'log',
])

export const sandboxMode = () => String(process.env.RSB_SANDBOX || 'full').toLowerCase()

/* ------------------------------------------------------------------ */
/* Capability probe (cached): what does THIS runtime actually allow?    */
/* ------------------------------------------------------------------ */

let capsCache = null

/** Cheap, cached truth about the host: shell binary, node binary, npm, /tmp. */
export function capabilities() {
  if (capsCache) return capsCache
  const mode = sandboxMode()
  let tmpWritable = false
  let tmpProbe = null
  try {
    const dir = mkdtempSync(join(tmpdir(), 'rsb-probe-'))
    writeFileSync(join(dir, 'ok'), '1')
    tmpWritable = readFileSync(join(dir, 'ok'), 'utf8') === '1'
    tmpProbe = dir
  } catch {
    tmpWritable = false
  } finally {
    if (tmpProbe) { try { rmSync(tmpProbe, { recursive: true, force: true }) } catch { /* best effort */ } }
  }

  let shell = null
  if (mode === 'full' && tmpWritable) {
    for (const candidate of ['/bin/sh', '/bin/bash', '/usr/bin/sh']) {
      try {
        const probe = spawnSync(candidate, ['-c', 'echo rsb-shell-ok'], { timeout: 4000, encoding: 'utf8' })
        if (probe.status === 0 && /rsb-shell-ok/.test(probe.stdout || '')) { shell = candidate; break }
      } catch { /* try the next candidate */ }
    }
  }

  let node = null
  let nodeOk = false
  if (mode === 'full' && tmpWritable) {
    try {
      const probe = spawnSync(process.execPath, ['-e', 'process.stdout.write("rsb-node-ok")'], { timeout: 6000, encoding: 'utf8' })
      nodeOk = /rsb-node-ok/.test(probe.stdout || '')
      if (nodeOk) node = process.version
    } catch { nodeOk = false }
  }

  let npm = false
  if (nodeOk) {
    try {
      const probe = spawnSync('npm', ['-v'], { timeout: 8000, encoding: 'utf8', env: scrubbedEnv(tmpdir()) })
      npm = probe.status === 0 && /\d/.test(probe.stdout || '')
    } catch { npm = false }
  }

  capsCache = {
    mode: mode === 'full' && !tmpWritable ? 'vm' : mode,
    tmpWritable,
    shell,
    node,
    npm,
    execPath: process.execPath,
    real: mode === 'full' && tmpWritable,
  }
  return capsCache
}

/** Test hook: forget the cached probe (used after flipping RSB_SANDBOX). */
export function __resetCapabilities() { capsCache = null }

/* ------------------------------------------------------------------ */
/* Env scrubbing — the single most important line of defence            */
/* ------------------------------------------------------------------ */

const SAFE_PATH = ['/usr/local/bin', '/usr/bin', '/bin', '/usr/local/sbin', '/usr/sbin', '/sbin'].join(':')

/**
 * Children get NO inherited environment: provider keys, session secrets and
 * store ids must never be readable by model-generated code. Only the minimum
 * needed to run node/sh utilities, with HOME/TMPDIR pointed inside the project.
 */
export function scrubbedEnv(root) {
  return {
    PATH: SAFE_PATH,
    HOME: root,
    TMPDIR: join(root, '.tmp'),
    TEMP: join(root, '.tmp'),
    TMP: join(root, '.tmp'),
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    NODE_ENV: 'production',
    RSB_SANDBOX: '1',
    RSB_PROJECT: root,
  }
}

/* ------------------------------------------------------------------ */
/* Path guard                                                           */
/* ------------------------------------------------------------------ */

/** Resolves a model-supplied path inside the project root, or null. */
export function safeJoin(root, relPath) {
  const raw = String(relPath ?? '').trim()
  if (!raw) return null
  if (raw.includes('\0')) return null
  const abs = resolve(root, raw.replace(/^~\//, ''))
  if (abs !== root && !abs.startsWith(root.endsWith(sep) ? root : root + sep)) return null
  if (abs.split(sep).some((part) => part === 'node_modules' || part === '.git')) return null
  return abs
}

/* ------------------------------------------------------------------ */
/* Mini-shell: real fs semantics without a shell binary                 */
/* ------------------------------------------------------------------ */

/** Quote-aware argv split (single/double quotes, backslash escapes). */
export function tokenize(cmd) {
  const out = []
  let cur = ''
  let quote = null
  let has = false
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i]
    if (quote) {
      if (ch === quote) quote = null
      else if (ch === '\\' && quote === '"' && cmd[i + 1]) cur += cmd[++i]
      else cur += ch
      continue
    }
    if (ch === '"' || ch === "'") { quote = ch; has = true; continue }
    if (ch === '\\' && cmd[i + 1]) { cur += cmd[++i]; has = true; continue }
    if (/\s/.test(ch)) { if (has || cur) out.push(cur); cur = ''; has = false; continue }
    cur += ch
    has = true
  }
  if (has || cur) out.push(cur)
  return out
}

/** Finds the first UNQUOTED `>` / `>>` so redirects survive HTML in arguments. */
function splitRedirect(segment) {
  let quote = null
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i]
    if (quote) {
      if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") { quote = ch; continue }
    if (ch === '\\') { i++; continue }
    if (ch === '>' && segment[i - 1] !== '>') {
      const append = segment[i + 1] === '>'
      return { body: segment.slice(0, i), target: segment.slice(i + (append ? 2 : 1)).trim(), append }
    }
  }
  return null
}

const fmtSize = (n) => (n < 1024 ? String(n) + 'B' : n < 1_048_576 ? (n / 1024).toFixed(1) + 'K' : (n / 1_048_576).toFixed(1) + 'M')

/**
 * Built-in shell for hosts without /bin/sh. Small on purpose: the commands an
 * agent actually needs to inspect and shape its project directory.
 */
async function miniShell(root, cmd) {
  const segments = String(cmd).split('&&').map((s) => s.trim()).filter(Boolean)
  const out = []
  for (const segment of segments) {
    if (segment.includes('|')) return { ok: false, text: 'mini-shell: pipes are not supported (no /bin/sh on this host). Use run_code with node:fs instead.' }
    const redirected = splitRedirect(segment)
    const redirect = redirected?.target ?? null
    const append = Boolean(redirected?.append)
    const body = redirected ? redirected.body : segment
    const argv = tokenize(body.trim())
    if (!argv.length) continue
    const [bin, ...args] = argv
    const target = (p) => safeJoin(root, p)

    let text = ''
    try {
      switch (bin) {
        case 'pwd': text = root; break
        case 'echo': text = args.join(' '); break
        case 'ls': {
          const dir = args.filter((a) => !a.startsWith('-'))[0] || '.'
          const abs = target(dir)
          if (!abs) throw new Error('ls: path escapes the project: ' + dir)
          const names = readdirSync(abs)
          text = args.includes('-l')
            ? names.map((n) => { const st = statSync(join(abs, n)); return (st.isDirectory() ? 'd' : '-') + ' ' + fmtSize(st.size).padStart(7) + ' ' + n }).join('\n')
            : names.join('\n')
          break
        }
        case 'cat': {
          text = args.map((p) => { const abs = target(p); if (!abs) throw new Error('cat: path escapes the project: ' + p); return readFileSync(abs, 'utf8') }).join('')
          break
        }
        case 'head': case 'tail': {
          const n = Number((args.find((a) => /^-n?\d+$/.test(a)) || '-10').replace(/[^\d]/g, '')) || 10
          const file = args.filter((a) => !a.startsWith('-'))[0]
          const abs = target(file || '')
          if (!abs) throw new Error(bin + ': missing file')
          const lines = readFileSync(abs, 'utf8').split('\n')
          text = (bin === 'head' ? lines.slice(0, n) : lines.slice(-n)).join('\n')
          break
        }
        case 'wc': {
          const file = args.filter((a) => !a.startsWith('-'))[0]
          const abs = target(file || '')
          const src = abs ? readFileSync(abs, 'utf8') : ''
          text = (src.split('\n').length - 1) + ' ' + src.split(/\s+/).filter(Boolean).length + ' ' + src.length + (file ? ' ' + file : '')
          break
        }
        case 'grep': {
          const pattern = args.filter((a) => !a.startsWith('-'))[0]
          const file = args.filter((a) => !a.startsWith('-'))[1]
          const abs = target(file || '')
          if (!abs) throw new Error('grep: missing file')
          const re = new RegExp(pattern, args.includes('-i') ? 'i' : '')
          text = readFileSync(abs, 'utf8').split('\n').filter((l) => re.test(l)).join('\n')
          break
        }
        case 'mkdir': {
          for (const p of args.filter((a) => !a.startsWith('-'))) { const abs = target(p); if (!abs) throw new Error('mkdir: path escapes the project'); mkdirSync(abs, { recursive: true }) }
          break
        }
        case 'touch': {
          for (const p of args) { const abs = target(p); if (!abs) throw new Error('touch: path escapes the project'); mkdirSync(dirname(abs), { recursive: true }); if (!existsSync(abs)) writeFileSync(abs, '') }
          break
        }
        case 'rm': {
          for (const p of args.filter((a) => !a.startsWith('-'))) { const abs = target(p); if (!abs) throw new Error('rm: path escapes the project'); rmSync(abs, { recursive: args.includes('-r') || args.includes('-rf'), force: true }) }
          break
        }
        case 'cp': case 'mv': {
          const [src, dst] = args.filter((a) => !a.startsWith('-'))
          const s = target(src); const d = target(dst)
          if (!s || !d) throw new Error(bin + ': path escapes the project')
          const data = readFileSync(s)
          mkdirSync(dirname(d), { recursive: true })
          writeFileSync(d, data)
          if (bin === 'mv') rmSync(s, { recursive: true, force: true })
          break
        }
        case 'node': {
          // node runs as a real child process even in mini-shell mode
          const res = await runChild(process.execPath, args, root, SHELL_TIMEOUT_MS)
          if (!res.ok) return res
          text = res.text
          break
        }
        case 'npm': case 'npx':
          return { ok: false, text: 'mini-shell: npm is not available on this host. Use run_code (node:fs / fetch) or write the files directly.' }
        case 'cd':
          return { ok: false, text: 'mini-shell: cd does not persist between calls — every command already runs in the project root.' }
        default:
          return { ok: false, text: 'mini-shell: command not found: ' + bin + ' (built-ins: ls cat echo pwd mkdir rm touch cp mv head tail wc grep node). No /bin/sh on this host — use run_code for anything else.' }
      }
    } catch (error) {
      return { ok: false, text: bin + ': ' + String(error?.message ?? error) }
    }
    if (redirect) {
      const abs = target(redirect)
      if (!abs) return { ok: false, text: 'redirect: path escapes the project' }
      mkdirSync(dirname(abs), { recursive: true })
      const before = append && existsSync(abs) ? readFileSync(abs, 'utf8') : ''
      writeFileSync(abs, before + text + '\n')
    } else if (text) {
      out.push(text)
    }
  }
  return { ok: true, text: out.join('\n') }
}

/* ------------------------------------------------------------------ */
/* Child processes                                                      */
/* ------------------------------------------------------------------ */

function runChild(command, args, cwd, timeoutMs) {
  return new Promise((resolveRun) => {
    let stdout = ''
    let stderr = ''
    let settled = false
    let child = null
    const finish = (ok, extra = '') => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const text = (stdout + (stderr ? (stdout ? '\n' : '') + stderr : '') + extra).slice(0, MAX_OUTPUT)
      resolveRun({ ok, text: text || '(no output)', truncated: (stdout + stderr).length > MAX_OUTPUT })
    }
    try {
      child = spawn(command, args, { cwd, env: scrubbedEnv(cwd), stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      return finish(false, '\nspawn failed: ' + String(error?.message ?? error))
    }
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL') } catch { /* already gone */ }
      finish(false, '\n[killed: timeout after ' + Math.round(timeoutMs / 1000) + 's]')
    }, Math.min(timeoutMs, HARD_TIMEOUT_MS))
    child.stdout.on('data', (d) => { stdout += d.toString(); if (stdout.length > MAX_OUTPUT * 2) { try { child.kill('SIGKILL') } catch { /* ignore */ } } })
    child.stderr.on('data', (d) => { stderr += d.toString() })
    child.on('error', (error) => finish(false, '\nspawn error: ' + String(error?.message ?? error)))
    child.on('close', (code, sig) => finish(code === 0 && !sig, code === 0 ? '' : '\n[exit ' + code + (sig ? ' signal ' + sig : '') + ']'))
  })
}

/** True when the snippet uses ESM syntax and must run as a real .mjs file. */
function needsModuleFile(code) {
  return (
    /^\s*import\s.+from\s/m.test(code) ||
    /^\s*import\s*['"]/m.test(code) ||
    /^\s*import\s*[({]/m.test(code) ||
    /^\s*export\s/m.test(code) ||
    /^\s*await\s/m.test(code)
  )
}

/**
 * Prepended to ESM runs so `require('fs')` still resolves inside a module:
 * top-level await forces .mjs, and models reach for require() out of habit.
 */
const ESM_PROLOGUE = `import { createRequire as __rsbCreateRequire } from 'node:module';
if (!globalThis.require) globalThis.require = __rsbCreateRequire(process.cwd() + '/noop.js');
`

/**
 * Runner injected around non-ESM snippets. It contextifies the CHILD's own
 * global object, so the model's code gets the real Node runtime (require,
 * process, fetch, fs, net) while keeping the vm completion-value semantics
 * the tool contract promises (`40 + 2` → `→ 42`).
 */
const CJS_RUNNER = `
const fs = require('node:fs');
const vm = require('node:vm');
const util = require('node:util');
const { createRequire } = require('node:module');
const projectRequire = createRequire(process.cwd() + '/noop.js');
globalThis.require = projectRequire;
globalThis.module = { exports: {} };
globalThis.exports = globalThis.module.exports;
try { vm.createContext(globalThis); } catch { /* already contextified */ }
const code = fs.readFileSync(process.argv[2], 'utf8');
try {
  const value = vm.runInContext(code, globalThis, {
    timeout: Number(process.argv[3] || 20000),
    displayErrors: true,
    filename: 'sandbox.js',
  });
  if (value !== undefined) {
    const shown = typeof value === 'object' ? util.inspect(value, { depth: 3, breakLength: 120 }) : String(value);
    process.stdout.write('\\n→ ' + shown.slice(0, 4000) + '\\n');
  }
} catch (error) {
  process.stderr.write(String((error && error.stack) || error) + '\\n');
  process.exit(1);
}
`

/* ------------------------------------------------------------------ */
/* The sandbox                                                          */
/* ------------------------------------------------------------------ */

export class Sandbox {
  constructor(root, caps, mode) {
    this.root = root
    this.caps = caps
    // a real sandbox needs BOTH the capability probe and an actual project dir
    this.mode = mode ?? (caps.real && root ? 'real' : 'vm')
    this.disposed = false
    this.runs = 0
  }

  get real() { return this.mode === 'real' }

  /** Absolute path for a model-supplied relative path (null = escape). */
  abs(relPath) { return safeJoin(this.root, relPath) }

  write(relPath, content) {
    const abs = this.abs(relPath)
    if (!abs) return { ok: false, error: 'path escapes the project sandbox: ' + relPath }
    try {
      mkdirSync(dirname(abs), { recursive: true })
      writeFileSync(abs, String(content), 'utf8')
      return { ok: true, bytes: Buffer.byteLength(String(content)) }
    } catch (error) {
      return { ok: false, error: String(error?.message ?? error) }
    }
  }

  writeBinary(relPath, buffer) {
    const abs = this.abs(relPath)
    if (!abs) return { ok: false, error: 'path escapes the project sandbox: ' + relPath }
    try {
      mkdirSync(dirname(abs), { recursive: true })
      writeFileSync(abs, buffer)
      return { ok: true, bytes: buffer.length }
    } catch (error) {
      return { ok: false, error: String(error?.message ?? error) }
    }
  }

  read(relPath) {
    const abs = this.abs(relPath)
    if (!abs) return { ok: false, error: 'path escapes the project sandbox: ' + relPath }
    try {
      return { ok: true, content: readFileSync(abs, 'utf8') }
    } catch (error) {
      return { ok: false, error: String(error?.message ?? error) }
    }
  }

  remove(relPath) {
    const abs = this.abs(relPath)
    if (!abs) return { ok: false, error: 'path escapes the project sandbox: ' + relPath }
    try { rmSync(abs, { recursive: true, force: true }); return { ok: true } } catch (error) { return { ok: false, error: String(error?.message ?? error) } }
  }

  edit(relPath, oldText, newText) {
    const read = this.read(relPath)
    if (!read.ok) return read
    if (!oldText || !read.content.includes(oldText)) return { ok: false, error: 'old_text not found in ' + relPath }
    const next = read.content.replace(oldText, newText)
    const wrote = this.write(relPath, next)
    return wrote.ok ? { ok: true, from: oldText.length, to: newText.length } : wrote
  }

  /** Recursive listing, relative paths + sizes (node_modules/.git excluded). */
  list() {
    const out = []
    const walk = (dir, prefix, depth) => {
      if (depth > 6 || out.length > 400) return
      let entries = []
      try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
      for (const entry of entries) {
        if (SKIP_DIRS.has(entry.name)) continue
        const abs = join(dir, entry.name)
        const rel = prefix ? prefix + '/' + entry.name : entry.name
        if (entry.isDirectory()) walk(abs, rel, depth + 1)
        else if (entry.isFile()) {
          let size = 0
          try { size = statSync(abs).size } catch { /* unreadable */ }
          out.push({ path: rel, size })
        }
      }
    }
    walk(this.root, '', 0)
    return out.sort((a, b) => a.path.localeCompare(b.path))
  }

  /**
   * Disk → run workspace. Text files land in `files` (they feed siteFiles,
   * zip, checkpoints, the Files tab); small binaries land in `binaries` so
   * generated images/decks become downloads AND hosted site assets.
   */
  syncInto(files, binaries) {
    if (!this.real) return { text: 0, binary: 0 }
    const listing = this.list()
    let text = 0
    let binary = 0
    for (const entry of listing.slice(0, MAX_FILES * 4)) {
      const ext = entry.path.split('.').pop()?.toLowerCase() ?? ''
      const abs = join(this.root, entry.path)
      const isText = TEXT_EXT.has(ext) || entry.path.split('/').pop() === 'LICENSE'
      if (isText) {
        if (entry.size > MAX_TEXT_FILE) continue
        if (files.size >= MAX_FILES && !files.has(entry.path)) continue
        try {
          files.set(entry.path, readFileSync(abs, 'utf8'))
          text++
        } catch { /* skip unreadable */ }
      } else {
        if (!binaries || entry.size > MAX_BIN_FILE || binary >= MAX_BIN_FILES) continue
        try {
          binaries.set(entry.path, readFileSync(abs))
          binary++
        } catch { /* skip unreadable */ }
      }
    }
    return { text, binary }
  }

  /** Run workspace → disk (seeds, checkpoints, resumed invocations). */
  seedFrom(files, binaries) {
    if (!this.real) return
    for (const [path, content] of files ?? []) this.write(path, content)
    for (const [name, buffer] of binaries ?? []) this.writeBinary(name, Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer))
  }

  /** Real /bin/sh when the host has one, mini-shell otherwise. */
  async shell(command, { timeoutMs = SHELL_TIMEOUT_MS } = {}) {
    if (sandboxMode() === 'off') return { ok: false, text: 'shell disabled by configuration (RSB_SANDBOX=off)', mode: 'off' }
    if (!this.real) return { ok: false, text: 'shell unavailable: this runtime cannot create a real sandbox (' + JSON.stringify({ tmp: this.caps.tmpWritable, mode: this.caps.mode }) + '). Use write_file/read_file/edit_file instead.', mode: this.mode }
    try { mkdirSync(join(this.root, '.tmp'), { recursive: true }) } catch { /* best effort */ }
    if (this.caps.shell) {
      const res = await runChild(this.caps.shell, ['-c', String(command)], this.root, timeoutMs)
      return { ...res, mode: 'shell' }
    }
    const res = await miniShell(this.root, String(command))
    return { ...res, mode: 'mini-shell' }
  }

  /** Real Node child process (fs + net + npm deps), vm fallback otherwise. */
  async runNode(code, { timeoutMs = CODE_TIMEOUT_MS, workspaceFiles } = {}) {
    if (!this.real) return { ...executeInVm(code, workspaceFiles), mode: 'vm' }
    this.runs++
    const dir = join(this.root, '.rsb')
    try { mkdirSync(dir, { recursive: true }); mkdirSync(join(this.root, '.tmp'), { recursive: true }) } catch { /* best effort */ }
    const source = String(code)
    const limit = String(Math.min(timeoutMs, HARD_TIMEOUT_MS))
    const runEsm = async (tag) => {
      const file = join(dir, 'run-' + this.runs + '-' + tag + '.mjs')
      writeFileSync(file, ESM_PROLOGUE + source, 'utf8')
      const res = await runChild(process.execPath, [file], this.root, timeoutMs)
      return { ...res, mode: 'node-esm' }
    }
    try {
      if (needsModuleFile(source)) return await runEsm('esm')
      const body = join(dir, 'run-' + this.runs + '.body.js')
      writeFileSync(body, source, 'utf8')
      writeFileSync(join(dir, 'runner.cjs'), CJS_RUNNER, 'utf8')
      const res = await runChild(process.execPath, [join(dir, 'runner.cjs'), body, limit], this.root, timeoutMs)
      // top-level await in a non-import snippet: the vm rejects it, the module
      // loader does not — retry once as .mjs instead of failing the tool call
      if (!res.ok && /SyntaxError[\s\S]*await/.test(res.text)) return await runEsm('await')
      return { ...res, mode: 'node-cjs' }
    } catch (error) {
      return { ok: false, text: 'sandbox node failed: ' + String(error?.message ?? error), mode: 'node' }
    }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    if (!this.root || !this.root.startsWith(resolve(tmpdir()))) return // never rm outside /tmp
    try { rmSync(this.root, { recursive: true, force: true, maxRetries: 2 }) } catch { /* ephemeral anyway */ }
  }
}

/** Legacy in-process vm execution (fallback when the host has no real fs). */
export function executeInVm(code, workspaceFiles) {
  const logs = []
  const sandbox = {
    console: {
      log: (...a) => logs.push(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')),
      warn: (...a) => logs.push('warn: ' + a.join(' ')),
      error: (...a) => logs.push('error: ' + a.join(' ')),
    },
    Math, JSON, Date, Intl,
    workspace: {
      list: () => (workspaceFiles ? [...workspaceFiles.keys()] : []),
      read: (path) => (workspaceFiles ? workspaceFiles.get(String(path)) ?? null : null),
      write: (path, content) => {
        if (!workspaceFiles) return false
        workspaceFiles.set(String(path), String(content))
        return true
      },
    },
  }
  try {
    const context = vm.createContext(sandbox)
    const result = vm.runInContext(String(code), context, { timeout: CODE_TIMEOUT_MS, displayErrors: true })
    if (result !== undefined) logs.push('→ ' + (typeof result === 'object' ? JSON.stringify(result) : String(result)))
    return { ok: true, text: logs.join('\n') || '(no output)' }
  } catch (error) {
    return { ok: false, text: (logs.join('\n') + '\n' + error.message).trim() }
  }
}

/**
 * Creates the project sandbox for one run. Falls back to a vm-only sandbox
 * (no root on disk) instead of failing the run when the host cannot support
 * a real filesystem — the product degrades, it never pretends.
 */
export async function createSandbox(runId, { seedFiles, seedBinaries } = {}) {
  const caps = capabilities()
  if (!caps.real) {
    return new Sandbox(null, caps, 'vm')
  }
  let root = null
  try {
    root = mkdtempSync(join(tmpdir(), 'rsb-sbx-'))
    mkdirSync(join(root, '.tmp'), { recursive: true })
  } catch {
    return new Sandbox(null, caps, 'vm')
  }
  const sandbox = new Sandbox(root, caps, 'real')
  sandbox.runId = runId
  sandbox.seedFrom(seedFiles, seedBinaries)
  return sandbox
}

export { CODE_TIMEOUT_MS, SHELL_TIMEOUT_MS, MAX_OUTPUT, MAX_FILES }

/* ------------------------------------------------------------------ */
/* Client-supplied workspace overrides                                  */
/* ------------------------------------------------------------------ */

/**
 * Validates a `files` map coming from the browser (the user edited the sandbox
 * and wants the next run to continue from THEIR version). Rejects escapes,
 * non-strings and anything oversized — the same rules the run workspace has.
 */
export function sanitizeSeedFiles(input, { maxFiles = 12, maxFileBytes = 200_000, maxTotalBytes = 400_000 } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const out = {}
  let total = 0
  for (const [rawPath, rawContent] of Object.entries(input)) {
    if (Object.keys(out).length >= maxFiles) break
    if (typeof rawContent !== 'string') continue
    const path = String(rawPath).trim().replace(/^\/+/, '')
    if (!path || path.length > 200 || path.includes('\0')) continue
    if (!safeJoin('/rsb-seed', path)) continue
    if (rawContent.length > maxFileBytes) continue
    if (total + rawContent.length > maxTotalBytes) break
    out[path] = rawContent
    total += rawContent.length
  }
  return Object.keys(out).length ? out : null
}
