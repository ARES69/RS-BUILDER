/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ROUTER_MODE?: 'browser' | 'hash'
  readonly VITE_AGENT_API_URL?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_TAGLINE?: string
  readonly VITE_SUPPORT_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
