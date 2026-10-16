import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileCode2, Play, RotateCcw, TerminalSquare, Trash2, Wand2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'
import type { RunState } from '@/lib/agent'
import {
  buildPreview,
  downloadBlob,
  downloadText,
  pickEntry,
  zipStore,
  type SandboxBinary,
  type SandboxFile,
} from '@/lib/sandbox'

type ConsoleEntry = { id: number; level: 'log' | 'info' | 'warn' | 'error' | 'debug'; text: string; ts: number }

const PREVIEW_DEBOUNCE_MS = 450
const MAX_CONTINUE_FILES = 12

/**
 * The visible half of the sandbox: the same project the agent just built,
 * editable, with a live preview and a REAL browser console. Edits can be
 * handed back to the agent ("continue with my edits") — the next run seeds
 * its workspace from them, so the human and the agent share one project.
 */
export function Sandbox({
  state,
  onArmFiles,
  armedCount,
}: {
  state: RunState
  onArmFiles: (files: Record<string, string>) => void
  armedCount: number
}) {
  const { t } = useI18n()
  const agentFiles = useMemo<SandboxFile[]>(() => {
    const fromEvents = state.files.map((f) => ({ path: f.path, content: f.content }))
    if (fromEvents.length) return fromEvents
    // gallery/external previews carry only the artifact html — still remixable
    if (state.artifact?.html) return [{ path: state.artifact.fileName || 'index.html', content: state.artifact.html }]
    return []
  }, [state.files, state.artifact])
  const binaries = useMemo<SandboxBinary[]>(
    () =>
      (state.artifact?.downloads ?? [])
        .filter((d) => /^image\//.test(d.mime))
        .map((d) => ({ name: d.name, mime: d.mime, base64: d.base64 })),
    [state.artifact],
  )

  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [activePath, setActivePath] = useState<string | null>(null)
  const [liveTick, setLiveTick] = useState(0)
  const [logs, setLogs] = useState<ConsoleEntry[]>([])
  const [hint, setHint] = useState<string | null>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // A new run replaces the project: drop stale edits. Files arriving DURING a
  // run must not wipe what the user already typed, so the key is the run only.
  useEffect(() => {
    setDrafts({})
    setActivePath(null)
    setLogs([])
  }, [state.jobId])

  // follow the entry file once the project has one
  useEffect(() => {
    if (activePath === null && agentFiles.length) setActivePath(pickEntry(agentFiles))
  }, [agentFiles, activePath])

  const files = useMemo<SandboxFile[]>(
    () => agentFiles.map((f) => (drafts[f.path] !== undefined ? { ...f, content: drafts[f.path] } : f)),
    [agentFiles, drafts],
  )
  const changed = useMemo(
    () => files.filter((f) => drafts[f.path] !== undefined && drafts[f.path] !== agentFiles.find((a) => a.path === f.path)?.content),
    [files, drafts, agentFiles],
  )

  const entry = useMemo(() => pickEntry(files, activePath), [files, activePath])
  const editorPath = activePath && files.some((f) => f.path === activePath) ? activePath : entry
  const editorFile = files.find((f) => f.path === editorPath) ?? null
  const editorValue = editorFile ? (drafts[editorFile.path] ?? editorFile.content) : ''

  // Live preview: rebuild from the debounced snapshot, not on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setLiveTick((n) => n + 1), PREVIEW_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [drafts, files])
  const previewHtml = useMemo(() => buildPreview(files, entry, binaries), [files, entry, binaries, liveTick]) // eslint-disable-line react-hooks/exhaustive-deps

  // Real browser console from the preview iframe.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; level?: ConsoleEntry['level']; text?: string } | null
      if (data?.source !== 'rsb-sandbox') return
      setLogs((prev) => [
        ...prev.slice(-199),
        { id: Date.now() + Math.random(), level: data.level ?? 'log', text: String(data.text ?? ''), ts: Date.now() },
      ])
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  const edit = useCallback((path: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [path]: value }))
  }, [])

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget
    if (event.key === 'Tab') {
      event.preventDefault()
      const start = target.selectionStart
      const end = target.selectionEnd
      const next = editorValue.slice(0, start) + '  ' + editorValue.slice(end)
      if (editorFile) edit(editorFile.path, next)
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2
      })
      return
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      setLiveTick((n) => n + 1)
      setHint(t('app.sandboxRan'))
      window.setTimeout(() => setHint(null), 1800)
    }
    if (event.key === 'Enter') {
      // keep the indent of the previous line — small thing, feels like an editor
      const start = target.selectionStart
      const before = editorValue.slice(0, start)
      const lineStart = before.lastIndexOf('\n') + 1
      const indent = /^[ \t]*/.exec(before.slice(lineStart))?.[0] ?? ''
      if (indent && editorFile) {
        event.preventDefault()
        const next = before + '\n' + indent + editorValue.slice(target.selectionEnd)
        edit(editorFile.path, next)
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = start + 1 + indent.length
        })
      }
    }
  }

  const resetFile = () => {
    if (!editorFile) return
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[editorFile.path]
      return next
    })
  }

  const resetAll = () => {
    setDrafts({})
    setLogs([])
  }

  const downloadCurrent = () => {
    if (!editorFile) return
    downloadText(editorFile.path.split('/').pop() ?? 'file.txt', drafts[editorFile.path] ?? editorFile.content)
  }

  const downloadZip = () => {
    const enc = new TextEncoder()
    const entries = files.map((f) => ({ name: f.path, data: enc.encode(drafts[f.path] ?? f.content) }))
    if (!entries.length) return
    const zip = zipStore(entries)
    downloadBlob('rsb-project.zip', new Blob([zip as unknown as BlobPart], { type: 'application/zip' }))
  }

  const armEdits = () => {
    if (!changed.length) return
    const payload: Record<string, string> = {}
    for (const file of changed.slice(0, MAX_CONTINUE_FILES)) payload[file.path] = file.content
    onArmFiles(payload)
  }

  const lineCount = editorValue.split('\n').length
  const sandbox = state.sandbox

  if (!files.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <TerminalSquare size={22} className="text-faint" />
        <p className="max-w-sm text-[13px] leading-relaxed text-faint">{t('app.sandboxEmpty')}</p>
        {sandbox ? (
          <p className="font-mono text-[10.5px] text-faint/70">
            {sandbox.mode}
            {sandbox.node ? ' · node ' + sandbox.node : ''}
            {sandbox.shellBinary ? ' · ' + sandbox.shellBinary : ''}
            {sandbox.npm ? ' · npm' : ''}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-line bg-surface/40 px-2.5 py-2">
        <button
          type="button"
          onClick={() => { setLiveTick((n) => n + 1); setLogs([]); setHint(t('app.sandboxRan')) }}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent/15 px-2.5 py-1 text-[11.5px] font-semibold text-accent transition-colors hover:bg-accent/25"
        >
          <Play size={12} /> {t('app.sandboxRun')}
        </button>
        <button
          type="button"
          onClick={armEdits}
          disabled={!changed.length}
          title={t('app.sandboxArmHint')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11.5px] font-semibold transition-colors',
            changed.length
              ? 'border-accent/40 text-accent hover:bg-accent/10'
              : 'border-line text-faint/60',
          )}
        >
          <Wand2 size={12} /> {t('app.sandboxArm')}
          {changed.length ? <span className="rounded-full bg-accent/20 px-1.5 text-[10px]">{changed.length}</span> : null}
        </button>
        <button
          type="button"
          onClick={downloadCurrent}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[11.5px] text-muted transition-colors hover:text-fg"
        >
          <Download size={12} /> {t('app.sandboxDownload')}
        </button>
        <button
          type="button"
          onClick={downloadZip}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[11.5px] text-muted transition-colors hover:text-fg"
        >
          <FileCode2 size={12} /> .zip
        </button>
        <button
          type="button"
          onClick={resetFile}
          disabled={!editorFile || drafts[editorFile.path] === undefined}
          title={t('app.sandboxResetFile')}
          aria-label={t('app.sandboxResetFile')}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[11.5px] text-muted transition-colors hover:text-fg disabled:text-faint/50"
        >
          <RotateCcw size={12} />
          <span className="hidden xl:inline">{t('app.sandboxResetFile')}</span>
        </button>
        <button
          type="button"
          onClick={resetAll}
          disabled={!changed.length}
          title={t('app.sandboxResetAll')}
          aria-label={t('app.sandboxResetAll')}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[11.5px] text-muted transition-colors hover:text-fg disabled:text-faint/50"
        >
          <Trash2 size={12} />
          <span className="hidden xl:inline">{t('app.sandboxResetAll')}</span>
        </button>
        <span className="ml-auto flex items-center gap-2 font-mono text-[10px] text-faint">
          {hint ? <span className="text-accent">{hint}</span> : null}
          {armedCount ? <span className="text-cyan">{t('app.sandboxArmed', { count: armedCount })}</span> : null}
          {sandbox ? (
            <span title={t('app.sandboxCapsHint')}>
              {sandbox.mode === 'real' ? '● ' : '○ '}
              {sandbox.mode}
              {sandbox.node ? ' · node ' + sandbox.node.replace(/^v/, '') : ''}
              {sandbox.npm ? ' · npm' : ''}
            </span>
          ) : null}
        </span>
      </div>

      {/* editor + preview */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 w-full flex-col border-b border-line lg:w-[46%] lg:border-b-0 lg:border-r">
          <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-surface/30 px-2 py-1.5">
            {files.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setActivePath(file.path)}
                className={cn(
                  'shrink-0 rounded-md px-2 py-1 font-mono text-[10.5px] transition-colors',
                  file.path === editorPath ? 'bg-surface-2 text-fg' : 'text-faint hover:text-muted',
                )}
              >
                {file.path.split('/').pop()}
                {drafts[file.path] !== undefined && drafts[file.path] !== agentFiles.find((a) => a.path === file.path)?.content ? (
                  <span className="ml-1 text-accent">●</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="flex min-h-[180px] flex-1 overflow-hidden bg-[#0a0a0f]">
            <div
              ref={gutterRef}
              className="shrink-0 select-none overflow-hidden border-r border-white/5 px-2 py-2.5 text-right font-mono text-[11px] leading-[1.55] text-[#3d3d4a]"
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={areaRef}
              value={editorValue}
              onChange={(event) => editorFile && edit(editorFile.path, event.target.value)}
              onKeyDown={onKeyDown}
              onScroll={() => {
                if (gutterRef.current && areaRef.current) gutterRef.current.scrollTop = areaRef.current.scrollTop
              }}
              spellCheck={false}
              wrap="off"
              className="min-w-0 flex-1 resize-none bg-transparent p-2.5 font-mono text-[12px] leading-[1.55] text-[#c9d1d9] outline-none"
              style={{ tabSize: 2 }}
            />
          </div>
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface/30 px-3 py-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{t('app.sandboxPreview')}</span>
            {entry ? <span className="truncate font-mono text-[10px] text-faint/70">{entry}</span> : null}
            <span className="ml-auto font-mono text-[10px] text-faint">{logs.length} log</span>
          </div>
          <iframe
            key={liveTick + ':' + (entry ?? '')}
            title="sandbox preview"
            srcDoc={previewHtml}
            sandbox="allow-scripts allow-modals allow-forms allow-popups"
            className="min-h-[220px] w-full flex-1 bg-white"
          />
        </div>
      </div>

      {/* browser console of the preview */}
      <div className="shrink-0 border-t border-line bg-[#0a0a0f]">
        <div className="flex items-center gap-2 border-b border-white/5 px-3 py-1.5">
          <TerminalSquare size={11} className="text-faint" />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{t('app.sandboxConsole')}</span>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="ml-auto font-mono text-[10px] text-faint transition-colors hover:text-fg"
          >
            clear
          </button>
        </div>
        <div ref={logRef} className="max-h-28 overflow-y-auto px-3 py-1.5 font-mono text-[11px] leading-relaxed">
          {logs.length ? (
            logs.map((entry2) => (
              <p
                key={entry2.id}
                className={cn(
                  'whitespace-pre-wrap',
                  entry2.level === 'error'
                    ? 'text-[#ff7b72]'
                    : entry2.level === 'warn'
                      ? 'text-[#e3b341]'
                      : entry2.level === 'info' || entry2.level === 'debug'
                        ? 'text-[#79c0ff]'
                        : 'text-[#c9d1d9]/85',
                )}
              >
                <span className="mr-2 text-[#3d3d4a]">{new Date(entry2.ts).toLocaleTimeString()}</span>
                {entry2.text}
              </p>
            ))
          ) : (
            <p className="text-[#3d3d4a]">{t('app.sandboxConsoleEmpty')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
