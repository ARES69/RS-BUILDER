import { useCallback, useEffect, useRef, useState } from 'react'
import { initialRunState, type AgentEvent, type RunState } from './agent'
import { cancelActiveRemote, remoteEnabled, runRemote } from './remoteAgent'
import { useI18n } from '@/i18n'

function reduce(state: RunState, event: AgentEvent): RunState {
  switch (event.type) {
    case 'run_start':
      // job_meta (queued transport) arrives BEFORE the server run_start and
      // must survive it: jobId drives follow-up continuation
      return {
        ...initialRunState,
        status: 'running',
        model: event.model ?? null,
        jobId: state.jobId,
        sandbox: event.sandbox ?? state.sandbox,
        queueNote: state.queueNote,
      }
    case 'model':
      return { ...state, model: event.model }
    case 'queue_degraded':
      return { ...state, queueNote: event.text }
    case 'job_meta':
      return { ...state, jobId: event.jobId }
    case 'artifact_meta':
      return { ...state, artifactMeta: event.meta }
    case 'message':
      return {
        ...state,
        messages: [...state.messages, { id: 'm' + state.messages.length, role: event.role, text: event.text }],
      }
    case 'plan':
      return {
        ...state,
        plan: event.steps.map((s) => ({ id: s.id, title: s.title, estimate: s.estimate, state: 'pending' as const })),
      }
    case 'step_start':
      return {
        ...state,
        stepIndex: state.plan.findIndex((s) => s.id === event.stepId),
        plan: state.plan.map((s) => (s.id === event.stepId ? { ...s, state: 'active' as const } : s)),
      }
    case 'thought':
      return { ...state, thoughts: [...state.thoughts, { stepId: event.stepId, text: event.text }] }
    case 'tool':
      return { ...state, tools: [...state.tools, { stepId: event.stepId, tool: event.tool }] }
    case 'console':
      return { ...state, logs: [...state.logs, event.line] }
    case 'file':
      // upsert by path: a real sandbox re-reports files that code/shell changed,
      // and edit_file re-emits the patched version of an existing file
      return {
        ...state,
        files: state.files.some((f) => f.path === event.file.path)
          ? state.files.map((f) => (f.path === event.file.path ? event.file : f))
          : [...state.files, event.file],
      }
    case 'browse':
      return { ...state, pages: [...state.pages, event.page] }
    case 'progress':
      return { ...state, credits: event.credits, stepIndex: event.stepIndex }
    case 'step_done':
      return {
        ...state,
        plan: state.plan.map((s) => (s.id === event.stepId ? { ...s, state: 'done' as const } : s)),
      }
    case 'artifact':
      return { ...state, artifact: event.artifact }
    case 'delivered':
      return { ...state, delivered: event.items }
    case 'done':
      return { ...state, status: 'done' }
    default:
      return state
  }
}

/** Live-backend-only run hook: there is no simulator anymore. */
export function useAgentRun() {
  const { locale, t } = useI18n()
  const [state, setState] = useState<RunState>(initialRunState)
  const controller = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    controller.current?.abort()
    controller.current = null
    cancelActiveRemote()
    setState((s) => (s.status === 'running' ? { ...s, status: 'stopped' } : s))
  }, [])

  const reset = useCallback(() => {
    controller.current?.abort()
    controller.current = null
    setState(initialRunState)
  }, [])

  const start = useCallback(
    async (prompt: string, opts?: { parentJobId?: string | null; files?: Record<string, string> | null }) => {
      controller.current?.abort()
      const next = new AbortController()
      controller.current = next
      setState({ ...initialRunState, status: 'running' })

      if (!remoteEnabled()) {
        setState((s) =>
          reduce(
            reduce(s, {
              type: 'message',
              role: 'agent',
              text: { en: t('app.noBackend'), ru: t('app.noBackend') },
            } as AgentEvent),
            { type: 'done' } as AgentEvent,
          ),
        )
        return
      }

      try {
        for await (const event of runRemote(prompt, locale, next.signal, opts)) {
          if (next.signal.aborted) break
          setState((s) => reduce(s, event))
        }
      } catch (error) {
        if (!next.signal.aborted) {
          const message = error instanceof Error ? error.message : String(error)
          setState((s) =>
            reduce(s, {
              type: 'message',
              role: 'agent',
              text: {
                en: 'The live backend could not complete this run: ' + message + '.',
                ru: 'Живой бэкенд не смог завершить запуск: ' + message + '.',
              },
            } as AgentEvent),
          )
        }
      }
      setState((s) => (s.status === 'running' ? { ...s, status: next.signal.aborted ? 'stopped' : 'done' } : s))
    },
    [locale, t],
  )

  /** Opens an external hosted artifact (gallery) in the preview sandbox. */
  const previewExternal = useCallback((html: string, pageUrl: string, title: string) => {
    controller.current?.abort()
    controller.current = null
    setState({
      ...initialRunState,
      status: 'done',
      artifact: {
        kind: 'html',
        title: { en: title, ru: title },
        fileName: 'artifact.html',
        html,
        note: { en: 'From the gallery of real runs', ru: 'Из галереи настоящих прогонов' },
        downloads: [],
      },
      artifactMeta: { root: pageUrl, version: 1, versions: 1, pageUrl, files: [{ name: 'index.html', url: pageUrl }] },
    })
  }, [])

  /** Replays a persisted run (history) into the thread without a new execution. */
  const replay = useCallback((events: AgentEvent[]) => {
    controller.current?.abort()
    controller.current = null
    const final = events.reduce(reduce, { ...initialRunState, status: 'running' as const })
    setState({ ...final, status: 'done' })
  }, [])

  useEffect(() => () => controller.current?.abort(), [])

  return { state, start, stop, reset, replay, previewExternal }
}
