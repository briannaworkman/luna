import { cn } from '@/lib/utils'

// Small mono-caps label used throughout Luna's chrome (section headers, data labels).
// Equivalent to the design system's `.eyebrow` class.
export function Eyebrow({
  children,
  className,
  as: Component = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'span' | 'p'
}) {
  return (
    <Component
      className={cn(
        'font-mono text-[11px] tracking-[0.14em] uppercase',
        className,
      )}
    >
      {children}
    </Component>
  )
}
