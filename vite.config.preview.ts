/**
 * Single-file preview build: everything (CSS + JS) is inlined into one HTML
 * file so it can be opened directly from disk / rendered inside a sandboxed
 * preview pane with no network access. Routing falls back to hash mode.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath, URL } from 'node:url'

/** Rewrite the inlined bundle as a classic script so it also runs in
 *  environments that block/ignore ES modules (jsdom, some webview panes). */
function classicScript() {
  return {
    name: 'rsb-classic-script',
    enforce: 'post' as const,
    transformIndexHtml: {
      order: 'post' as const,
      handler: (html: string) =>
        html
          .replace(/<script type="module"([^>]*)>/g, '<script$1>')
          .replace(/<script([^>]*) crossorigin([^>]*)>/g, '<script$1$2>'),
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), classicScript()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    'import.meta.env.VITE_ROUTER_MODE': JSON.stringify('hash'),
  },
  build: {
    outDir: 'preview',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true, format: 'iife' } },
  },
})
