'use client'
import { cn } from '@/lib/utils'

const TEMPLATES = [
  { label: 'Geology', text: 'What do we know about the geology of this region, and how does it compare to Apollo landing sites?' },
  { label: 'Landing suitability', text: 'How suitable is this location for a future Artemis landing, and what are the key constraints?' },
  { label: 'Mission history', text: 'What missions have visited or observed this region, and what did they find?' },
  { label: 'Naming story', text: 'Tell me the full story of how this location got its name and what it means for the Artemis program.' },
] as const

export function TemplateChips({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TEMPLATES.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={() => onSelect(t.text)}
          className={cn(
            'font-mono text-[12px] tracking-[0.02em] text-luna-fg-3',
            'bg-transparent border border-luna-hairline rounded-sm',
            'px-3 py-2',
            'transition-colors duration-[120ms]',
            'hover:border-luna-hairline-2 hover:text-luna-fg-2',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
