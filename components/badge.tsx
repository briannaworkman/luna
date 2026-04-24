import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'cyan' | 'success' | 'warning' | 'danger'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-luna-base-3 text-luna-fg-2',
  cyan:    'bg-luna-base-3 text-luna-cyan',
  success: 'bg-luna-base-3 text-luna-success',
  warning: 'bg-luna-base-3 text-luna-warning',
  danger:  'bg-luna-base-3 text-luna-danger',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'cyan', className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center h-5 px-1.5 rounded-xs',
        'font-mono text-[10px] tracking-[0.08em] font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  ),
)
Badge.displayName = 'Badge'
