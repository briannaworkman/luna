interface FollowUpChipsProps {
  questions: [string, string, string]
  onFollowUp: (question: string) => void
}

export function FollowUpChips({ questions, onFollowUp }: FollowUpChipsProps) {
  return (
    <section aria-label="Follow-up questions" className="flex flex-col gap-3 mt-8">
      <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-luna-fg-4">
        Follow-up questions
      </div>
      <div className="flex flex-col gap-2 w-full">
        {questions.map((question, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onFollowUp(question)}
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
