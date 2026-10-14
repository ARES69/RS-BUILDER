import {
  CalendarClock,
  Clapperboard,
  Compass,
  FileText,
  Gamepad2,
  GitBranch,
  Globe,
  Mail,
  Microscope,
  Network,
  Palette,
  Presentation,
  ShieldCheck,
  Sparkles,
  Table2,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { IconName } from '@/data/types'

const registry: Record<IconName, LucideIcon> = {
  globe: Globe,
  presentation: Presentation,
  microscope: Microscope,
  network: Network,
  gamepad: Gamepad2,
  clapperboard: Clapperboard,
  palette: Palette,
  compass: Compass,
  calendar: CalendarClock,
  table: Table2,
  fileText: FileText,
  gitBranch: GitBranch,
  bolt: Zap,
  shield: ShieldCheck,
  mail: Mail,
  sparkles: Sparkles,
}

export function Icon({
  name,
  className,
  size = 20,
  strokeWidth = 1.7,
}: {
  name: IconName
  className?: string
  size?: number
  strokeWidth?: number
}) {
  const Cmp = registry[name] ?? Sparkles
  return <Cmp className={className} size={size} strokeWidth={strokeWidth} aria-hidden="true" />
}
