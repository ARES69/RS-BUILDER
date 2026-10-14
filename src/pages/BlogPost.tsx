import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Share2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { blogBySlug, blogPosts } from '@/data/blog'
import { useCopy } from '@/lib/hooks'
import { Reveal } from '@/lib/motion'
import { Mockup } from '@/components/ui/Mockups'
import { Badge } from '@/components/ui/Badge'
import { CTASection } from '@/components/home/CTASection'
import NotFound from './NotFound'

export default function BlogPost() {
  const { slug } = useParams()
  const { t, l, locale } = useI18n()
  const { copied, copy } = useCopy()
  const post = blogBySlug(slug)

  if (!post) return <NotFound />

  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 2)

  const share = () => copy(typeof window !== 'undefined' ? window.location.href : post.slug, 'share')

  return (
    <>
      <article className="relative overflow-hidden pb-14 pt-10">
        <div className="grid-bg mask-fade-b pointer-events-none absolute inset-0 -z-10 opacity-50" />
        <div className="shell max-w-4xl">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-muted transition-colors hover:text-fg"
          >
            <ArrowLeft size={14} /> {t('blog.backToBlog')}
          </Link>

          <div className="mt-7 flex flex-wrap items-center gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag.en} tone="accent">{l(tag)}</Badge>
            ))}
            <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-faint">
              <CalendarDays size={12} />
              {new Date(post.date + 'T00:00:00Z').toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] text-faint">
              <Clock3 size={12} /> {post.readMinutes} {t('blog.minRead')}
            </span>
          </div>

          <h1 className="h-display mt-5 text-balance text-[clamp(1.9rem,4.6vw,3.2rem)] text-fg">{l(post.title)}</h1>
          <p className="mt-5 max-w-2xl text-pretty text-[16.5px] font-medium leading-relaxed text-fg/85">
            {l(post.excerpt)}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
            <span className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 font-mono text-[12px] font-bold text-muted">
                {post.author.initials}
              </span>
              <span>
                <span className="block text-[13.5px] font-semibold text-fg">{post.author.name}</span>
                <span className="block text-[12px] text-muted">{l(post.author.role)}</span>
              </span>
            </span>
            <button
              type="button"
              onClick={share}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-[12.5px] font-semibold text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              <Share2 size={13} />
              {copied === 'share' ? t('common.copied') : t('blog.share')}
            </button>
          </div>

          <Reveal className="mt-10">
            <Mockup kind={post.mock} />
          </Reveal>

          <div className="mt-12 flex flex-col gap-10">
            {post.sections.map((section, i) => (
              <Reveal key={i} className="max-w-3xl">
                <h2 className="text-[clamp(1.2rem,2.4vw,1.6rem)] font-extrabold tracking-[-0.025em] text-fg">
                  <span className="mr-3 font-mono text-[13px] text-accent">{String(i + 1).padStart(2, '0')}</span>
                  {l(section.heading)}
                </h2>
                <div className="mt-4 flex flex-col gap-4">
                  {section.paragraphs.map((paragraph, pi) => (
                    <p key={pi} className="text-pretty text-[15.5px] leading-[1.75] text-muted">
                      {l(paragraph)}
                    </p>
                  ))}
                </div>
                {i === 0 ? (
                  <blockquote className="mt-8 border-l-[3px] border-accent pl-5">
                    <p className="h-display text-[clamp(1.2rem,2.6vw,1.7rem)] text-fg">{l(post.pullquote)}</p>
                  </blockquote>
                ) : null}
              </Reveal>
            ))}
          </div>

          {related.length ? (
            <div className="mt-16 border-t border-line pt-8">
              <h2 className="eyebrow">{t('blog.related')}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {related.map((item) => (
                  <Link
                    key={item.slug}
                    to={'/blog/' + item.slug}
                    className="group rounded-2xl border border-line bg-surface/60 p-5 transition-all hover:-translate-y-1 hover:border-accent/35"
                  >
                    <span className="block text-[14.5px] font-bold leading-snug tracking-[-0.01em] text-fg transition-colors group-hover:text-accent">
                      {l(item.title)}
                    </span>
                    <span className="mt-2 line-clamp-2 block text-[12.5px] leading-snug text-muted">{l(item.excerpt)}</span>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent">
                      {t('blog.readMore')} <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </article>

      <CTASection />
    </>
  )
}
