import { Badge } from '@/components/badge'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface ConfidenceBadgeProps {
  level: 'high' | 'medium' | 'low'
  className?: string
}

const LEVEL_VARIANT = {
  high: 'success',
  medium: 'warning',
  low: 'default',
} as const

const LEVEL_DESCRIPTIONS: Record<ConfidenceBadgeProps['level'], string> = {
  high: 'Backed by Apollo sample data within ~50 km of this location.',
  medium: 'Reasoned by analogy from a nearby Apollo station (more than 50 km, same terrain type).',
  low: 'General regional inference — no direct sample support.',
}

export function ConfidenceBadge({ level, className }: ConfidenceBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={LEVEL_VARIANT[level]} className={className}>
          {level}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-luna-fg">
          <span className="uppercase tracking-[0.08em]">{level}</span> confidence
        </div>
        <div className="text-luna-fg-3 mt-0.5">{LEVEL_DESCRIPTIONS[level]}</div>
      </TooltipContent>
    </Tooltip>
  )
}
