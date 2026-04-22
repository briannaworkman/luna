import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'cyan' | 'success' | 'warning' | 'danger'
  className?: string
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-luna-base-3 text-luna-fg-2',
  cyan:    'bg-luna-base-3 text-luna-cyan',
  success: 'bg-luna-base-3 text-luna-success',
  warning: 'bg-luna-base-3 text-luna-warning',
  danger:  'bg-luna-base-3 text-luna-danger',
}

export function Badge({ children, variant = 'cyan', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center h-5 px-1.5 rounded-xs',
        'font-mono text-[10px] tracking-[0.08em] font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
