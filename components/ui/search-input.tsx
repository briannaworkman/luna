'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface SearchInputProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  onClear?: () => void
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded border border-luna-hairline px-3',
          className,
        )}
        style={{ background: 'var(--luna-base-3)' }}
      >
        <Search size={14} strokeWidth={1.5} className="text-luna-fg-4 shrink-0" />
        <Input
          ref={ref}
          type="text"
          value={value}
          className="flex-1 border-0 bg-transparent p-0 shadow-none font-mono text-[12px] tracking-[0.02em] text-luna-fg placeholder:text-luna-fg-4 focus-visible:ring-0 h-auto py-2.5"
          {...props}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-luna-fg-4 hover:text-luna-fg transition-colors shrink-0"
            aria-label="Clear search"
          >
            <X size={12} strokeWidth={1.5} />
          </button>
        )}
      </div>
    )
  },
)
SearchInput.displayName = 'SearchInput'

export { SearchInput }
