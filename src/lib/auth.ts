/**
 * Client for the self-hosted account layer (server/auth.mjs).
 * Cookies are same-origin: auth is active when the app is served together
 * with the backend (production /api). With a cross-origin VITE_AGENT_API_URL
 * the workspace simply stays anonymous.
 */
import { AGENT_API_URL } from './remoteAgent'

export type SessionUser = { id: string; email: string; credits?: number | null }

const base = () => (AGENT_API_URL ?? '').replace(/\/$/, '')

async function call<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; json: T | null }> {
  try {
    const response = await fetch(base() + path, {
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      ...init,
    })
    const json = (await response.json().catch(() => null)) as T | null
    return { ok: response.ok, status: response.status, json }
  } catch {
    return { ok: false, status: 0, json: null }
  }
}

export const authAvailable = (): boolean => Boolean(AGENT_API_URL)

export async function fetchMe(): Promise<SessionUser | null> {
  const r = await call<{ user: SessionUser }>('/v1/auth?action=me')
  return r.ok && r.json?.user ? r.json.user : null
}

export async function signUp(email: string, password: string): Promise<{ user?: SessionUser; recoveryCodes?: string[]; error?: string }> {
  const r = await call<{ user: SessionUser; recoveryCodes?: string[]; error?: string }>('/v1/auth?action=signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return r.ok ? { user: r.json?.user, recoveryCodes: r.json?.recoveryCodes } : { error: r.json?.error || 'network' }
}

export async function resetPassword(email: string, code: string, password: string): Promise<{ ok?: boolean; error?: string }> {
  const r = await call<{ ok?: boolean; error?: string }>('/v1/auth?action=reset', {
    method: 'POST',
    body: JSON.stringify({ email, code, password }),
  })
  return r.ok ? { ok: true } : { error: r.json?.error || 'network' }
}

export async function logIn(email: string, password: string): Promise<{ user?: SessionUser; error?: string }> {
  const r = await call<{ user: SessionUser; error?: string }>('/v1/auth?action=login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return r.ok ? { user: r.json?.user } : { error: r.json?.error || 'network' }
}

export async function logOut(): Promise<void> {
  await call('/v1/auth?action=logout', { method: 'POST' })
}

export type LedgerEntry = { t: number; delta: number; reason: string; jobId: string | null }

export async function fetchCredits(): Promise<{ balance: number; entries: LedgerEntry[] } | null> {
  const r = await call<{ balance: number; entries: LedgerEntry[] }>('/v1/credits')
  return r.ok && r.json ? { balance: r.json.balance, entries: r.json.entries } : null
}

export type HistoryEntry = {
  jobId: string
  prompt: string
  locale: string
  status: string
  createdAt: number
  finishedAt: number
  events: number
  artifact?: { root: string; version: number; versions: number; pageUrl: string } | null
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const r = await call<{ runs: HistoryEntry[] }>('/v1/history')
  return r.ok && Array.isArray(r.json?.runs) ? r.json.runs : []
}

export type GalleryEntry = {
  jobId: string
  prompt: string
  pageUrl: string
  model: string | null
  version: number
  createdAt: number
}

/** Public gallery of real hosted artifacts (no auth needed). */
export async function fetchGallery(): Promise<GalleryEntry[]> {
  const r = await call<{ gallery: GalleryEntry[] }>('/v1/artifacts?public=1')
  return r.ok && Array.isArray(r.json?.gallery) ? r.json.gallery : []
}

export async function fetchGalleryHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    return response.ok ? await response.text() : null
  } catch {
    return null
  }
}

export async function fetchHistoryRun(jobId: string): Promise<{ events?: unknown[] } | null> {
  const r = await call<{ events: unknown[] }>('/v1/history?id=' + encodeURIComponent(jobId))
  return r.ok && r.json ? r.json : null
}
