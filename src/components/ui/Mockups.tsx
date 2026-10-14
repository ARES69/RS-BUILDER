import { cn } from '@/lib/cn'

export type MockKind =
  | 'site'
  | 'slides'
  | 'report'
  | 'game'
  | 'video'
  | 'browser'
  | 'schedule'
  | 'design'
  | 'fleet'

/* ------------------------------------------------------------------ */
/* Every mock below is drawn with CSS/SVG only: no images, no network, */
/* nothing to license, and they stay sharp at any size.                */
/* ------------------------------------------------------------------ */

function Frame({
  children,
  url,
  className,
  tone = 'dark',
}: {
  children: React.ReactNode
  url?: string
  className?: string
  tone?: 'dark' | 'light'
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]',
        tone === 'dark' ? 'border-white/10 bg-[#0b0b11]' : 'border-black/10 bg-[#fbfaf7]',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 border-b px-3.5 py-2.5',
          tone === 'dark' ? 'border-white/10 bg-white/[0.03]' : 'border-black/8 bg-black/[0.03]',
        )}
      >
        <span className="flex gap-1.5">
          <i className="block h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <i className="block h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <i className="block h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </span>
        {url ? (
          <span
            className={cn(
              'ml-2 truncate rounded-md px-2.5 py-1 font-mono text-[10.5px]',
              tone === 'dark' ? 'bg-white/[0.06] text-white/45' : 'bg-black/[0.05] text-black/45',
            )}
          >
            {url}
          </span>
        ) : null}
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}

function SiteMock() {
  return (
    <Frame url="ember-oak.rs-builder.app" tone="light">
      <div className="bg-[#f7f2ea] px-5 py-5 text-[#241c15]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#c2571b]" />
            <span className="text-[10px] font-bold tracking-tight">Ember &amp; Oak</span>
          </div>
          <div className="flex gap-2">
            <span className="h-1.5 w-8 rounded-full bg-black/12" />
            <span className="h-1.5 w-8 rounded-full bg-black/12" />
            <span className="h-4 w-12 rounded-full bg-[#241c15]" />
          </div>
        </div>
        <div className="mt-6 max-w-[70%] space-y-2">
          <span className="block text-[8px] font-bold uppercase tracking-[0.18em] text-[#c2571b]">
            Roasted to order
          </span>
          <span className="block h-4 w-full rounded bg-[#241c15]/85" />
          <span className="block h-4 w-[86%] rounded bg-[#241c15]/85" />
          <span className="block h-1.5 w-[70%] rounded bg-[#241c15]/25" />
        </div>
        <div className="mt-4 flex gap-2">
          <span className="h-5 w-20 rounded-full bg-[#241c15]" />
          <span className="h-5 w-16 rounded-full border border-[#241c15]/25" />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'rounded-lg border bg-[#fffdf9] p-2.5',
                i === 1 ? 'border-[#241c15]' : 'border-[#241c15]/12',
              )}
            >
              <span
                className={cn(
                  'inline-block rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider',
                  i === 1 ? 'bg-[#5d7a4a]/15 text-[#5d7a4a]' : 'bg-black/6 text-[#7a6a5b]',
                )}
              >
                {['Solo', 'Explorer', 'House'][i]}
              </span>
              <span className="mt-2 block text-[15px] font-extrabold tracking-tight">
                {['14€', '29€', '69€'][i]}
              </span>
              <span className="mt-1.5 block h-1 w-full rounded bg-black/10" />
              <span className="mt-1 block h-1 w-[80%] rounded bg-black/10" />
              <span className="mt-1 block h-1 w-[62%] rounded bg-black/10" />
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-1.5 border-t border-[#241c15]/10 pt-4">
          <span className="block h-1.5 w-[45%] rounded bg-black/15" />
          <span className="block h-1.5 w-full rounded bg-black/8" />
          <span className="block h-1.5 w-[72%] rounded bg-black/8" />
        </div>
      </div>
    </Frame>
  )
}

