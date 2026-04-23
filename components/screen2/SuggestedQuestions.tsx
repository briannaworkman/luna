'use client'
import { ArrowRight } from 'lucide-react'

interface SuggestedQuestionsProps {
  locationName: string
  questions: string[]
  onSelect: (question: string) => void
}

export function SuggestedQuestions({ locationName, questions, onSelect }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null

  return (
    <div className="mt-6 pt-6 border-t border-luna-hairline">
      <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-3 mb-1">
        Suggested for {locationName}
      </div>
      <div className="flex flex-col">
        {questions.map((q, i) => (
          <button
            key={q}
            type="button"
            onClick={() => onSelect(q)}
            className="group h-9 w-full flex items-center gap-2.5 px-2 -mx-2 border-b border-luna-hairline last:border-b-0 text-left transition-colors duration-[120ms] hover:bg-luna-base-2"
          >
            <span aria-hidden="true" className="w-2 text-center font-mono text-[13px] leading-none text-luna-hairline-2">
              ·
            </span>
            <span className="flex-1 font-sans font-normal text-[13px] text-luna-fg-2 group-hover:text-luna-fg">
              {q}
            </span>
            <ArrowRight
              size={14}
              strokeWidth={1.5}
              className="text-luna-fg-4 group-hover:text-luna-cyan transition-colors"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  )
}
