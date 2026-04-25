import { Badge } from '@/components/badge'
import { cn } from '@/lib/utils'
import type { Finding } from '@/lib/types/brief'

interface BriefConfidenceBadgeProps {
  confidence: Finding['confidence']
  className?: string
}

const CONFIDENCE_VARIANT = {
  High:   'success',
  Medium: 'warning',
  Low:    'default',
} as const

export function BriefConfidenceBadge({ confidence, className }: BriefConfidenceBadgeProps) {
  return (
    <Badge
      variant={CONFIDENCE_VARIANT[confidence]}
      className={cn('shrink-0 whitespace-nowrap inline-flex uppercase', className)}
    >
      {confidence}
    </Badge>
  )
}
