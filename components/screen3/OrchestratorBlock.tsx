import { Eyebrow } from '@/components/ui/eyebrow'

interface OrchestratorBlockProps {
  text: string
  isDone: boolean
}

export function OrchestratorBlock({ text, isDone }: OrchestratorBlockProps) {
  return (
    <div className="bg-luna-base-1 border border-luna-hairline rounded-md px-5 py-4">
      <Eyebrow className="text-luna-fg-4">
        Orchestrator
      </Eyebrow>
      <div className="font-mono text-[13px] text-luna-fg-2 leading-[1.7] whitespace-pre-wrap mt-2">
        {text === '' ? (
          <span className="text-luna-fg-4 italic">Deciding which agents to activate…</span>
        ) : (
          text
        )}
      </div>
      {isDone && (
        <div className="mt-2 font-mono text-[11px] text-luna-fg-4">
          <span className="mx-1">·</span>
          complete
        </div>
      )}
    </div>
  )
}
