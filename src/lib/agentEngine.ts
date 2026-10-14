import type { AgentEvent, Scenario } from './agent'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export type RunOptions = {
  /** Live speed getter so the user can change tempo mid-run. */
  getSpeed: () => number
  signal?: AbortSignal
}

/** Abort-aware delay: resolves early (and reports) when the run is cancelled. */
async function pause(ms: number, opts: RunOptions): Promise<boolean> {
  const speed = Math.max(0.25, opts.getSpeed() || 1)
  const step = Math.max(16, ms / speed)
  await wait(step)
  return Boolean(opts.signal?.aborted)
}

/**
 * Streams a scripted scenario as a sequence of agent events.
 * The generator is intentionally lazy: nothing happens until the UI consumes it,
 * and cancelling simply stops the iteration.
 */
export async function* runScenario(scenario: Scenario, opts: RunOptions): AsyncGenerator<AgentEvent> {
  yield { type: 'run_start', scenarioId: scenario.id }
  yield { type: 'message', role: 'user', text: scenario.prompt }
  if (await pause(560, opts)) return
  yield { type: 'message', role: 'agent', text: scenario.intro }
  if (await pause(760, opts)) return

  yield {
    type: 'plan',
    steps: scenario.steps.map((s) => ({ id: s.id, title: s.title, estimate: s.estimate })),
  }
  if (await pause(620, opts)) return

  let credits = 0
  const total = scenario.steps.length

  for (let i = 0; i < total; i++) {
    const step = scenario.steps[i]
    yield { type: 'step_start', stepId: step.id }
    if (await pause(420, opts)) return

    for (const thought of step.thoughts ?? []) {
      yield { type: 'thought', stepId: step.id, text: thought }
      if (await pause(700, opts)) return
    }

    for (const tool of step.tools ?? []) {
      yield { type: 'tool', stepId: step.id, tool }
      if (await pause(560, opts)) return
    }

    for (const page of step.browse ?? []) {
      yield { type: 'browse', stepId: step.id, page }
      if (await pause(480, opts)) return
    }

    for (const line of step.console ?? []) {
      yield { type: 'console', stepId: step.id, line }
      if (await pause(230, opts)) return
    }

    for (const file of step.files ?? []) {
      yield { type: 'file', stepId: step.id, file }
      if (await pause(380, opts)) return
    }

    credits += step.credits
    yield { type: 'progress', credits, stepIndex: i, total }
    yield { type: 'step_done', stepId: step.id }
    if (await pause(420, opts)) return
  }

  yield { type: 'artifact', artifact: scenario.artifact }
  if (await pause(680, opts)) return
  yield { type: 'delivered', items: scenario.delivered }
  if (await pause(320, opts)) return
  yield { type: 'message', role: 'agent', text: scenario.outro }
  if (await pause(240, opts)) return
  yield { type: 'done' }
}