function SlidesMock({ animate = true }: { animate?: boolean }) {
  const bars = [44, 70, 108, 144, 188, 222]
  return (
    <Frame url="deck.html — Ferrite Systems" tone="dark">
      <div className="relative bg-[#0b0b11] px-6 py-6">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent">Traction</span>
        <div className="mt-2 space-y-1.5">
          <span className="block h-3.5 w-[76%] rounded bg-white/85" />
          <span className="block h-1.5 w-[52%] rounded bg-white/25" />
        </div>
        <svg viewBox="0 0 300 120" className="mt-5 w-full" role="img" aria-label="ARR chart">
          <g stroke="rgba(255,255,255,0.08)">
            <line x1="0" y1="30" x2="300" y2="30" />
            <line x1="0" y1="60" x2="300" y2="60" />
            <line x1="0" y1="90" x2="300" y2="90" />
          </g>
          {bars.map((h, i) => (
            <rect
              key={i}
              x={10 + i * 48}
              y={112 - h / 2}
              width={28}
              height={h / 2}
              rx={4}
              fill={i < 3 ? '#8b7bff' : '#c8f751'}
              className={animate ? 'animate-grow origin-bottom' : undefined}
              style={animate ? { animationDelay: `${i * 90}ms` } : undefined}
            />
          ))}
        </svg>
        <div className="mt-4 flex items-center justify-between font-mono text-[9px] text-white/35">
          <span>FERRITE SYSTEMS</span>
          <span>03 / 07</span>
        </div>
      </div>
    </Frame>
  )
}

