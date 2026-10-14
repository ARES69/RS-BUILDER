import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

/**
 * Mount defensively: the single-file preview build inlines this bundle into
 * <head>, so #root may not exist yet when the script evaluates.
 */
function mount() {
  const container = document.getElementById('root')
  if (!container) {
    console.error('[RS-BUILDER] root container #root not found')
    return
  }
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount, { once: true })
} else {
  mount()
}
