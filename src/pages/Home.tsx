import { Hero } from '@/components/home/Hero'
import { Stats } from '@/components/home/Stats'
import { Capabilities } from '@/components/home/Capabilities'
import { Workflow } from '@/components/home/Workflow'
import { Showcase } from '@/components/home/Showcase'
import { RealRuns } from '@/components/home/RealRuns'
import { WideResearch } from '@/components/home/WideResearch'
import { Automations } from '@/components/home/Automations'
import { Compare } from '@/components/home/Compare'
import { Integrations } from '@/components/home/Integrations'
import { Testimonials } from '@/components/home/Testimonials'
import { FAQ } from '@/components/home/FAQ'
import { CTASection } from '@/components/home/CTASection'
import { PricingTeaser } from '@/components/pricing/PricingTeaser'

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <Capabilities />
      <Workflow />
      <Showcase />
      <RealRuns />
      <WideResearch />
      <Automations />
      <Compare />
      <Integrations />
      <Testimonials />
      <PricingTeaser />
      <FAQ limit={6} />
      <CTASection />
    </>
  )
}