function ReportMock() {
  const rows = [
    ['Editor copilot', '17', '19 €', 'warn'],
    ['Autonomous agent', '9', '79 €', 'warn'],
    ['Compliance-first', '4', '145 €', 'ok'],
    ['Self-hosted', '2', 'Custom', 'ok'],
  ]
  return (
    <Frame url="eu-ai-coding-scan.pdf" tone="light">
      <div className="bg-[#fbfaf7] px-5 py-5 text-[#14141a]">
        <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#0f8f87]">
          Wide Research · 418 sources
        </span>
        <div className="mt-2 space-y-1.5">
          <span className="block h-3 w-[88%] rounded bg-[#14141a]/85" />
          <span className="block h-3 w-[58%] rounded bg-[#14141a]/85" />
        </div>
        <div className="mt-3 rounded-lg border border-[#0f8f87]/40 border-l-[3px] bg-white p-2.5">
          <span className="block h-1.5 w-full rounded bg-black/12" />
          <span className="mt-1 block h-1.5 w-[92%] rounded bg-black/12" />
          <span className="mt-1 block h-1.5 w-[64%] rounded bg-black/12" />
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-black/10 bg-white">
          <div className="grid grid-cols-[1.6fr_repeat(2,0.7fr)_0.7fr] gap-2 bg-black/[0.04] px-2.5 py-1.5 text-[7.5px] font-bold uppercase tracking-wider text-black/45">
            <span>Segment</span>
            <span>Vendors</span>
            <span>Median</span>
            <span>Crowding</span>
          </div>
          {rows.map((r) => (
            <div
              key={r[0]}
              className="grid grid-cols-[1.6fr_repeat(2,0.7fr)_0.7fr] items-center gap-2 border-t border-black/8 px-2.5 py-1.5 text-[9px]"
            >
              <span className="truncate font-medium">{r[0]}</span>
              <span className="text-black/55">{r[1]}</span>
              <span className="text-black/55">{r[2]}</span>
              <span
                className={cn(
                  'inline-block w-fit rounded-full px-1.5 py-0.5 text-[7px] font-bold',
                  r[3] === 'ok' ? 'bg-[#0f8f87]/14 text-[#0f8f87]' : 'bg-[#b4690e]/14 text-[#b4690e]',
                )}
              >
                {r[3] === 'ok' ? 'Low' : 'High'}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1">
          {[92, 78, 84, 46].map((w, i) => (
            <span key={i} className="block h-1.5 rounded bg-black/10" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </Frame>
  )
}

function GameMock({ animate = true }: { animate?: boolean }) {
  return (
    <Frame url="neon-hop.rs-builder.app" tone="dark">
      <div className="relative h-[230px] overflow-hidden bg-[radial-gradient(circle_at_50%_20%,#1b1b28,#08080c_62%)]">
        <div className="absolute inset-x-0 top-3 flex justify-center gap-5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">
          <span>score <b className="font-medium text-accent">1 240</b></span>
          <span>best <b className="font-medium text-accent">3 860</b></span>
          <span>combo <b className="font-medium text-accent">x4</b></span>
        </div>
        <div className="absolute inset-x-0 flex gap-3 pl-4" style={{ bottom: 62 }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className={cn('block w-0.5 rounded-full bg-white/25', animate && 'animate-pulse-dot')}
              style={{ height: i % 3 === 0 ? 10 : 6, animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
        <span
          className={cn('absolute h-6 w-6 rounded-[5px] bg-white shadow-[0_0_20px_rgba(139,123,255,0.5)]', animate && 'animate-hop')}
          style={{ left: '22%', bottom: 56 }}
        />
        <span className="absolute h-8 w-5 rounded-sm bg-[#ff6369] shadow-[0_0_18px_rgba(255,99,105,0.45)]" style={{ left: '58%', bottom: 56 }} />
        <span className="absolute h-11 w-5 rounded-sm bg-[#ff6369]/85" style={{ left: '84%', bottom: 56 }} />
        <span className="absolute h-4 w-4 rounded-full bg-accent shadow-[0_0_22px_rgba(200,247,81,0.6)]" style={{ left: '40%', bottom: 118 }} />
        <span className="absolute h-3 w-3 rounded-full bg-accent/70" style={{ left: '70%', bottom: 140 }} />
        <span className="absolute inset-x-0 border-t border-accent/35" style={{ bottom: 56 }} />
        <div className="absolute inset-x-0 bottom-0 h-14 opacity-40 [background:repeating-linear-gradient(115deg,transparent_0_18px,rgba(255,255,255,0.07)_18px_19px)]" />
        <div className="absolute inset-x-0 bottom-4 text-center font-mono text-[9px] tracking-wide text-white/35">
          tap / space to hop · double-hop in air
        </div>
      </div>
    </Frame>
  )
}

function VideoMock() {
  const clips = [
    { w: '22%', c: '#8b7bff' },
    { w: '14%', c: '#35e0d6' },
    { w: '30%', c: '#c8f751' },
    { w: '18%', c: '#ff7a90' },
  ]
  return (
    <Frame url="teaser-vertical.mp4 · 1080×1920" tone="dark">
      <div className="bg-[#0b0b11] px-4 py-4">
        <div className="relative mx-auto flex h-[132px] w-[74px] items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(160deg,#1c1c28,#0d0d14)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/90 text-[10px] text-accent-ink">▶</span>
          <span className="absolute inset-x-1 bottom-2 space-y-1">
            <span className="block h-1 w-full rounded bg-white/70" />
            <span className="block h-1 w-[64%] rounded bg-white/40" />
          </span>
        </div>
        <div className="mt-4 space-y-1.5">
          {clips.map((clip, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-8 font-mono text-[8px] uppercase text-white/30">{['V1', 'A1', 'TXT', 'FX'][i]}</span>
              <div className="relative h-4 flex-1 overflow-hidden rounded bg-white/[0.05]">
                <span
                  className="absolute inset-y-0 left-0 rounded"
                  style={{ width: clip.w, background: clip.c, opacity: 0.75 }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="relative mt-2 h-px w-full bg-white/10">
          <span className="absolute -top-1 left-[38%] h-3 w-px bg-accent" />
          <span className="absolute -top-[3px] left-[38%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent" />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[8.5px] text-white/30">
          <span>00:00:11:04</span>
          <span>00:00:30:00</span>
        </div>
      </div>
    </Frame>
  )
}

function BrowserMock({ animate = true }: { animate?: boolean }) {
  return (
    <Frame url="portal.supplier-eu.example/login" tone="dark">
      <div className="relative bg-[#0e0e15] px-5 py-5">
        {animate ? <span className="animate-scan absolute inset-x-0 top-0 h-16 bg-[linear-gradient(to_bottom,transparent,color-mix(in_srgb,var(--accent)_14%,transparent),transparent)]" /> : null}
        <div className="mx-auto max-w-[220px] rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="block h-2.5 w-20 rounded bg-white/70" />
          <span className="mt-1.5 block h-1.5 w-28 rounded bg-white/20" />
          <div className="mt-4 space-y-2">
            <span className="block h-7 rounded-lg border border-accent/50 bg-accent/[0.07] px-2 pt-2 font-mono text-[8.5px] text-accent/80">
              ops@company.eu<span className="animate-blink">|</span>
            </span>
            <span className="block h-7 rounded-lg border border-white/12 bg-white/[0.03] px-2 pt-2 font-mono text-[8.5px] text-white/35">
              ••••••••••••
            </span>
          </div>
          <span className="mt-3 block h-7 rounded-lg bg-accent" />
        </div>
        <div className="mt-4 space-y-1.5 font-mono text-[9px] text-white/45">
          <span className="flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-accent" /> navigate → /login</span>
          <span className="flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-accent" /> fill #email · masked</span>
          <span className="flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-accent" /> fill #password · masked</span>
          <span className="flex items-center gap-2"><i className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-white/40" /> click button[type=submit]</span>
        </div>
      </div>
    </Frame>
  )
}

function ScheduleMock() {
  const jobs = [
    { name: 'Morning market brief', cron: '0 8 * * 1-5', next: 'in 6h 12m', tone: 'accent' },
    { name: 'Competitor price scan', cron: '0 7 * * 1', next: 'in 2d 4h', tone: 'violet' },
    { name: 'Board metrics deck', cron: '0 17 1 * *', next: 'in 19d', tone: 'cyan' },
    { name: 'Inbox → CRM sync', cron: '*/30 * * * *', next: 'in 11m', tone: 'accent' },
  ]
  return (
    <Frame url="automations" tone="dark">
      <div className="space-y-2 bg-[#0b0b11] px-4 py-4">
        {jobs.map((job) => (
          <div key={job.name} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
            <span
              className={cn(
                'animate-pulse-dot h-2 w-2 shrink-0 rounded-full',
                job.tone === 'accent' ? 'bg-accent' : job.tone === 'violet' ? 'bg-violet' : 'bg-cyan',
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11.5px] font-semibold text-white/85">{job.name}</span>
              <span className="block font-mono text-[9px] text-white/35">{job.cron}</span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-[9.5px] text-white/40">next run</span>
              <span className="block font-mono text-[10px] text-accent">{job.next}</span>
            </span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between rounded-xl border border-white/8 px-3 py-2 font-mono text-[9px] text-white/35">
          <span>budget guardrail: 2,000 credits / week</span>
          <span className="text-accent">used 612</span>
        </div>
      </div>
    </Frame>
  )
}

function DesignMock() {
  return (
    <Frame url="brand/variants" tone="dark">
      <div className="bg-[#0b0b11] px-4 py-4">
        <div className="grid grid-cols-6 gap-1.5">
          {['#f7f2ea', '#241c15', '#c2571b', '#5d7a4a', '#c8f751', '#8b7bff'].map((c) => (
            <span key={c} className="aspect-square rounded-md border border-white/10" style={{ background: c }} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(140deg,#c2571b,#7a2f10)]">
            <span className="absolute bottom-1.5 left-2 font-mono text-[8px] text-white/80">A1 · warm</span>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-[linear-gradient(140deg,#5d7a4a,#22331a)]">
            <span className="absolute bottom-1.5 left-2 font-mono text-[8px] text-white/80">A2 · leaf</span>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-accent/40 bg-[linear-gradient(140deg,#c8f751,#6f8f1f)]">
            <span className="absolute bottom-1.5 left-2 font-mono text-[8px] text-[#0b0b0f]">A3 · picked</span>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-white/8 bg-white/[0.03] p-3">
          <span className="block text-[15px] font-extrabold tracking-tight text-white/90">Aa — Ember &amp; Oak</span>
          <span className="mt-1 block font-mono text-[8.5px] text-white/35">
            ui-serif · 600 · -0.03em / system-ui · 400
          </span>
          <div className="mt-2 space-y-1">
            <span className="block h-1 w-full rounded bg-white/12" />
            <span className="block h-1 w-[78%] rounded bg-white/12" />
          </div>
        </div>
      </div>
    </Frame>
  )
}

function FleetMock({ animate = true }: { animate?: boolean }) {
  const agents = [
    { id: 'agent-07', src: 18, p: 100 },
    { id: 'agent-12', src: 14, p: 100 },
    { id: 'agent-19', src: 22, p: 86 },
    { id: 'agent-24', src: 9, p: 61 },
    { id: 'agent-31', src: 4, p: 28 },
  ]
  return (
    <Frame url="wide-research · 32 sub-agents" tone="dark">
      <div className="space-y-2 bg-[#0b0b11] px-4 py-4">
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
          <span>fleet status</span>
          <span className="text-accent">27 / 32 done</span>
        </div>
        {agents.map((a, i) => (
          <div key={a.id} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
            <div className="flex items-center justify-between font-mono text-[9.5px]">
              <span className="text-white/60">{a.id}</span>
              <span className="text-white/30">{a.src} sources</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/8">
              <span
                className={cn('block h-full rounded-full bg-accent', animate && 'animate-bar origin-left')}
                style={{ width: `${a.p}%`, animationDelay: `${i * 240}ms` }}
              />
            </div>
          </div>
        ))}
        <div className="mt-1 rounded-lg border border-violet/25 bg-violet/[0.07] px-3 py-2 font-mono text-[9px] text-violet">
          merging · dedupe 418 → 96 · conflicts flagged 5
        </div>
      </div>
    </Frame>
  )
}

const registry: Record<MockKind, (props: { animate?: boolean }) => React.ReactElement> = {
  site: () => <SiteMock />,
  slides: SlidesMock,
  report: () => <ReportMock />,
  game: GameMock,
  video: () => <VideoMock />,
  browser: BrowserMock,
  schedule: () => <ScheduleMock />,
  design: () => <DesignMock />,
  fleet: FleetMock,
}

export function Mockup({
  kind,
  className,
  animate = true,
}: {
  kind: MockKind
  className?: string
  animate?: boolean
}) {
  const Cmp = registry[kind] ?? SiteMock
  return <div className={cn('w-full', className)}><Cmp animate={animate} /></div>
}
