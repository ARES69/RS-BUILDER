import { useCallback, useEffect, useRef, useState } from 'react'
import { initialRunState, type AgentEvent, type RunState, type Scenario } from './agent'
import { runScenario } from './agentEngine'
import { cancelActiveRemote, demoForced, remoteEnabled, runRemote } from './remoteAgent'
import { useI18n } from '@/i18n'

function reduce(state: RunState, event: AgentEvent): RunState {
  switch (event.type) {
    case 'run_start':
      return { ...initialRunState, status: 'running', model: event.model ?? null }
    case 'model':
      return { ...state, model: event.model }
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
      return { ...state, files: [...state.files, event.file] }
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

export function useAgentRun() {
  const { locale } = useI18n()
  const [state, setState] = useState<RunState>(initialRunState)
  const [speed, setSpeedState] = useState(1)
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null)
  const controller = useRef<AbortController | null>(null)
  const speedRef = useRef(speed)
  speedRef.current = speed

  const stop = useCallback(() => {
    controller.current?.abort()
    controller.current = null
    cancelActiveRemote()
    setState((s) => (s.status === 'running' ? { ...s, status: 'stopped' } : s))
  }, [])

  const reset = useCallback(() => {
    controller.current?.abort()
    controller.current = null
    setActiveScenario(null)
    setState(initialRunState)
  }, [])

  const start = useCallback(
    async (scenario: Scenario) => {
      controller.current?.abort()
      const next = new AbortController()
      controller.current = next
      setActiveScenario(scenario)
      setState({ ...initialRunState, status: 'running' })

      const live = remoteEnabled() && !demoForced()
      const events = live
        ? runRemote(scenario.prompt[locale] ?? scenario.prompt.en, locale, next.signal)
        : runScenario(scenario, { getSpeed: () => speedRef.current, signal: next.signal })

      try {
        for await (const event of events) {
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
                en: 'The live backend could not complete this run: ' + message + '. Check VITE_AGENT_API_URL and that the server is up (npm run server).',
                ru: 'Живой бэкенд не смог завершить запуск: ' + message + '. Проверьте VITE_AGENT_API_URL и что сервер поднят (npm run server).',
              },
            }),
          )
        }
      }

      setState((s) => (s.status === 'running' ? { ...s, status: next.signal.aborted ? 'stopped' : 'done' } : s))
    },
    [locale],
  )

  useEffect(() => () => controller.current?.abort(), [])

  return { state, start, stop, reset, speed, setSpeed: setSpeedState, activeScenario }
}
