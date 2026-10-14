import { lazy, Suspense, useEffect } from 'react'
import {
  HashRouter,
  BrowserRouter,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { I18nProvider, useI18n } from '@/i18n'
import { ThemeProvider } from '@/lib/theme'
import { AnnouncementBar } from '@/components/layout/AnnouncementBar'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CookieBanner } from '@/components/layout/CookieBanner'
import Home from '@/pages/Home'
import Pricing from '@/pages/Pricing'
import Feature from '@/pages/Feature'
import NotFound from '@/pages/NotFound'
import Blog from '@/pages/Blog'
import BlogPost from '@/pages/BlogPost'
import { scrollToNode, scrollToTop } from '@/lib/dom'

// Heavy routes (workspace demo with embedded artifacts, brand kit, legal, auth)
// are code-split so the landing page stays light.
const Workspace = lazy(() => import('@/pages/Workspace'))
const Brand = lazy(() => import('@/pages/Brand'))
const Legal = lazy(() => import('@/pages/Legal'))
const Auth = lazy(() => import('@/pages/Auth'))

function RouteLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <span className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.16em] text-faint">
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-accent" />
        RS-BUILDER
      </span>
    </div>
  )
}

const titles: Record<string, { en: string; ru: string }> = {
  '/': { en: 'RS-BUILDER — Hands-on AI that builds the thing', ru: 'RS-BUILDER — ИИ с руками: сам планирует и сам собирает' },
  '/pricing': { en: 'RS-BUILDER — Plans & pricing', ru: 'RS-BUILDER — Тарифы' },
  '/app': { en: 'RS-BUILDER — Workspace', ru: 'RS-BUILDER — Воркспейс' },
  '/brand': { en: 'RS-BUILDER — Brand kit', ru: 'RS-BUILDER — Бренд-кит' },
  '/blog': { en: 'RS-BUILDER — Blog', ru: 'RS-BUILDER — Блог' },
  '/legal': { en: 'RS-BUILDER — Legal & company', ru: 'RS-BUILDER — Документы и компания' },
  '/login': { en: 'RS-BUILDER — Sign in', ru: 'RS-BUILDER — Вход' },
  '/signup': { en: 'RS-BUILDER — Create account', ru: 'RS-BUILDER — Регистрация' },
}

/** Keeps <title> in sync with the route, and resets scroll between pages. */
function RouteEffects() {
  const location = useLocation()
  const { locale } = useI18n()

  useEffect(() => {
    const path = location.pathname
    const entry =
      titles[path] ??
      (path.startsWith('/features/')
        ? { en: 'RS-BUILDER — ' + path.split('/')[2], ru: 'RS-BUILDER — ' + path.split('/')[2] }
        : { en: 'RS-BUILDER', ru: 'RS-BUILDER' })
    document.title = entry[locale]
  }, [location.pathname, locale])

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1)
      window.setTimeout(() => scrollToNode(document.getElementById(id)), 80)
      return
    }
    scrollToTop()
  }, [location.pathname, location.hash])

  return null
}

function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <RouteEffects />
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-[13px] focus:font-bold focus:text-accent-ink"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <Navbar />
      <main id="content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CookieBanner />
    </div>
  )
}

function BareLayout() {
  return (
    <div className="min-h-screen bg-bg">
      <RouteEffects />
      <Outlet />
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="features/:slug" element={<Feature />} />
        <Route path="blog" element={<Blog />} />
        <Route path="blog/:slug" element={<BlogPost />} />
        <Route
          path="brand"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Brand />
            </Suspense>
          }
        />
        <Route
          path="legal"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Legal />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route element={<BareLayout />}>
        <Route
          path="app"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Workspace />
            </Suspense>
          }
        />
        <Route
          path="login"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Auth mode="login" />
            </Suspense>
          }
        />
        <Route
          path="signup"
          element={
            <Suspense fallback={<RouteLoader />}>
              <Auth mode="signup" />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  )
}

export default function App() {
  const Hash = import.meta.env.VITE_ROUTER_MODE === 'hash'
  const Router = Hash ? HashRouter : BrowserRouter
  return (
    <ThemeProvider>
      <I18nProvider>
        <Router>
          <AppRoutes />
        </Router>
      </I18nProvider>
    </ThemeProvider>
  )
}
