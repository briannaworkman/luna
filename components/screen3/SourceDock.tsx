import { CitationList } from '@/components/citations/CitationList'
import type { AgentStreamState } from '@/components/screen3/useAgentStream'
import { Eyebrow } from '@/components/ui/eyebrow'

interface SourceDockProps {
  citations: AgentStreamState['globalCitations']
  activatedAgentCount: number
}


export function SourceDock({ citations, activatedAgentCount }: SourceDockProps) {
  return (
    <aside className="w-[260px] shrink-0 flex flex-col h-full border-l border-luna-hairline bg-luna-base">
      <div className="px-4 pt-4 pb-2">
        <Eyebrow as="span" className="text-luna-fg-4">
          Sources
        </Eyebrow>
      </div>

      <div className="flex-1 overflow-y-auto">
        <CitationList citations={citations} />
      </div>

      <div className="shrink-0 px-4 py-3 border-t border-luna-hairline">
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-luna-fg-3">
          {citations.length} SOURCES · {activatedAgentCount} AGENTS
        </span>
      </div>
    </aside>
  )
}
