import { cn } from '@/lib/utils'

export function TopBar({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-10',
        'h-14 bg-luna-base border-b border-luna-hairline',
        'flex items-center justify-between px-7',
        className,
      )}
    >
      <div className="flex items-center gap-2.5 text-luna-fg font-sans font-medium text-[14px] tracking-[0.14em] uppercase">
        <span aria-hidden="true" className="relative inline-block w-[14px] h-[14px]">
          <span
            className="absolute inset-0 rounded-full bg-luna-fg"
            style={{
              WebkitMask: 'radial-gradient(circle at 70% 50%, transparent 55%, #000 56%)',
              mask: 'radial-gradient(circle at 70% 50%, transparent 55%, #000 56%)',
            }}
          />
        </span>
        LUNA
      </div>
    </header>
  )
}
