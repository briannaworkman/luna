import { cn } from '@/lib/utils'

interface ConfidenceBadgeProps {
  level: 'high' | 'medium' | 'low'
  className?: string
}

export function ConfidenceBadge({ level, className }: ConfidenceBadgeProps) {
  return (
    <span
      className={cn(
        'font-mono text-[10px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-sm',
        level === 'high' && 'text-luna-success bg-luna-success/10',
        level === 'medium' && 'text-luna-warning bg-luna-warning/10',
        level === 'low' && 'text-luna-fg-3 bg-luna-base-3',
        className,
      )}
    >
      {level}
    </span>
  )
}
