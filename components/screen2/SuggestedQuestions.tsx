interface SuggestedQuestionsProps {
  questions: string[]
  onSelect: (question: string) => void
}

export function SuggestedQuestions({ questions, onSelect }: SuggestedQuestionsProps) {
  if (questions.length === 0) return null

  return (
    <section aria-label="Not sure where to start?" className="flex flex-col gap-3 mt-8">
      <div className="font-mono text-[11px] tracking-[0.04em] text-luna-fg-4">
        Not sure where to start? Try one of these...
      </div>
      <div className="flex flex-col gap-2 w-full">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => onSelect(question)}
            className={[
              'w-full text-left px-4 py-3 rounded-md',
              'bg-transparent border border-luna-hairline',
              'font-sans text-[13px] leading-[1.55] text-luna-fg-2',
              'hover:border-luna-fg-3 hover:text-luna-fg hover:bg-luna-base-1',
              'transition-colors duration-[120ms] ease-out',
              'cursor-pointer',
            ].join(' ')}
          >
            {question}
          </button>
        ))}
      </div>
    </section>
  )
}
