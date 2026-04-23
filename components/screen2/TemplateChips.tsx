'use client'
import { Button } from '@/components/ui/button'

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
        <Button
          key={t.label}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onSelect(t.text)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  )
}
