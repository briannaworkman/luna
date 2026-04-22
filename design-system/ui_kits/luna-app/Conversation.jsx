// Conversation.jsx — central stream (user prompts, agent handoffs, synthesised answer).

const TurnUser = ({ text }) => (
  <div className="luna-turn luna-turn--user">
    <div className="luna-turn__head">
      <Eyebrow>you · 04:11:58</Eyebrow>
    </div>
    <div className="luna-turn__user-body">{text}</div>
  </div>
);

const AgentLine = ({ time, agent, status, children }) => (
  <div className={`luna-agent-line luna-agent-line--${status}`}>
    <span className="luna-agent-line__t">{time}</span>
    <span className="luna-agent-line__mark">{status === "active" ? "◉" : status === "done" ? "✓" : "○"}</span>
    <span className="luna-agent-line__body">
      <span className="luna-agent-line__who">{agent}</span>
      <span className="luna-agent-line__arrow">→</span>
      {children}
    </span>
  </div>
);

const Citation = ({ n, label, meta, onOpen }) => (
  <button className="luna-cite" onClick={onOpen}>
    <span className="luna-cite__n">{n}</span>
    <span className="luna-cite__label">{label}</span>
    <span className="luna-cite__meta">{meta}</span>
    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7M7 7h10v10"/>
    </svg>
  </button>
);

const TurnAssistant = ({ stream, answer, citations, onOpenCitation }) => (
  <div className="luna-turn luna-turn--assistant">
    <div className="luna-turn__head">
      <Eyebrow tone="cyan">LUNA · synthesised</Eyebrow>
      <span className="luna-turn__spark">5 agents · 3 sources</span>
    </div>
    <div className="luna-stream">
      {stream.map((l, i) => (
        <AgentLine key={i} time={l.t} agent={l.agent} status={l.status}>
          {l.text}
        </AgentLine>
      ))}
    </div>
    <div className="luna-answer">
      {answer}
    </div>
    {citations?.length > 0 && (
      <div className="luna-citations">
        {citations.map((c, i) => <Citation key={i} n={i+1} label={c.label} meta={c.meta} onOpen={() => onOpenCitation(c)} />)}
      </div>
    )}
  </div>
);

const EmptyState = () => (
  <div className="luna-empty">
    <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity="0.35">
      <circle cx="24" cy="24" r="18"/>
      <path d="M24 6a18 18 0 1 0 0 36 12 12 0 0 1 0-36Z" fill="currentColor" opacity="0.4"/>
    </svg>
    <h2 className="luna-empty__title">Ask LUNA anything about the Moon.</h2>
    <p className="luna-empty__lead">Twelve specialist agents are standing by. Start with a coordinate, a mission, or a question — LUNA will route, cross-check, and cite.</p>
    <div className="luna-empty__suggestions">
      <span className="luna-mono-label">try</span>
      <button className="luna-suggest">What's the regolith temperature at Mare Tranquillitatis at lunar noon?</button>
      <button className="luna-suggest">Compare Apollo 11 and Chang'e 5 landing-site mineralogy.</button>
      <button className="luna-suggest">Show me permanently shadowed craters near the south pole.</button>
    </div>
  </div>
);

Object.assign(window, { TurnUser, TurnAssistant, AgentLine, Citation, EmptyState });
