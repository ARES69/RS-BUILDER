import type { L } from '@/data/types'

export type AgentFile = {
  path: string
  kind: 'code' | 'md' | 'json' | 'csv' | 'html'
  content: string
  bytes?: string
}

export type BrowsePage = {
  url: string
  title: string
  note: L
}

export type ToolCall = {
  name: 'browser' | 'shell' | 'editor' | 'search' | 'design' | 'render' | 'deploy' | 'file' | 'fleet'
  detail: L
  status?: 'running' | 'done' | 'failed'
}

export type ScenarioStep = {
  id: string
  title: L
  estimate: string
  thoughts?: L[]
  tools?: ToolCall[]
  console?: string[]
  files?: AgentFile[]
  browse?: BrowsePage[]
  credits: number
}

export type ArtifactDownload = { name: string; mime: string; base64: string }

export type Artifact = {
  title: L
  fileName: string
  kind: 'html' | 'slides' | 'report' | 'game'
  html: string
  note: L
  /** Real files produced by the run (pptx, srt, svg, md …) as base64 payloads. */
  downloads?: ArtifactDownload[]
}

export type Scenario = {
  id: string
  label: L
  prompt: L
  kind: Artifact['kind']
  icon: 'globe' | 'presentation' | 'microscope' | 'gamepad'
  totalCredits: number
  runtime: string
  intro: L
  steps: ScenarioStep[]
  outro: L
  artifact: Artifact
  delivered: L[]
}

export type AgentEvent =
  | { type: 'run_start'; scenarioId?: string; runId?: string; model?: string; sandbox?: SandboxInfo | null }
  | { type: 'model'; model: string }
  | { type: 'job_meta'; jobId: string; parentJobId?: string | null }
  | { type: 'queue_degraded'; reason: string; text: L }
  | { type: 'resume_token'; token: string; stepIndex: number; total: number; text: L }
  | { type: 'artifact_meta'; meta: ArtifactMeta }
  | { type: 'plan'; steps: { id: string; title: L; estimate: string }[] }
  | { type: 'step_start'; stepId: string }
  | { type: 'thought'; stepId: string; text: L }
  | { type: 'tool'; stepId: string; tool: ToolCall }
  | { type: 'console'; stepId: string; line: string }
  | { type: 'file'; stepId: string; file: AgentFile }
  | { type: 'browse'; stepId: string; page: BrowsePage }
  | { type: 'step_done'; stepId: string }
  | { type: 'progress'; credits: number; stepIndex: number; total: number }
  | { type: 'artifact'; artifact: Artifact }
  | { type: 'message'; text: L; role: 'agent' | 'user' }
  | { type: 'delivered'; items: L[] }
  | { type: 'done' }

/** What the server-side execution sandbox can really do (probed at runtime). */
export type SandboxInfo = {
  mode: 'real' | 'vm'
  shell: boolean
  shellBinary: string | null
  node: string | null
  npm: boolean
  project: string | null
}

export type ArtifactMeta = {
  root: string
  version: number
  versions: number
  pageUrl: string | null
  files: { name: string; url: string; size?: number }[]
}

export type RunState = {
  jobId: string | null
  /** real capabilities of the sandbox that serves this run (null = unknown yet) */
  sandbox: SandboxInfo | null
  /** the queue is offline for this run: it dies with the tab (honest banner) */
  queueNote: L | null
  /** latest store-less resume point (the browser keeps it for later runs) */
  resume: { token: string; stepIndex: number; total: number } | null
  artifactMeta: ArtifactMeta | null
  status: 'idle' | 'running' | 'done' | 'stopped'
  /** provider/model that actually serves the run (live LLM backend only). */
  model: string | null
  plan: { id: string; title: L; estimate: string; state: 'pending' | 'active' | 'done' }[]
  thoughts: { stepId: string; text: L }[]
  tools: { stepId: string; tool: ToolCall }[]
  logs: string[]
  files: AgentFile[]
  pages: BrowsePage[]
  credits: number
  stepIndex: number
  artifact: Artifact | null
  messages: { id: string; role: 'agent' | 'user'; text: L }[]
  delivered: L[]
}

export const initialRunState: RunState = {
  status: 'idle',
  model: null,
  jobId: null,
  sandbox: null,
  queueNote: null,
  resume: null,
  artifactMeta: null,
  plan: [],
  thoughts: [],
  tools: [],
  logs: [],
  files: [],
  pages: [],
  credits: 0,
  stepIndex: -1,
  artifact: null,
  messages: [],
  delivered: [],
}

/** Tailwind-free class lookup so the workspace UI can stay declarative. */
export const toolMeta: Record<ToolCall['name'], { label: L; glyph: string }> = {
  browser: { label: { en: 'Browser', ru: 'Браузер' }, glyph: '◐' },
  shell: { label: { en: 'Shell', ru: 'Шелл' }, glyph: '>_' },
  editor: { label: { en: 'Editor', ru: 'Редактор' }, glyph: '✎' },
  search: { label: { en: 'Search', ru: 'Поиск' }, glyph: '⌕' },
  design: { label: { en: 'Design', ru: 'Дизайн' }, glyph: '◈' },
  render: { label: { en: 'Render', ru: 'Рендер' }, glyph: '▶' },
  deploy: { label: { en: 'Deploy', ru: 'Деплой' }, glyph: '⇧' },
  file: { label: { en: 'Files', ru: 'Файлы' }, glyph: '▤' },
  fleet: { label: { en: 'Sub-agents', ru: 'Суб-агенты' }, glyph: '⁘' },
}
