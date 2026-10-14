import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Clock3 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { blogPosts } from '@/data/blog'
import { Reveal, Stagger, StaggerItem } from '@/lib/motion'
import { Mockup } from '@/components/ui/Mockups'
import { CTASection } from '@/components/home/CTASection'
import { Badge } from '@/components/ui/Badge'

function formatDate(iso: string, locale: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function PostCard({ slug, date, readMinutes, tags, title, excerpt, author, mock }: (typeof blogPosts)[number]) {
  const { l, locale } = useI18n()
  return (
    <Link
      to={'/blog/' + slug}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface/60 transition-all duration-300 hover:-translate-y-1 hover:border-accent/35"
    >
      <div className="relative overflow-hidden border-b border-line bg-bg-elev p-4">
        <div className="transition-transform duration-500 group-hover:scale-[1.02]">
          <Mockup kind={mock} animate={false} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <Badge key={tag.en} tone="accent">{l(tag)}</Badge>
          ))}
          <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] text-faint">
            <Clock3 size={11} /> {readMinutes} min
          </span>
        </div>
        <h3 className="mt-3 text-[16.5px] font-bold leading-snug tracking-[-0.02em] text-fg transition-colors group-hover:text-accent">
          {l(title)}
        </h3>
        <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-muted">{l(excerpt)}</p>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-3.5">
          <span className="inline-flex items-center gap-2 text-[12px] text-faint">
            <CalendarDays size={12} /> {formatDate(date, locale)}
          </span>
          <ArrowRight size={15} className="text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
        </div>
        <span className="sr-only">{author.name}</span>
      </div>
    </Link>
  )
}

export default function Blog() {
  const { t, l, locale } = useI18n()
  const [featured, ...rest] = blogPosts

  return (
    <>
      <section className="relative overflow-hidden pb-12 pt-14">
        <div className="grid-bg mask-fade-b pointer-events-none absolute inset-0 -z-10 opacity-60" />
        <div className="shell">
          <span className="eyebrow">{t('blog.eyebrow')}</span>
          <h1 className="h-display mt-4 text-[clamp(2.2rem,6vw,4rem)] text-fg">{t('blog.title')}</h1>
          <p className="mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-muted">{t('blog.subtitle')}</p>
        </div>
      </section>

      <section className="pb-16">
        <div className="shell">
          <Reveal>
            <Link
              to={'/blog/' + featured.slug}
              className="group grid overflow-hidden rounded-3xl border border-line bg-surface/60 transition-all duration-300 hover:border-accent/35 lg:grid-cols-[1.1fr_1fr]"
            >
              <div className="flex flex-col justify-center gap-4 p-7 lg:p-10">
                <div className="flex items-center gap-2">
                  <Badge tone="accent">{t('blog.featured')}</Badge>
                  {featured.tags.map((tag) => (
                    <Badge key={tag.en}>{l(tag)}</Badge>
                  ))}
                </div>
                <h2 className="h-display text-[clamp(1.5rem,3vw,2.3rem)] text-fg transition-colors group-hover:text-accent">
                  {l(featured.title)}
                </h2>
                <p className="max-w-xl text-pretty text-[14.5px] leading-relaxed text-muted">{l(featured.excerpt)}</p>
                <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-faint">
                  <span className="inline-flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 font-mono text-[10px] font-bold text-muted">
                      {featured.author.initials}
                    </span>
                    {featured.author.name} · {l(featured.author.role)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={12} /> {formatDate(featured.date, locale)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={12} /> {featured.readMinutes} {t('blog.minRead')}
                  </span>
                </div>
              </div>
              <div className="relative border-t border-line bg-bg-elev p-6 lg:border-l lg:border-t-0">
                <div className="transition-transform duration-500 group-hover:scale-[1.02]">
                  <Mockup kind={featured.mock} />
                </div>
              </div>
            </Link>
          </Reveal>

          <h2 className="eyebrow mt-14">{t('blog.allPosts')}</h2>
          <Stagger className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((post) => (
              <StaggerItem key={post.slug}>
                <PostCard {...post} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <CTASection />
    </>
  )
}
