import { Badge } from '@/components/badge'

interface ConfidenceBadgeProps {
  level: 'high' | 'medium' | 'low'
  className?: string
}

const LEVEL_VARIANT = {
  high: 'success',
  medium: 'warning',
  low: 'default',
} as const

export function ConfidenceBadge({ level, className }: ConfidenceBadgeProps) {
  return (
    <Badge variant={LEVEL_VARIANT[level]} className={className}>
      {level}
    </Badge>
  )
}
